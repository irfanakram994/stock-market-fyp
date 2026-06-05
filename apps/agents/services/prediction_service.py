"""
Prediction service.
Uses Facebook Prophet for time series forecasting.
"""

from datetime import timedelta
from typing import Dict, Any, List

import numpy as np
import pandas as pd
from prophet import Prophet

from config import Config
from utils.helpers import get_logger, create_response

logger = get_logger(__name__)


def _fallback_forecast(df: pd.DataFrame, forecast_days: int) -> List[Dict[str, Any]]:
    """
    Fallback forecasting using simple exponential smoothing + trend.
    Used when Prophet/CmdStan is unavailable.
    """
    logger.info("Using fallback exponential smoothing forecast")

    recent_data = df.tail(30)["y"].values
    current_price = df["y"].iloc[-1]

    if len(recent_data) > 1:
        trend = float(np.polyfit(range(len(recent_data)), recent_data, 1)[0])
    else:
        trend = 0

    forecasts = []
    last_ts = df["ds"].iloc[-1]

    for i in range(1, forecast_days + 1):
        forecast_price = current_price + (trend * i * 0.5)
        confidence = max(0.7 - (i * 0.01), 0.5)
        lower = forecast_price * 0.95
        upper = forecast_price * 1.05

        forecast_date = (last_ts + timedelta(days=i)).strftime("%Y-%m-%d")

        forecasts.append(
            {
                "date": forecast_date,
                "predictedPrice": round(forecast_price, 2),
                "lowerBound": round(lower, 2),
                "upperBound": round(upper, 2),
                "confidence": round(float(confidence), 3),
            }
        )

    return forecasts


def train_and_predict(
    data: List[Dict[str, Any]],
    forecast_days: int | None = None,
    include_sentiment: bool = True,
) -> Dict[str, Any]:
    """
    Train Prophet model and generate predictions.

    Args:
        data: Prophet-formatted data with 'ds' and 'y' columns
        forecast_days: Number of days to forecast
        include_sentiment: Whether to include sentiment as regressor

    Returns:
        Response dict with predictions
    """
    try:
        logger.info("Training Prophet model")

        forecast_days = forecast_days or Config.PROPHET_FORECAST_DAYS
        df = pd.DataFrame(data)

        if df.empty:
            return create_response(False, error="Data is empty")

        df["ds"] = pd.to_datetime(df["ds"])

        prophet_failed = False
        model = None
        try:
            try:
                model = Prophet(
                    changepoint_prior_scale=Config.PROPHET_CHANGEPOINT_PRIOR,
                    seasonality_mode=Config.PROPHET_SEASONALITY_MODE,
                    daily_seasonality=False,
                    weekly_seasonality=True,
                    yearly_seasonality=True,
                    stan_backend="CMDSTANPY",
                )
            except TypeError:
                model = Prophet(
                    changepoint_prior_scale=Config.PROPHET_CHANGEPOINT_PRIOR,
                    seasonality_mode=Config.PROPHET_SEASONALITY_MODE,
                    daily_seasonality=False,
                    weekly_seasonality=True,
                    yearly_seasonality=True,
                )

            if model is not None and not hasattr(model, "stan_backend"):
                try:
                    model.stan_backend = "CMDSTANPY"
                except Exception:
                    pass

            if include_sentiment and "sentiment" in df.columns:
                model.add_regressor("sentiment")
                logger.info("Added sentiment as regressor")

            model.fit(df)
        except Exception as e:
            err_msg = str(e).lower()
            if "cmdstan" in err_msg or "make" in err_msg or "mingw" in err_msg or "build" in err_msg:
                logger.warning(f"CmdStan not available, using fallback forecast: {err_msg}")
                prophet_failed = True
            else:
                raise

        if prophet_failed or model is None:
            fallback_predictions = _fallback_forecast(df, forecast_days)

            current_price = df["y"].iloc[-1]
            last_pred_price = fallback_predictions[-1]["predictedPrice"]

            if last_pred_price > current_price * 1.02:
                trend = "bullish"
            elif last_pred_price < current_price * 0.98:
                trend = "bearish"
            else:
                trend = "neutral"

            return create_response(
                True,
                data={
                    "predictions": fallback_predictions,
                    "trend": trend,
                },
            )

        future = model.make_future_dataframe(periods=forecast_days)

        if include_sentiment and "sentiment" in df.columns:
            last_sentiment = df["sentiment"].iloc[-1]
            future["sentiment"] = last_sentiment

        forecast = model.predict(future)

        predictions = []
        last_date = df["ds"].max()
        future_forecast = forecast[forecast["ds"] > last_date]

        for _, row in future_forecast.iterrows():
            pred_date = row["ds"]
            pred_price = max(row["yhat"], 0)
            lower_bound = max(row["yhat_lower"], 0)
            upper_bound = max(row["yhat_upper"], 0)

            interval_width = upper_bound - lower_bound
            confidence = 1 / (1 + interval_width / pred_price) if pred_price > 0 else 0.5

            predictions.append(
                {
                    "date": pred_date.strftime("%Y-%m-%d"),
                    "predictedPrice": round(pred_price, 2),
                    "lowerBound": round(lower_bound, 2),
                    "upperBound": round(upper_bound, 2),
                    "confidence": round(confidence, 3),
                }
            )

        current_price = df["y"].iloc[-1]
        last_pred = predictions[-1]["predictedPrice"]

        if last_pred > current_price * 1.02:
            trend = "bullish"
        elif last_pred < current_price * 0.98:
            trend = "bearish"
        else:
            trend = "neutral"

        logger.info(f"Generated {len(predictions)} predictions, trend: {trend}")

        historical = []
        for _, row in forecast[forecast["ds"] <= last_date].tail(30).iterrows():
            actual_match = df[df["ds"] == row["ds"]]
            historical.append(
                {
                    "date": row["ds"].strftime("%Y-%m-%d"),
                    "actual": round(actual_match["y"].iloc[0], 2) if len(actual_match) > 0 else None,
                    "predicted": round(row["yhat"], 2),
                    "lowerBound": round(row["yhat_lower"], 2),
                    "upperBound": round(row["yhat_upper"], 2),
                }
            )

        return create_response(
            True,
            data={
                "predictions": predictions,
                "historical": historical,
                "trend": trend,
                "currentPrice": round(current_price, 2),
                "forecastDays": forecast_days,
                "modelVersion": "prophet-v1",
            },
        )
    except Exception as e:
        logger.error(f"Error in prediction: {str(e)}")
        return create_response(False, error=str(e))
