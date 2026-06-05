from dataclasses import dataclass
from typing import Any, Dict, Optional


@dataclass
class WorkflowState:
    symbol: str
    forecast_days: int
    allow_sentiment_fallback: bool = True
    market_result: Optional[Dict[str, Any]] = None
    news_result: Optional[Dict[str, Any]] = None
    sentiment_result: Optional[Dict[str, Any]] = None
    merged_result: Optional[Dict[str, Any]] = None
    prophet_result: Optional[Dict[str, Any]] = None
    prediction_result: Optional[Dict[str, Any]] = None
    llm_result: Optional[Dict[str, Any]] = None
    report_result: Optional[Dict[str, Any]] = None
    current_price: Optional[float] = None
    sentiment_score: float = 0.0
