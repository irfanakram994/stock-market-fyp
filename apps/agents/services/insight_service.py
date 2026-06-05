"""
Sentiment analysis service.
Performs VADER sentiment analysis on news articles.
"""

from typing import List, Dict, Any

from utils.helpers import get_logger, create_response
from utils.sentiment import SentimentAnalyzer

logger = get_logger(__name__)


def analyze_news(articles: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Analyze sentiment of news articles.

    Args:
        articles: List of news articles with 'title', 'description', 'content'

    Returns:
        Response dict with sentiment analysis results
    """
    try:
        logger.info(f"Analyzing sentiment for {len(articles)} articles")

        if not articles:
            return create_response(False, error="No articles provided")

        analyzer = SentimentAnalyzer()
        results = []

        for article in articles:
            text = f"{article.get('title', '')} {article.get('description', '')}"
            sentiment = analyzer.analyze(text)
            results.append(
                {
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "publishedAt": article.get("publishedAt", ""),
                    "source": article.get("source", ""),
                    "sentiment": sentiment,
                }
            )

        texts = [f"{a.get('title', '')} {a.get('description', '')}" for a in articles]
        aggregated = analyzer.get_aggregated_sentiment(texts)

        logger.info(f"Overall sentiment: {aggregated['label']} ({aggregated['score']:.3f})")

        return create_response(
            True,
            data={
                "articles": results,
                "aggregated": aggregated,
                "count": len(results),
            },
        )
    except Exception as e:
        logger.error(f"Error analyzing sentiment: {str(e)}")
        return create_response(False, error=str(e))
