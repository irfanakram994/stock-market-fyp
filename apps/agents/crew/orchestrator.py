from __future__ import annotations

from typing import Dict, Any, Callable, List

from crewai import Crew, Process

from utils.helpers import get_logger
from .agents import build_agents
from .llm import build_llm
from .state import WorkflowState
from .tasks import build_full_tasks, build_news_tasks, build_market_tasks, build_sentiment_tasks
from .tools import build_toolset

logger = get_logger(__name__)


class CrewAIOrchestrator:
    """
    CrewAI orchestrator for TradeFlux prediction workflow.
    """

    def __init__(self, symbol: str, forecast_days: int = 30):
        self.state = WorkflowState(symbol=symbol, forecast_days=forecast_days)

    def _run(self, task_builder: Callable[[Dict[str, object], Dict[str, object]], List]) -> None:
        llm = build_llm()
        toolset = build_toolset(self.state)
        agents = build_agents(toolset, llm)
        tasks = task_builder(agents, toolset)

        # Use the LLM for regular messages but avoid provider-side function-calling
        # to prevent strict JSON Schema validation errors from external providers
        # (some providers reject empty/object schemas). Passing None for
        # `function_calling_llm` keeps tools local to the Crew runtime.
        crew = Crew(
            agents=list(agents.values()),
            tasks=tasks,
            process=Process.sequential,
            verbose=False,
            function_calling_llm=None,
            planning=False,
        )
        crew.kickoff(inputs={"symbol": self.state.symbol, "forecast_days": self.state.forecast_days})

    def run_full_prediction(self) -> Dict[str, Any]:
        try:
            self._run(build_full_tasks)

            if not self.state.market_result or not self.state.market_result.get("success"):
                return self.state.market_result or {"success": False, "error": "Market data failed"}

            if not self.state.prediction_result or not self.state.prediction_result.get("success"):
                return self.state.prediction_result or {"success": False, "error": "Prediction failed"}

            market_data = self.state.market_result.get("data", {}).get("data", [])
            current_price = self.state.current_price
            if current_price is None and market_data:
                current_price = market_data[-1].get("Close")
            if current_price is None:
                current_price = self.state.prediction_result.get("data", {}).get("currentPrice")

            predictions = self.state.prediction_result.get("data", {}).get("predictions", [])
            trend = self.state.prediction_result.get("data", {}).get("trend", "neutral")
            insight = "Insight generation failed"
            if self.state.llm_result and self.state.llm_result.get("success"):
                insight = self.state.llm_result.get("data", {}).get("insight", insight)

            report_path = None
            if self.state.report_result and self.state.report_result.get("success"):
                report_path = self.state.report_result.get("data", {}).get("filepath")

            return {
                "success": True,
                "data": {
                    "symbol": self.state.symbol,
                    "currentPrice": current_price,
                    "predictions": predictions,
                    "trend": trend,
                    "insight": insight,
                    "sentimentScore": self.state.sentiment_score,
                    "reportPath": report_path,
                    "framework": "crewai",
                },
            }
        except Exception as e:
            logger.error(f"CrewAI workflow error: {str(e)}")
            return {"success": False, "error": str(e)}

    def run_news(self) -> Dict[str, Any]:
        try:
            self._run(build_news_tasks)
            return self.state.news_result or {"success": False, "error": "News fetch failed"}
        except Exception as e:
            logger.error(f"CrewAI news error: {str(e)}")
            return {"success": False, "error": str(e)}

    def run_market(self) -> Dict[str, Any]:
        try:
            self._run(build_market_tasks)
            return self.state.market_result or {"success": False, "error": "Market fetch failed"}
        except Exception as e:
            logger.error(f"CrewAI market error: {str(e)}")
            return {"success": False, "error": str(e)}

    def run_sentiment(self) -> Dict[str, Any]:
        try:
            self.state.allow_sentiment_fallback = False
            self._run(build_sentiment_tasks)
            return self.state.sentiment_result or {"success": False, "error": "Sentiment failed"}
        except Exception as e:
            logger.error(f"CrewAI sentiment error: {str(e)}")
            return {"success": False, "error": str(e)}
