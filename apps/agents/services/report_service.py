"""
Report service.
Generates JSON reports from prediction results.
"""

from datetime import datetime
from typing import Dict, Any, List
import json
import os

from config import Config
from utils.helpers import get_logger, create_response

logger = get_logger(__name__)


def generate_json_report(
    symbol: str,
    data: Dict[str, Any],
    filename: str | None = None,
) -> Dict[str, Any]:
    """
    Generate JSON report.
    """
    try:
        logger.info(f"Generating JSON report for {symbol}")

        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"{symbol}_report_{timestamp}.json"

        filepath = os.path.join(Config.REPORTS_DIR, filename)

        report = {
            "symbol": symbol,
            "generatedAt": datetime.now().isoformat(),
            "reportType": "prediction",
            "data": data,
        }

        with open(filepath, "w") as f:
            json.dump(report, f, indent=2)

        logger.info(f"JSON report saved to {filepath}")

        return create_response(
            True,
            data={
                "filepath": filepath,
                "filename": filename,
                "format": "json",
            },
        )
    except Exception as e:
        logger.error(f"Error generating JSON report: {str(e)}")
        return create_response(False, error=str(e))


def generate_summary_report(
    symbol: str,
    current_price: float,
    predictions: List[Dict[str, Any]],
    trend: str,
    insight: str,
    sentiment: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    """
    Generate comprehensive summary report.
    """
    try:
        logger.info(f"Generating summary report for {symbol}")

        if not predictions:
            return create_response(False, error="No predictions provided")

        first_pred = predictions[0]
        last_pred = predictions[-1]

        price_change = last_pred["predictedPrice"] - current_price
        price_change_pct = (price_change / current_price) * 100

        avg_confidence = sum(p["confidence"] for p in predictions) / len(predictions)

        report = {
            "symbol": symbol,
            "generatedAt": datetime.now().isoformat(),
            "currentPrice": current_price,
            "prediction": {
                "trend": trend,
                "forecastDays": len(predictions),
                "firstDayPrice": first_pred["predictedPrice"],
                "lastDayPrice": last_pred["predictedPrice"],
                "expectedChange": round(price_change, 2),
                "expectedChangePct": round(price_change_pct, 2),
                "averageConfidence": round(avg_confidence, 3),
            },
            "insight": insight,
            "predictions": predictions,
        }

        if sentiment:
            report["sentiment"] = sentiment

        return generate_json_report(symbol, report)
    except Exception as e:
        logger.error(f"Error generating summary report: {str(e)}")
        return create_response(False, error=str(e))
