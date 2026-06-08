import { NextRequest, NextResponse } from "next/server";
import { requireModuleEnabled } from "@/lib/moduleGuard";
import { requireUser } from "@/lib/userAuth";

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

const TRADEFLUX_TEAM =
  "Trade Flux Team:\n" +
  "- Irfan Ali 22011519-029\n" +
  "- Zainab Mazhar 22011519-043\n" +
  "- Syed Mohsin Taseer Naqvi 22011519-067";

const PROJECT_CONTEXT = `
TradeFlux is an Agentic AI Stock Market Prediction System. It has a Next.js dashboard, Next.js API routes, PostgreSQL with Prisma, Python agents, Yahoo Finance market data, News API news, Prophet forecasting, sentiment analysis, and Groq/OpenAI LLM insights.

Dashboard navigation labels:
- Dashboard
- Stock Analysis
- AI Predictions
- Chatbot
- Backtesting
- Visualizations
- Agent Logs
- About Project

Important TradeFlux workflows:
- To view Apple's 29-day forecast: open AI Predictions from the sidebar, choose AAPL or Apple in Stock Symbol, set Forecast Days to 29, click Run Prediction, then review the Price Forecast graph and the final forecast point/day-29 value.
- To change password: click the top-right user profile area in the navbar, choose Change Password, enter Current Password, New Password, and Confirm New Password, then click Update Password.
- To download prediction reports: open AI Predictions, select or run a forecast, then use the CSV or JSON buttons near the page header.
- To inspect agent execution: open Agent Logs from the sidebar.
- To learn about the system: open About Project from the sidebar.

Team identity:
${TRADEFLUX_TEAM}
`;

const SYSTEM_PROMPT =
  "You are TradeFlux Chat, a concise assistant for the TradeFlux app, stocks, trading, investing, and market news.\n\n" +
  PROJECT_CONTEXT +
  "\nResponse rules:\n" +
  "- Use clean Markdown with short paragraphs, bullets, and numbered steps where helpful.\n" +
  "- If the user asks for N items, respond with a numbered list using '1.' style and include exactly N items.\n" +
  "- For TradeFlux how-to questions, use the exact dashboard labels from the project context.\n" +
  "- If asked who made you, who created TradeFlux, or who is the team, answer with the Trade Flux Team list exactly.\n" +
  "- Answer market questions educationally, highlight risks, avoid guarantees, and do not provide personalized financial advice.\n" +
  "- Do not claim real-time market access; if asked for latest data, say it may be delayed and suggest verifying in live market sources or the TradeFlux dashboard.";

const SCOPE_KEYWORDS = [
  "stock",
  "stocks",
  "invest",
  "investment",
  "investing",
  "portfolio",
  "buy",
  "sell",
  "selling",
  "hold",
  "holding",
  "equity",
  "equities",
  "share",
  "shares",
  "ticker",
  "market",
  "markets",
  "trade",
  "trading",
  "market news",
  "earnings",
  "dividend",
  "dividends",
  "valuation",
  "fundamentals",
  "technical",
  "indicator",
  "indicator",
  "price",
  "chart",
  "trend",
  "volume",
  "volatility",
  "index",
  "indices",
  "nasdaq",
  "nyse",
  "s&p",
  "dow",
  "psx",
  "kse",
  "karachi",
  "etf",
  "options",
  "futures",
  "guidance",
  "news",
  "macro",
  "rsi",
  "macd",
  "moving average",
  "support",
  "resistance",
  "bull",
  "bear",
  "lucky cement",
  "fauji fertilizer",
  "foji fertilizer",
  "ogdc",
  "oil and gas development",
  "hbl",
  "mcb",
  "ubl",
  "engro",
  "pso",
  "pakistan state oil",
  "prediction",
  "predictions",
  "forecast",
  "forecasting",
  "prophet",
  "sentiment",
  "agent",
  "agents",
  "llm",
];

const PROJECT_KEYWORDS = [
  "tradeflux",
  "trade flux",
  "dashboard",
  "ai predictions",
  "ai prediction",
  "stock analysis",
  "chatbot",
  "backtesting",
  "visualizations",
  "agent logs",
  "about project",
  "about",
  "password",
  "change password",
  "profile",
  "top right",
  "navbar",
  "sidebar",
  "report",
  "reports",
  "csv",
  "json",
  "download",
  "apple",
  "aapl",
  "29 day",
  "29-day",
  "29 days",
  "who made",
  "who created",
  "made you",
  "team",
  "irfan",
  "zainab",
  "mohsin",
];

const GREETING_KEYWORDS = [
  "hello",
  "hi",
  "hey",
  "salaam",
  "assalam",
  "how are you",
  "what's your name",
  "whats your name",
  "who are you",
  "who made you",
];

