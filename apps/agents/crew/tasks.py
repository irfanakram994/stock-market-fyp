from typing import Dict, List

from crewai import Task


def build_full_tasks(agents: Dict[str, object], tools: Dict[str, object]) -> List[Task]:
    return [
        Task(
            name="market_data",
            description="Fetch market data for {symbol} using the fetch_market_data tool. Return only the tool output.",
            expected_output="JSON tool output with market data payload.",
            agent=agents["market"],
            tools=[tools["market"]],
        ),
        Task(
            name="news_fetch",
            description="Fetch recent news for {symbol} using the fetch_news tool. Return only the tool output.",
            expected_output="JSON tool output with news articles payload.",
            agent=agents["news"],
            tools=[tools["news"]],
        ),
        Task(
            name="sentiment",
            description="Analyze sentiment for the fetched news using the analyze_sentiment tool. Return only the tool output.",
            expected_output="JSON tool output with sentiment analysis payload.",
            agent=agents["sentiment"],
            tools=[tools["sentiment"]],
        ),
        Task(
            name="merge_data",
            description="Merge market and sentiment data using merge_market_and_sentiment tool. Return only the tool output.",
            expected_output="JSON tool output with merged data payload.",
            agent=agents["preprocess"],
            tools=[tools["merge"]],
        ),
        Task(
            name="prepare_prophet",
            description="Prepare Prophet-ready data using prepare_prophet_data tool. Return only the tool output.",
            expected_output="JSON tool output with prophet-ready data payload.",
            agent=agents["preprocess"],
            tools=[tools["prophet"]],
        ),
        Task(
            name="predict",
            description="Run forecasting using run_prediction tool. Return only the tool output.",
            expected_output="JSON tool output with prediction payload.",
            agent=agents["predict"],
            tools=[tools["predict"]],
        ),
        Task(
            name="insight",
            description="Generate LLM insight using generate_llm_insight tool. Return only the tool output.",
            expected_output="JSON tool output with insight payload.",
            agent=agents["insight"],
            tools=[tools["insight"]],
        ),
        Task(
            name="report",
            description="Generate prediction report using generate_report tool. Return only the tool output.",
            expected_output="JSON tool output with report metadata.",
            agent=agents["report"],
            tools=[tools["report"]],
        ),
    ]


def build_news_tasks(agents: Dict[str, object], tools: Dict[str, object]) -> List[Task]:
    return [
        Task(
            name="news_fetch",
            description="Fetch recent news for {symbol} using the fetch_news tool. Return only the tool output.",
            expected_output="JSON tool output with news articles payload.",
            agent=agents["news"],
            tools=[tools["news"]],
        )
    ]


def build_market_tasks(agents: Dict[str, object], tools: Dict[str, object]) -> List[Task]:
    return [
        Task(
            name="market_data",
            description="Fetch market data for {symbol} using the fetch_market_data tool. Return only the tool output.",
            expected_output="JSON tool output with market data payload.",
            agent=agents["market"],
            tools=[tools["market"]],
        )
    ]


def build_sentiment_tasks(agents: Dict[str, object], tools: Dict[str, object]) -> List[Task]:
    return [
        Task(
            name="news_fetch",
            description="Fetch recent news for {symbol} using the fetch_news tool. Return only the tool output.",
            expected_output="JSON tool output with news articles payload.",
            agent=agents["news"],
            tools=[tools["news"]],
        ),
        Task(
            name="sentiment",
            description="Analyze sentiment for the fetched news using the analyze_sentiment tool. Return only the tool output.",
            expected_output="JSON tool output with sentiment analysis payload.",
            agent=agents["sentiment"],
            tools=[tools["sentiment"]],
        ),
    ]
