"""
CrewAI Agent Orchestrator
CLI entry point for running agents individually or in orchestrated workflows
"""

import argparse
import json
import logging
import sys
import os

# Suppress Prophet plotly import ERROR (interactive plots not used in API)
logging.getLogger("prophet.plot").setLevel(logging.CRITICAL)

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import Config
from utils.helpers import get_logger, to_json
from services.market_data_service import fetch_historical_data
from services.news_service import fetch_news
from services.insight_service import analyze_news
from services.preprocessing_service import merge_data, prepare_for_prophet
from services.prediction_service import train_and_predict
from services.llm_service import generate_insight
from utils.helpers import create_response

logger = get_logger(__name__)

def main():
    """CLI entry point"""
    parser = argparse.ArgumentParser(description='TradeFlux Agent Service')
    parser.add_argument('--agent', choices=[
        'news', 'market', 'sentiment', 'prediction', 'full'
    ], required=True, help='Agent to run')
    parser.add_argument('--symbol', required=True, help='Stock symbol')
    parser.add_argument('--days', type=int, default=30, help='Forecast days')
    parser.add_argument(
        '--framework',
        choices=['auto', 'legacy', 'crewai'],
        default='crewai',
        help='(Deprecated) CrewAI is the only supported framework',
    )
    
    args = parser.parse_args()
    
    symbol = args.symbol.upper()

    if args.agent == 'news':
        if not Config.NEWS_API_KEY:
            print("Configuration error: NEWS_API_KEY is required", file=sys.stderr)
            sys.exit(1)
        result = fetch_news(symbol)
        print(to_json(result))
        return

    # Validate full agent configuration only for LLM/forecast workflows.
    try:
        Config.validate()
    except ValueError as e:
        print(f"Configuration error: {e}", file=sys.stderr)
        sys.exit(1)
    
    if args.framework and args.framework.lower() != "crewai":
        logger.warning("Legacy framework option selected; running direct pipeline.")

    if args.framework and args.framework.lower() == "legacy":
        # Run the direct pipeline sequentially only for full prediction requests.
        if args.agent in ('prediction', 'full'):
            try:
                market = fetch_historical_data(symbol)
                if not market.get("success"):
                    result = market
                else:
                    news = fetch_news(symbol)
                    sentiment = analyze_news(news.get("data", {}).get("articles", []) if news.get("success") else [])
                    merged = merge_data(market.get("data", {}).get("data", []), sentiment.get("data", {}).get("articles", []) if sentiment.get("success") else [])
                    prepared = prepare_for_prophet(merged.get("data", {}).get("merged_data", []))
                    predictions = train_and_predict(prepared.get("data", {}).get("prophet_data", []), forecast_days=args.days)
                    insight = generate_insight(symbol, market.get("data", {}).get("info", {}).get("currentPrice", 0), predictions.get("data", {}).get("predictions", []), predictions.get("data", {}).get("trend", "neutral"), sentiment.get("data", {}).get("aggregated", {}).get("score") if sentiment.get("success") else None)
                    result = create_response(True, data={
                        "symbol": symbol,
                        "currentPrice": market.get("data", {}).get("info", {}).get("currentPrice", 0),
                        "predictions": predictions.get("data", {}).get("predictions", []),
                        "trend": predictions.get("data", {}).get("trend", "neutral"),
                        "insight": insight.get("data", {}).get("insight") if insight.get("success") else None,
                        "sentimentScore": sentiment.get("data", {}).get("aggregated", {}).get("score") if sentiment.get("success") else None,
                        "sentimentArticles": sentiment.get("data", {}).get("articles", []) if sentiment.get("success") else [],
                    })
            except Exception as e:
                result = {"success": False, "error": str(e)}
        else:
            if args.agent == 'news':
                result = fetch_news(symbol)
            elif args.agent == 'market':
                result = fetch_historical_data(symbol)
            elif args.agent == 'sentiment':
                result = analyze_news(fetch_news(symbol).get("data", {}).get("articles", []) if fetch_news(symbol).get("success") else [])
            else:
                result = {'success': False, 'error': 'Unsupported agent'}
    else:
        try:
            from crew.orchestrator import CrewAIOrchestrator
        except ModuleNotFoundError:
            print(
                "Missing dependency: 'crewai' not found in the current Python environment.\n"
                "Please activate the project's virtual environment and try again:\n"
                "  PowerShell:  (Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& .venv\\Scripts\\Activate.ps1)\n"
                "  cmd.exe:    .venv\\Scripts\\activate.bat\n"
                "Or run the script explicitly with the venv Python:\n"
                f"  {os.path.join(sys.path[0], '.venv', 'Scripts', 'python.exe')} apps/agents/main.py --agent prediction --symbol AAPL --days 7\n",
                file=sys.stderr,
            )
            sys.exit(1)

        orchestrator = CrewAIOrchestrator(symbol=symbol, forecast_days=args.days)

        if args.agent == 'market':
            result = orchestrator.run_market()
        elif args.agent == 'sentiment':
            result = orchestrator.run_sentiment()
        elif args.agent in ('prediction', 'full'):
            result = orchestrator.run_full_prediction()
        else:
            result = {'success': False, 'error': 'Unsupported agent'}

    print(to_json(result))

if __name__ == '__main__':
    main()
