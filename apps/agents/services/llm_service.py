"""
LLM insight service.
Supports multiple LLM providers (OpenAI, Groq) to generate human-readable insights from predictions.
Configured via Config.LLM_PROVIDER environment variable.
"""

from typing import Dict, Any
import os

from config import Config
from utils.helpers import get_logger, create_response

logger = get_logger(__name__)

# Import LLM clients conditionally
try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    from groq import Groq
except ImportError:
    Groq = None

# Fallback models for Groq (if primary model fails)
GROQ_MODELS_FALLBACK = [
    "llama-3.1-8b-instant",
    "llama-3.2-3b-preview",
    "llama-3.2-1b-preview",
]

# Fallback models for OpenAI
OPENAI_MODELS_FALLBACK = [
    "gpt-4o-mini",
    "gpt-4o",
    "gpt-4-turbo",
]




def _generate_local_insight(
    symbol: str,
    current_price: float,
    predictions: list,
    trend: str,
    sentiment_score: float | None = None,
) -> str:
    """Generate insight locally without external API when LLM fails."""
    logger.info(f"Generating local insight for {symbol}")

    if not predictions:
        return f"{symbol} forecast unavailable. Please check again later."
    
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
    Uses the configured LLM provider (OpenAI or Groq) based on LLM_PROVIDER setting.
    Falls back to local insight generation if all LLM attempts fail.
    """
    try:
        logger.info(f"Generating insight for {symbol} using {Config.LLM_PROVIDER.upper()} LLM provider")

        if not predictions:
            return create_response(False, error="No predictions provided")

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

        # Try the configured provider
        if Config.LLM_PROVIDER == "openai":
            return _generate_insight_openai(symbol, current_price, last_pred, price_change, price_change_pct, trend, sentiment_score, prompt)
        elif Config.LLM_PROVIDER == "groq":
            return _generate_insight_groq(symbol, current_price, last_pred, price_change, price_change_pct, trend, sentiment_score, prompt)
        else:
            logger.error(f"Unknown LLM provider: {Config.LLM_PROVIDER}")
            insight = _generate_local_insight(symbol, current_price, predictions, trend, sentiment_score)
            return create_response(True, data={"insight": insight, "method": "local_generation"})

    except Exception as e:
        logger.error(f"Error generating insight: {str(e)}")
        # Fallback to local generation
        try:
            insight = _generate_local_insight(symbol, current_price, predictions, trend, sentiment_score)
            return create_response(True, data={"insight": insight, "method": "local_generation"})
        except Exception as local_e:
            logger.error(f"Error generating local insight: {str(local_e)}")
            return create_response(False, error=str(e))


def _generate_insight_openai(
    symbol: str,
    current_price: float,
    last_pred: dict,
    price_change: float,
    price_change_pct: float,
    trend: str,
    sentiment_score: float | None,
    prompt: str,
) -> Dict[str, Any]:
    """Generate insight using OpenAI API"""
    try:
        if not OpenAI:
            raise ImportError("OpenAI client not installed. Install with: pip install openai")
        
        if not Config.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in configuration")
        
        client = OpenAI(api_key=Config.OPENAI_API_KEY)
        
        # Try models in order of preference
        models_to_try = [Config.OPENAI_MODEL] + [m for m in OPENAI_MODELS_FALLBACK if m != Config.OPENAI_MODEL]
        
        chat_completion = None
        last_error = None
        
        for model_name in models_to_try:
            try:
                if model_name != Config.OPENAI_MODEL:
                    logger.warning(f"Primary OpenAI model failed, trying fallback: {model_name}")
                
                chat_completion = client.chat.completions.create(
                    messages=[
                        {
                            "role": "system",
                            "content": "You are a professional stock market analyst providing concise, data-driven insights.",
                        },
                        {"role": "user", "content": prompt},
                    ],
                    model=model_name,
                    temperature=Config.OPENAI_TEMPERATURE,
                    max_tokens=Config.OPENAI_MAX_TOKENS,
                )
                logger.info(f"Successfully generated insight using OpenAI model: {model_name}")
                break
            except Exception as e:
                last_error = e
                err_msg = str(e).lower()
                if "not found" in err_msg or "does not exist" in err_msg or "invalid" in err_msg:
                    logger.debug(f"Model {model_name} unavailable, trying next...")
                    continue
                raise
        
        if chat_completion is None:
            error_msg = f"All OpenAI models failed. Using local insight generation. Last error: {last_error}"
            logger.warning(error_msg)
            insight = _generate_local_insight_from_prompt(symbol, current_price, last_pred, price_change, price_change_pct, trend, sentiment_score)
            return create_response(True, data={"insight": insight, "method": "local_generation"})
        
        insight = chat_completion.choices[0].message.content.strip()
        logger.info("Generated insight successfully via OpenAI")
        
        return create_response(
            True,
            data={
                "symbol": symbol,
                "insight": insight,
                "provider": "openai",
                "model": models_to_try[0],
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
        logger.error(f"Error with OpenAI provider: {str(e)}")
        raise


def _generate_insight_groq(
    symbol: str,
    current_price: float,
    last_pred: dict,
    price_change: float,
    price_change_pct: float,
    trend: str,
    sentiment_score: float | None,
    prompt: str,
) -> Dict[str, Any]:
    """Generate insight using Groq API (legacy/fallback)"""
    try:
        if not Groq:
            raise ImportError("Groq client not installed. Install with: pip install groq")
        
        if not Config.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is not set in configuration")
        
        client = Groq(api_key=Config.GROQ_API_KEY)
        
        # Try models in order of preference
        models_to_try = [Config.GROQ_MODEL] + [m for m in GROQ_MODELS_FALLBACK if m != Config.GROQ_MODEL]
        
        chat_completion = None
        last_error = None
        
        for model_name in models_to_try:
            try:
                if model_name != Config.GROQ_MODEL:
                    logger.warning(f"Primary Groq model failed, trying fallback: {model_name}")
                
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
                logger.info(f"Successfully generated insight using Groq model: {model_name}")
                break
            except Exception as e:
                last_error = e
                err_msg = str(e).lower()
                if "decommissioned" in err_msg or "does not exist" in err_msg or "not found" in err_msg:
                    logger.debug(f"Model {model_name} unavailable, trying next...")
                    continue
                raise
        
        if chat_completion is None:
            error_msg = f"All Groq models failed. Using local insight generation. Last error: {last_error}"
            logger.warning(error_msg)
            insight = _generate_local_insight_from_prompt(symbol, current_price, last_pred, price_change, price_change_pct, trend, sentiment_score)
            return create_response(True, data={"insight": insight, "method": "local_generation"})
        
        insight = chat_completion.choices[0].message.content.strip()
        logger.info("Generated insight successfully via Groq")
        
        return create_response(
            True,
            data={
                "symbol": symbol,
                "insight": insight,
                "provider": "groq",
                "model": models_to_try[0],
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
        logger.error(f"Error with Groq provider: {str(e)}")
        raise


def _generate_local_insight_from_prompt(
    symbol: str,
    current_price: float,
    last_pred: dict,
    price_change: float,
    price_change_pct: float,
    trend: str,
    sentiment_score: float | None,
) -> str:
    """Generate insight locally without external API when LLM fails."""
    logger.info(f"Generating local insight for {symbol}")
    
    days = len([last_pred])  # Simplified for single prediction
    
    if trend == "bullish":
        if sentiment_score is not None and sentiment_score > 0.1:
            insight = (
                f"{symbol} shows bullish momentum with positive news sentiment "
                f"({sentiment_score:.2f}). Expected price increase of "
                f"{price_change_pct:.1f}%."
            )
        else:
            insight = (
                f"{symbol} exhibits bullish trend with predicted price rise from "
                f"${current_price:.2f} to ${last_pred['predictedPrice']:.2f} ({price_change_pct:.1f}%). "
                "Consider long positions."
            )
    elif trend == "bearish":
        if sentiment_score is not None and sentiment_score < -0.1:
            insight = (
                f"{symbol} faces bearish pressure amid negative sentiment "
                f"({sentiment_score:.2f}). Anticipated decline of "
                f"{abs(price_change_pct):.1f}%."
            )
        else:
            insight = (
                f"{symbol} demonstrates bearish signals with expected price decline to "
                f"${last_pred['predictedPrice']:.2f} ({price_change_pct:.1f}%). Caution warranted for long positions."
            )
    else:
        insight = (
            f"{symbol} shows neutral momentum. Price expected to range around "
            f"${current_price:.2f}, with modest ${abs(last_pred['predictedPrice'] - current_price):.2f} "
            f"movement possible."
        )
        
        if sentiment_score is not None:
            sentiment_label = (
                "positive" if sentiment_score > 0.05 else "negative" if sentiment_score < -0.05 else "neutral"
            )
            insight += f" News sentiment is {sentiment_label}."
    
    return insight
