"""
Market data service.
Fetches historical OHLCV data using yfinance and adds technical indicators.
"""

from datetime import datetime, timedelta
from typing import Dict, Any, List
import time

import numpy as np
import pandas as pd
import yfinance as yf

from config import Config
from utils.helpers import get_logger, create_response, clean_dataframe
from utils.indicators import TechnicalIndicators

logger = get_logger(__name__)

# Period string to approximate number of days (explicit start/end avoids timezone request issues)
PERIOD_DAYS = {
    "1d": 1,
    "5d": 5,
    "1mo": 31,
    "3mo": 92,
    "6mo": 183,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
    "10y": 3650,
    "ytd": 366,
    "max": 3650,
}


def _period_to_start_end(
    period: str,
    interval: str,
    start_date: str | None = None,
    end_date: str | None = None,
) -> tuple[datetime, datetime]:
    """Return (start_dt, end_dt) for yfinance."""
    end_dt = datetime.now()
    if start_date and end_date:
        try:
            start_dt = datetime.strptime(start_date[:10], "%Y-%m-%d")
            # yfinance treats end as exclusive; UI/API date ranges are inclusive.
            end_dt = datetime.strptime(end_date[:10], "%Y-%m-%d") + timedelta(days=1)
            return start_dt, end_dt
        except ValueError:
            pass
    days = PERIOD_DAYS.get(period, 365)
    if period == "ytd":
        start_dt = end_dt.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        start_dt = end_dt - timedelta(days=days)
    return start_dt, end_dt


def _to_json_serializable(obj: Any) -> Any:
    """Convert numpy/pandas types to native Python for JSON serialization."""
    if isinstance(obj, (np.integer, np.int64, np.int32)):
        return int(obj)
    if isinstance(obj, (np.floating, np.float64, np.float32)):
        return float(obj) if np.isfinite(obj) else 0.0
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, dict):
        return {k: _to_json_serializable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_to_json_serializable(v) for v in obj]
    return obj


