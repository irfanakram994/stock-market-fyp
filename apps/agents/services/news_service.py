"""
News data service.
Fetches news articles from News API for specified stock symbols.
"""

from datetime import datetime, timedelta
from typing import Dict, Any

import requests

from config import Config
from utils.helpers import get_logger, create_response, format_date

logger = get_logger(__name__)


def fetch_news(symbol: str, days: int | None = None) -> Dict[str, Any]:
    """
    Fetch news articles for a stock symbol.

    Args:
        symbol: Stock symbol (e.g., 'AAPL')
        days: Number of days to look back (default from config)

    Returns:
        Response dict with news articles
    """
    try:
        logger.info(f"Fetching news for {symbol}")

        if not Config.NEWS_API_KEY:
            return create_response(False, error="News API key not configured")

        days = days or Config.NEWS_LOOKBACK_DAYS
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)

        url = f"{Config.NEWS_API_BASE_URL}/everything"
        params = {
            "q": f"{symbol} stock OR {symbol} shares",
            "from": format_date(start_date),
            "to": format_date(end_date),
            "language": "en",
            "sortBy": "publishedAt",
            "pageSize": Config.NEWS_FETCH_LIMIT,
            "apiKey": Config.NEWS_API_KEY,
        }

        response = requests.get(url, params=params, timeout=30)
        response.raise_for_status()

        data = response.json()

        if data.get("status") != "ok":
            return create_response(False, error=f"API error: {data.get('message', 'Unknown error')}")

        articles = data.get("articles", [])
        processed_articles = [
            {
                "title": article.get("title", ""),
                "description": article.get("description", ""),
                "content": article.get("content", ""),
                "source": article.get("source", {}).get("name", "Unknown"),
                "author": article.get("author", ""),
                "url": article.get("url", ""),
                "imageUrl": article.get("urlToImage", ""),
                "publishedAt": article.get("publishedAt", ""),
            }
            for article in articles
        ]

        logger.info(f"Fetched {len(processed_articles)} articles for {symbol}")

        return create_response(
            True,
            data={
                "symbol": symbol,
                "articles": processed_articles,
                "count": len(processed_articles),
                "dateRange": {
                    "from": format_date(start_date),
                    "to": format_date(end_date),
                },
            },
        )
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return create_response(False, error=f"Request failed: {str(e)}")
    except Exception as e:
        logger.error(f"Error fetching news: {str(e)}")
        return create_response(False, error=str(e))
