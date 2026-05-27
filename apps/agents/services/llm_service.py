"""
LLM insight service.
Uses Groq API to generate human-readable insights from predictions.
"""

from typing import Dict, Any

from groq import Groq

from config import Config
from utils.helpers import get_logger, create_response

logger = get_logger(__name__)

GROQ_MODELS_FALLBACK = [
    "llama-3.3-70b-specdec",
    "deepseek-r1-distill-llama-70b",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
]


def _generate_local_insight(
    symbol: str,
    current_price: float,
    predictions: list,
    trend: str,
    sentiment_score: float | None = None,
) -> str:
    """Generate insight locally without external API when Groq fails."""
    logger.info(f"Generating local insight for {symbol}")

    first_pred = predictions[0]["predictedPrice"]
    last_pred = predictions[-1]["predictedPrice"]
    days = len(predictions)

    price_change_pct = ((last_pred - current_price) / current_price) * 100

    if trend == "bullish":
        if sentiment_score is not None and sentiment_score > 0.1:
            insight = (
                f"{symbol} shows bullish momentum with positive news sentiment "
                f"({sentiment_score:.2f}). Expected price increase of "
                f"{price_change_pct:.1f}% over {days} days."
            )
        else:
            insight = (
                f"{symbol} exhibits bullish trend with predicted price rise from "
                f"${current_price:.2f} to ${last_pred:.2f} ({price_change_pct:.1f}%). "
                "Consider long positions."
            )
    elif trend == "bearish":
        if sentiment_score is not None and sentiment_score < -0.1:
            insight = (
                f"{symbol} faces bearish pressure amid negative sentiment "
                f"({sentiment_score:.2f}). Anticipated decline of "
                f"{abs(price_change_pct):.1f}% over {days} days."
            )
        else:
            insight = (
                f"{symbol} demonstrates bearish signals with expected price decline to "
                f"${last_pred:.2f} ({price_change_pct:.1f}%). Caution warranted for long positions."
            )
    else:
        insight = (
            f"{symbol} shows neutral momentum. Price expected to range around "
            f"${current_price:.2f}, with modest ${abs(last_pred - current_price):.2f} "
            f"movement possible over {days} days."
        )

        if sentiment_score is not None:
            sentiment_label = (
                "positive" if sentiment_score > 0.05 else "negative" if sentiment_score < -0.05 else "neutral"
            )
            insight += f" News sentiment is {sentiment_label}."

    return insight


def generate_insight(
    symbol: str,
    current_price: float,
    predictions: list,
    trend: str,
    sentiment_score: float | None = None,
) -> Dict[str, Any]:
    """
    Generate human-readable insight from prediction data.
    """
    try:
        logger.info(f"Generating insight for {symbol}")

        if not predictions:
            return create_response(False, error="No predictions provided")

        client = Groq(api_key=Config.GROQ_API_KEY)
        first_pred = predictions[0]
        last_pred = predictions[-1]

        price_change = last_pred["predictedPrice"] - current_price
        price_change_pct = (price_change / current_price) * 100

        prompt = f"""You are a professional stock market analyst. Analyze the following prediction data and provide a concise, actionable insight.

Stock: {symbol}
Current Price: ${current_price:.2f}

Predictions (next {len(predictions)} days):
- First day: ${first_pred['predictedPrice']:.2f} (confidence: {first_pred['confidence']:.2%})
- Last day: ${last_pred['predictedPrice']:.2f} (confidence: {last_pred['confidence']:.2%})
- Overall trend: {trend}
- Expected change: ${price_change:.2f} ({price_change_pct:+.2f}%)
"""

        if sentiment_score is not None:
            sentiment_label = (
                "positive" if sentiment_score > 0.05 else "negative" if sentiment_score < -0.05 else "neutral"
            )
            prompt += f"- News sentiment: {sentiment_label} ({sentiment_score:.3f})\n"

        prompt += """
Provide a 2-3 sentence insight that:
1. Summarizes the prediction
2. Mentions key risks or opportunities
3. Is professional but accessible

Do not include disclaimers or investment advice warnings."""

        chat_completion = None
        last_error = None

        models_to_try = [Config.GROQ_MODEL] + [m for m in GROQ_MODELS_FALLBACK if m != Config.GROQ_MODEL]

        for model_name in models_to_try:
            try:
                if model_name != Config.GROQ_MODEL:
                    logger.warning(f"Primary model failed, trying fallback: {model_name}")

                chat_completion = client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a professional stock market analyst providing concise, data-driven insights.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    model=model_name,
                    temperature=Config.GROQ_TEMPERATURE,
                    max_tokens=Config.GROQ_MAX_TOKENS,
                )
                logger.info(f"Successfully used model: {model_name}")
                break
            except Exception as e:
                last_error = e
                err_msg = str(e).lower()
                if "decommissioned" in err_msg or "does not exist" in err_msg or "not found" in err_msg:
                    logger.debug(f"Model {model_name} unavailable, trying next...")
                    continue
                raise

        if chat_completion is None:
            error_msg = f"All Groq models failed. Using local insight generation. {last_error}"
            logger.warning(error_msg)
            insight = _generate_local_insight(symbol, current_price, predictions, trend, sentiment_score)
            return create_response(True, data={"insight": insight, "method": "local_generation"})

        insight = chat_completion.choices[0].message.content.strip()
        logger.info("Generated insight successfully")

        return create_response(
            True,
            data={
                "symbol": symbol,
                "insight": insight,
                "summary": {
                    "currentPrice": current_price,
                    "predictedPrice": last_pred["predictedPrice"],
                    "priceChange": round(price_change, 2),
                    "priceChangePct": round(price_change_pct, 2),
                    "trend": trend,
                    "confidence": last_pred["confidence"],
                },
            },
        )
    except Exception as e:
        logger.error(f"Error generating insight: {str(e)}")
        return create_response(False, error=str(e))