def _normalize_yfinance_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Normalize yfinance DataFrame so it has consistent column names (Date, Open, High, Low, Close, Volume).
    Handles MultiIndex/tuple column names from yfinance 1.2+.
    """
    df = df.copy()
    if isinstance(df.columns, pd.MultiIndex):
        best = df.columns.get_level_values(-1)
        for lev in range(df.columns.nlevels):
            vals = df.columns.get_level_values(lev)
            uniq = set(str(v) for v in vals)
            if ("Close" in uniq or "Open" in uniq) and len(uniq) >= 4:
                best = vals
                break
        df.columns = best
    elif len(df.columns) > 0 and isinstance(df.columns[0], tuple):
        df.columns = [c[-1] if isinstance(c, tuple) and len(c) > 0 else c for c in df.columns]

    df = df.reset_index()
    date_col = None
    for c in ["Date", "date", "Datetime", "datetime"]:
        if c in df.columns:
            date_col = c
            break
    if date_col is None and len(df.columns) > 0:
        date_col = df.columns[0]
    if date_col is not None and date_col != "Date":
        df = df.rename(columns={date_col: "Date"})

    def _col_str(c):
        return (c[-1] if isinstance(c, tuple) and len(c) > 0 else c) or ""

    column_map = {}
    for c in df.columns:
        name = _col_str(c) if not isinstance(c, str) else c
        if not isinstance(name, str):
            continue
        low = name.lower()
        if low == "open":
            column_map[c] = "Open"
        elif low == "high":
            column_map[c] = "High"
        elif low == "low":
            column_map[c] = "Low"
        elif low == "close":
            column_map[c] = "Close"
        elif low == "volume":
            column_map[c] = "Volume"
    if column_map:
        df = df.rename(columns=column_map)

    non_date = [c for c in df.columns if c != "Date"]
    if non_date and "Close" not in df.columns and len(non_date) >= 4:
        try:
            std = ["Open", "High", "Low", "Close", "Adj Close", "Volume"]
            rename_map = {}
            for i, col in enumerate(non_date[:6]):
                rename_map[col] = std[i]
            if rename_map:
                df = df.rename(columns=rename_map)
        except Exception:
            pass

    if "Close" not in df.columns:
        if "Adj Close" in df.columns:
            df = df.rename(columns={"Adj Close": "Close"})
        else:
            for col in df.columns:
                if isinstance(col, str) and "close" in col.lower():
                    df = df.rename(columns={col: "Close"})
                    break
    if "Close" not in df.columns:
        num_cols = [c for c in df.columns if c != "Date" and pd.api.types.is_numeric_dtype(df[c])]
        if len(num_cols) >= 4:
            df = df.rename(columns={num_cols[3]: "Close"})
    df["Date"] = pd.to_datetime(df["Date"]).astype(str)
    return df


def fetch_historical_data(
    symbol: str,
    period: str | None = None,
    interval: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> Dict[str, Any]:
    """
    Fetch historical OHLCV data using yfinance, then process through this service:
    clean data, add technical indicators, and return records suitable for preprocessing.
    """
    try:
        logger.info(f"Fetching market data for {symbol} via yfinance")
        period = period or Config.MARKET_DATA_PERIOD
        interval = interval or Config.MARKET_DATA_INTERVAL

        start_dt, end_dt = _period_to_start_end(period, interval, start_date, end_date)
        df = None

        try:
            raw = yf.download(
                symbol,
                start=start_dt,
                end=end_dt,
                interval=interval,
                progress=False,
                threads=False,
                auto_adjust=False,
                prepost=False,
            )
            if raw is not None and not raw.empty:
                if isinstance(raw.columns, pd.MultiIndex):
                    l0 = raw.columns.get_level_values(0)
                    if symbol in l0:
                        raw = raw[symbol].copy()
                    else:
                        raw = raw.copy()
                        best = raw.columns.get_level_values(-1)
                        for lev in range(raw.columns.nlevels):
                            vals = raw.columns.get_level_values(lev)
                            uniq = set(str(v) for v in vals)
                            if "Close" in uniq or "Open" in uniq:
                                if len(uniq) >= 4:
                                    best = vals
                                    break
                        raw.columns = best
                df = raw.copy()
        except Exception as e:
            logger.debug(f"yf.download failed: {e}")

        if df is None or df.empty:
            for attempt in range(1, 4):
                try:
                    ticker = yf.Ticker(symbol)
                    df = ticker.history(start=start_dt, end=end_dt, interval=interval)
                    if df is not None and not df.empty:
                        break
                except Exception as e:
                    logger.warning(f"Ticker.history attempt {attempt} failed: {e}")
                if (df is None or df.empty) and attempt < 3:
                    time.sleep(2)
                if attempt < 3:
                    time.sleep(1)

        if df is None or df.empty:
            return create_response(
                False,
                error=f"No data found for {symbol}. Check symbol and try again.",
            )

        df = _normalize_yfinance_df(df)
        if "Close" not in df.columns:
            for col in ["Adj Close", "close", "adj close"]:
                if col in df.columns:
                    df = df.rename(columns={col: "Close"})
                    break
        if "Close" not in df.columns:
            num_cols = [c for c in df.columns if c != "Date" and pd.api.types.is_numeric_dtype(df[c])]
            if len(num_cols) >= 4:
                df = df.rename(columns={num_cols[3]: "Close"})
            elif len(num_cols) == 1:
                df = df.rename(columns={num_cols[0]: "Close"})
        if "Close" not in df.columns:
            logger.warning(f"Columns received: {list(df.columns)}")
            return create_response(False, error=f"Missing Close prices for {symbol}")

        df = clean_dataframe(df)

        try:
            df = TechnicalIndicators.calculate_all_indicators(df)
        except Exception as ind_err:
            logger.warning(f"Indicators skipped: {ind_err}")

        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info or {}
        except Exception:
            info = {}

        records: List[Dict[str, Any]] = _to_json_serializable(df.to_dict("records"))
        logger.info(f"Fetched {len(records)} data points for {symbol}")

        payload = {
            "symbol": symbol,
            "data": records,
            "count": len(records),
            "info": {
                "name": info.get("longName", symbol),
                "shortName": info.get("shortName", symbol),
                "sector": info.get("sector", ""),
                "industry": info.get("industry", ""),
                "marketCap": info.get("marketCap", 0),
                "currentPrice": info.get("currentPrice", 0),
                "regularMarketPrice": info.get("regularMarketPrice", 0),
                "previousClose": info.get("previousClose", 0),
                "fiftyTwoWeekHigh": info.get("fiftyTwoWeekHigh", 0),
                "fiftyTwoWeekLow": info.get("fiftyTwoWeekLow", 0),
                "beta": info.get("beta"),
                "trailingPE": info.get("trailingPE"),
                "forwardPE": info.get("forwardPE"),
                "trailingEps": info.get("trailingEps"),
                "forwardEps": info.get("forwardEps"),
                "revenueGrowth": info.get("revenueGrowth"),
                "profitMargins": info.get("profitMargins"),
                "debtToEquity": info.get("debtToEquity"),
                "totalDebt": info.get("totalDebt"),
                "totalCash": info.get("totalCash"),
                "operatingCashflow": info.get("operatingCashflow"),
                "freeCashflow": info.get("freeCashflow"),
                "recommendationKey": info.get("recommendationKey"),
                "recommendationMean": info.get("recommendationMean"),
                "targetMeanPrice": info.get("targetMeanPrice"),
                "currency": info.get("currency", "USD"),
            },
            "period": period,
            "interval": interval,
        }
        return create_response(True, data=_to_json_serializable(payload))
    except Exception as e:
        logger.error(f"Error fetching market data: {str(e)}")
        return create_response(False, error=str(e))
