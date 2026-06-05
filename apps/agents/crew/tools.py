from __future__ import annotations

from typing import Dict, Any, Type
import copy

from pydantic import BaseModel, PrivateAttr
from crewai.tools import BaseTool

from services import (
    fetch_news,
    fetch_historical_data,
    analyze_news,
    merge_data,
    prepare_for_prophet,
    train_and_predict,
    generate_insight,
    generate_summary_report,
)
from utils.helpers import get_logger, create_response, to_json
from .state import WorkflowState

logger = get_logger(__name__)


class EmptyArgs(BaseModel):
    """Empty args schema for tools that rely on shared workflow state.

    Ensure the JSON schema explicitly contains an empty `properties` dict
    so function-calling LLM providers (Groq) do not reject the schema when
    `required` is present.
    """
    model_config = {"json_schema_extra": {"properties": {}}}


def _neutral_sentiment() -> Dict[str, Any]:
    return {
        "compound": 0.0,
        "positive": 0.0,
        "negative": 0.0,
        "neutral": 1.0,
        "label": "neutral",
        "score": 0.0,
        "count": 0,
    }


class _StateTool(BaseTool):
    _state: WorkflowState = PrivateAttr()

    def __init__(self, state: WorkflowState, **data: Any):
        super().__init__(**data)
        self._state = state


class FetchMarketDataTool(_StateTool):
    name: str = "fetch_market_data"
    description: str = "Fetch historical market data with indicators for the current symbol."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        result = fetch_historical_data(self._state.symbol)
        # Keep the full market result in workflow state for internal processing,
        # but return a truncated version to the LLM/tool consumer to avoid
        # sending large datasets which can exceed provider token limits.
        self._state.market_result = result
        if not result.get("success"):
            raise RuntimeError(result.get("error", "Market data fetch failed"))

        try:
            market_data = result["data"]["data"]
            if market_data:
                self._state.current_price = market_data[-1].get("Close")
        except Exception:
            self._state.current_price = None

        # Create a compact summary payload for the LLM to avoid large requests.
        public_result = {
            "success": result.get("success", False),
            "timestamp": result.get("timestamp"),
            "data": {},
        }
        try:
            data_list = result.get("data", {}).get("data", [])
            original_count = len(data_list)
            sample = data_list[-5:] if original_count > 0 else []
            first_date = sample[0]["Date"] if sample else None
            last_date = sample[-1]["Date"] if sample else None
            public_result["data"]["summary"] = {
                "count": original_count,
                "current_price": self._state.current_price,
                "sample_count": len(sample),
                "first_sample_date": first_date,
                "last_sample_date": last_date,
            }
            public_result["data"]["sample"] = sample
            public_result["data"]["truncated"] = True if original_count > len(sample) else False
        except Exception:
            public_result["data"]["summary"] = {}
            public_result["data"]["truncated"] = False

        return to_json(public_result)


class FetchNewsTool(_StateTool):
    name: str = "fetch_news"
    description: str = "Fetch recent news articles for the current symbol."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        result = fetch_news(self._state.symbol)
        # Keep full news in state but return a truncated list to the LLM
        self._state.news_result = result
        public_result = copy.deepcopy(result)
        try:
            articles = public_result.get("data", {}).get("articles", [])
            original_count = len(articles)
            max_articles = 5
            if original_count > max_articles:
                public_result["data"]["articles"] = articles[:max_articles]
                public_result["data"]["truncated"] = True
                public_result["data"]["original_count"] = original_count
            else:
                public_result["data"]["truncated"] = False
        except Exception:
            public_result["data"]["truncated"] = False

        return to_json(public_result)


class AnalyzeSentimentTool(_StateTool):
    name: str = "analyze_sentiment"
    description: str = "Analyze sentiment for fetched news articles."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        news_result = self._state.news_result or {}
        if not news_result.get("success"):
            if not self._state.allow_sentiment_fallback:
                result = create_response(False, error=news_result.get("error", "News fetch failed"))
                self._state.sentiment_result = result
                return to_json(result)
            logger.warning("News fetch failed, using neutral sentiment.")

        articles = news_result.get("data", {}).get("articles", []) if news_result.get("success") else []
        if not articles:
            if not self._state.allow_sentiment_fallback:
                result = create_response(False, error="No articles provided")
                self._state.sentiment_result = result
                return to_json(result)
            result = create_response(
                True,
                data={
                    "articles": [],
                    "aggregated": _neutral_sentiment(),
                    "count": 0,
                },
            )
            self._state.sentiment_result = result
            self._state.sentiment_score = 0.0
            return to_json(result)

        result = analyze_news(articles)
        if not result.get("success"):
            if not self._state.allow_sentiment_fallback:
                self._state.sentiment_result = result
                return to_json(result)
            result = create_response(
                True,
                data={
                    "articles": [],
                    "aggregated": _neutral_sentiment(),
                    "count": 0,
                },
            )
        self._state.sentiment_result = result
        self._state.sentiment_score = result.get("data", {}).get("aggregated", {}).get("score", 0.0)
        return to_json(result)


