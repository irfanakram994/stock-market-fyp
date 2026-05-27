"""
Preprocessing service.
Merges sentiment data with market data and prepares for prediction.
"""

from typing import Dict, Any, List

import pandas as pd

from utils.helpers import get_logger, create_response, clean_dataframe

logger = get_logger(__name__)


def merge_data(
    market_data: List[Dict[str, Any]],
    sentiment_data: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Merge market data with sentiment data.

    Args:
        market_data: List of OHLCV records with Date
        sentiment_data: List of sentiment records with publishedAt and sentiment

    Returns:
        Response dict with merged dataframe
    """
    try:
        logger.info("Merging market and sentiment data")

        df_market = pd.DataFrame(market_data)
        df_sentiment = pd.DataFrame(sentiment_data)

        if df_market.empty:
            return create_response(False, error="Market data is empty")

        df_market["Date"] = pd.to_datetime(df_market["Date"])
        df_market["Date"] = df_market["Date"].dt.date

        if not df_sentiment.empty and "publishedAt" in df_sentiment.columns:
            df_sentiment["publishedAt"] = pd.to_datetime(df_sentiment["publishedAt"])
            df_sentiment["Date"] = df_sentiment["publishedAt"].dt.date

            if "sentiment" in df_sentiment.columns:
                df_sentiment["sentiment_score"] = df_sentiment["sentiment"].apply(
                    lambda x: x.get("score", 0) if isinstance(x, dict) else 0
                )

            sentiment_agg = (
                df_sentiment.groupby("Date")
                .agg({"sentiment_score": "mean"})
                .reset_index()
            )

            df_merged = df_market.merge(sentiment_agg, on="Date", how="left")
            df_merged["sentiment_score"] = df_merged["sentiment_score"].fillna(0)
        else:
            df_merged = df_market.copy()
            df_merged["sentiment_score"] = 0

        df_merged = clean_dataframe(df_merged)
        df_merged = df_merged.sort_values("Date")

        logger.info(f"Merged data: {len(df_merged)} rows")

        df_merged["Date"] = df_merged["Date"].astype(str)
        records = df_merged.to_dict("records")

        return create_response(
            True,
            data={
                "merged_data": records,
                "count": len(records),
                "columns": list(df_merged.columns),
            },
        )
    except Exception as e:
        logger.error(f"Error merging data: {str(e)}")
        return create_response(False, error=str(e))


def prepare_for_prophet(data: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Prepare data for Prophet forecasting.

    Args:
        data: Merged data records

    Returns:
        Response dict with Prophet-formatted data
    """
    try:
        logger.info("Preparing data for Prophet")

        df = pd.DataFrame(data)

        if df.empty:
            return create_response(False, error="Data is empty")

        prophet_df = pd.DataFrame(
            {
                "ds": pd.to_datetime(df["Date"]),
                "y": df["Close"],
            }
        )

        if "sentiment_score" in df.columns:
            prophet_df["sentiment"] = df["sentiment_score"]

        prophet_df = clean_dataframe(prophet_df)
        prophet_df = prophet_df[prophet_df["y"] > 0]

        logger.info(f"Prepared {len(prophet_df)} rows for Prophet")

        prophet_df["ds"] = prophet_df["ds"].astype(str)
        records = prophet_df.to_dict("records")

        return create_response(
            True,
            data={
                "prophet_data": records,
                "count": len(records),
                "has_sentiment": "sentiment" in prophet_df.columns,
            },
        )
    except Exception as e:
        logger.error(f"Error preparing data: {str(e)}")
        return create_response(False, error=str(e))
