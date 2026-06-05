"""
Service layer for TradeFlux agent workflow.
Encapsulates external integrations and deterministic processing logic.
"""

from .news_service import fetch_news
from .market_data_service import fetch_historical_data
from .insight_service import analyze_news
from .preprocessing_service import merge_data, prepare_for_prophet
from .prediction_service import train_and_predict
from .llm_service import generate_insight
from .report_service import generate_summary_report

__all__ = [
    "fetch_news",
    "fetch_historical_data",
    "analyze_news",
    "merge_data",
    "prepare_for_prophet",
    "train_and_predict",
    "generate_insight",
    "generate_summary_report",
]