const OUT_OF_SCOPE_MESSAGE =
  "I can help with TradeFlux app guidance, stock market questions, trading concepts, forecasts, reports, and market-news topics. " +
  "Try asking about AI Predictions, changing your password, reading forecast graphs, tickers, trends, or indicators.";

function isInScope(text: string) {
  const lower = text.toLowerCase();
  return (
    SCOPE_KEYWORDS.some((keyword) => lower.includes(keyword)) ||
    PROJECT_KEYWORDS.some((keyword) => lower.includes(keyword))
  );
}

function isGreeting(text: string) {
  const lower = text.toLowerCase();
  return GREETING_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function getTradeFluxAnswer(text: string) {
  const lower = text.toLowerCase();

  if (
    lower.includes("who made") ||
    lower.includes("made you") ||
    lower.includes("who created") ||
    lower.includes("team")
  ) {
    return TRADEFLUX_TEAM;
  }

  if (
    (lower.includes("29") && (lower.includes("apple") || lower.includes("aapl"))) ||
    (lower.includes("forecast") && (lower.includes("apple") || lower.includes("aapl")))
  ) {
    return [
      "To view Apple's 29-day forecast in TradeFlux:",
      "",
      "1. Open **AI Predictions** from the left sidebar.",
      "2. In **Stock Symbol**, select **AAPL** or Apple.",
      "3. Set **Forecast Days** to **29**.",
      "4. Click **Run Prediction**.",
      "5. In **Price Forecast - AAPL**, inspect the graph and the final forecast point for the day-29 value.",
      "",
      "You can also review **AI Insight** below the chart for the model summary and risk notes.",
    ].join("\n");
  }

  if (lower.includes("password")) {
    return [
      "To change your password in TradeFlux:",
      "",
      "1. Click your user profile area in the **top-right corner** of the navbar.",
      "2. Choose **Change Password** from the dropdown.",
      "3. Enter your **Current Password**.",
      "4. Enter your **New Password**.",
      "5. Re-enter it in **Confirm New Password**.",
      "6. Click **Update Password**.",
    ].join("\n");
  }

  if (lower.includes("download") || lower.includes("csv") || lower.includes("json") || lower.includes("report")) {
    return [
      "To download prediction reports in TradeFlux:",
      "",
      "1. Open **AI Predictions** from the sidebar.",
      "2. Select an existing stock forecast or run a new prediction.",
      "3. Use the **CSV** button to download spreadsheet-style data.",
      "4. Use the **JSON** button to download structured forecast data.",
    ].join("\n");
  }

  if (lower.includes("what is tradeflux") || lower.includes("about tradeflux") || lower.includes("tradeflux itself")) {
    return [
      "**TradeFlux** is an Agentic AI Stock Market Prediction System.",
      "",
      "It combines:",
      "- A **Next.js** dashboard for stock analysis, predictions, charts, backtesting, and logs.",
      "- **PostgreSQL** and **Prisma** for stored users, stocks, predictions, and agent logs.",
      "- **Python agents** for market data, news, preprocessing, forecasting, and report generation.",
      "- **Yahoo Finance**, **News API**, **Prophet forecasting**, sentiment analysis, and Groq/OpenAI LLM insights.",
    ].join("\n");
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const disabled = await requireModuleEnabled("chatbot_module");
    if (disabled) return disabled;

    const body = await request.json();
    const messages = Array.isArray(body?.messages) ? body.messages : [];

    if (messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages are required." },
        { status: 400 },
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
    const temperature = Number(process.env.GROQ_TEMPERATURE || 0.7);
    const maxTokens = Number(process.env.GROQ_MAX_TOKENS || 500);

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "Groq API key is not configured." },
        { status: 500 },
      );
    }

    const trimmedMessages: ChatMessage[] = messages
      .filter((msg: ChatMessage) => msg?.role && msg?.content)
      .map((msg: ChatMessage) => ({ role: msg.role, content: msg.content }))
      .slice(-16);

    const lastUserMessage = [...trimmedMessages]
      .reverse()
      .find((msg) => msg.role === "user")?.content;

    const localAnswer = lastUserMessage ? getTradeFluxAnswer(lastUserMessage) : null;
    if (localAnswer) {
      return NextResponse.json({
        success: true,
        data: { message: localAnswer },
      });
    }

    if (lastUserMessage && !isInScope(lastUserMessage) && !isGreeting(lastUserMessage)) {
      return NextResponse.json({
        success: true,
        data: { message: OUT_OF_SCOPE_MESSAGE },
      });
    }

    const payload = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...trimmedMessages],
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          success: false,
          error: "Groq request failed",
          details: errorText,
        },
        { status: response.status },
      );
    }

    const data = await response.json();
    const content =
      data?.choices?.[0]?.message?.content ||
      "I could not generate a response right now.";

    return NextResponse.json({
      success: true,
      data: {
        message: content,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "Chat request failed", details: message },
      { status: 500 },
    );
  }
}