class MergeDataTool(_StateTool):
    name: str = "merge_market_and_sentiment"
    description: str = "Merge market data with sentiment data for prediction."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        market_result = self._state.market_result or {}
        if not market_result.get("success"):
            raise RuntimeError(market_result.get("error", "Market data missing"))

        market_data = market_result.get("data", {}).get("data", [])
        sentiment_articles = []
        if self._state.sentiment_result and self._state.sentiment_result.get("success"):
            sentiment_articles = self._state.sentiment_result.get("data", {}).get("articles", [])

        result = merge_data(market_data, sentiment_articles)
        # Keep full merged result in state, but return a truncated payload to LLM
        self._state.merged_result = result
        if not result.get("success"):
            raise RuntimeError(result.get("error", "Merge failed"))

        public_result = {
            "success": result.get("success", False),
            "timestamp": result.get("timestamp"),
            "data": {},
        }
        try:
            merged = result.get("data", {}).get("merged_data", [])
            original_count = len(merged)
            sample = merged[-5:] if original_count > 0 else []
            public_result["data"]["summary"] = {
                "count": original_count,
                "sample_count": len(sample),
            }
            public_result["data"]["sample"] = sample
            public_result["data"]["truncated"] = True if original_count > len(sample) else False
        except Exception:
            public_result["data"]["summary"] = {}
            public_result["data"]["truncated"] = False

        return to_json(public_result)


class PrepareProphetTool(_StateTool):
    name: str = "prepare_prophet_data"
    description: str = "Prepare merged data for Prophet forecasting."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        merged_result = self._state.merged_result or {}
        if not merged_result.get("success"):
            raise RuntimeError(merged_result.get("error", "Merged data missing"))

        merged_data = merged_result.get("data", {}).get("merged_data", [])
        result = prepare_for_prophet(merged_data)
        # Keep full prophet result in state but return truncated prophet_data to LLM
        self._state.prophet_result = result
        if not result.get("success"):
            raise RuntimeError(result.get("error", "Prophet preparation failed"))

        public_result = {
            "success": result.get("success", False),
            "timestamp": result.get("timestamp"),
            "data": {},
        }
        try:
            prophet_data = result.get("data", {}).get("prophet_data", [])
            original_count = len(prophet_data)
            sample = prophet_data[-5:] if original_count > 0 else []
            public_result["data"]["summary"] = {
                "count": original_count,
                "sample_count": len(sample),
            }
            public_result["data"]["sample"] = sample
            public_result["data"]["truncated"] = True if original_count > len(sample) else False
        except Exception:
            public_result["data"]["summary"] = {}
            public_result["data"]["truncated"] = False

        return to_json(public_result)


class PredictTool(_StateTool):
    name: str = "run_prediction"
    description: str = "Generate predictions using Prophet or fallback forecasting."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        prophet_result = self._state.prophet_result or {}
        if not prophet_result.get("success"):
            raise RuntimeError(prophet_result.get("error", "Prophet data missing"))

        prophet_data = prophet_result.get("data", {}).get("prophet_data", [])
        result = train_and_predict(prophet_data, forecast_days=self._state.forecast_days)
        self._state.prediction_result = result
        if not result.get("success"):
            raise RuntimeError(result.get("error", "Prediction failed"))
        return to_json(result)


class GenerateInsightTool(_StateTool):
    name: str = "generate_llm_insight"
    description: str = "Generate LLM insight for the prediction results."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        prediction_result = self._state.prediction_result or {}
        if not prediction_result.get("success"):
            raise RuntimeError(prediction_result.get("error", "Prediction results missing"))

        predictions = prediction_result.get("data", {}).get("predictions", [])
        trend = prediction_result.get("data", {}).get("trend", "neutral")
        current_price = self._state.current_price

        if current_price is None:
            current_price = prediction_result.get("data", {}).get("currentPrice", 0)

        result = generate_insight(
            self._state.symbol,
            current_price,
            predictions,
            trend,
            self._state.sentiment_score,
        )
        if not result.get("success"):
            logger.warning("LLM insight failed, using fallback insight message")
            result = create_response(True, data={"insight": "Insight generation failed", "method": "fallback"})

        self._state.llm_result = result
        return to_json(result)


class GenerateReportTool(_StateTool):
    name: str = "generate_report"
    description: str = "Generate summary report for predictions."
    args_schema: Type[BaseModel] = EmptyArgs

    def _run(self) -> str:
        prediction_result = self._state.prediction_result or {}
        if not prediction_result.get("success"):
            raise RuntimeError(prediction_result.get("error", "Prediction results missing"))

        predictions = prediction_result.get("data", {}).get("predictions", [])
        trend = prediction_result.get("data", {}).get("trend", "neutral")

        current_price = self._state.current_price
        if current_price is None:
            current_price = prediction_result.get("data", {}).get("currentPrice", 0)

        insight = self._state.llm_result.get("data", {}).get("insight") if self._state.llm_result else "Insight generation failed"

        sentiment_payload = None
        if self._state.sentiment_result and self._state.sentiment_result.get("success"):
            sentiment_payload = {"score": self._state.sentiment_score}

        result = generate_summary_report(
            self._state.symbol,
            current_price,
            predictions,
            trend,
            insight,
            sentiment_payload,
        )
        self._state.report_result = result
        return to_json(result)


def build_toolset(state: WorkflowState) -> Dict[str, BaseTool]:
    return {
        "market": FetchMarketDataTool(state),
        "news": FetchNewsTool(state),
        "sentiment": AnalyzeSentimentTool(state),
        "merge": MergeDataTool(state),
        "prophet": PrepareProphetTool(state),
        "predict": PredictTool(state),
        "insight": GenerateInsightTool(state),
        "report": GenerateReportTool(state),
    }
