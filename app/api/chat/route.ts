import { NextRequest, NextResponse } from "next/server";

type ChatRole = "system" | "user" | "assistant";

interface ChatMessage {
  role: ChatRole;
  content: string;
}

const SYSTEM_PROMPT =
  "You are TradeFlux Chat, a concise assistant for stocks, trading, investing, and market news. " +
  "Use clean Markdown with short paragraphs, bullets, and numbering where helpful. " +
  "If the user asks for N items (e.g., 5, 10), respond with a numbered list using '1.' style and include exactly N items. " +
  "Answer with clear steps, highlight risks, and avoid guarantees. " +
  "Do not claim real-time market access; if asked for latest data, say it may be delayed and suggest sources to verify.";

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
];

const OUT_OF_SCOPE_MESSAGE =
  "I can only help with stock market, trading, and market-news questions. " +
  "Please ask about tickers, trends, signals, or market concepts.";

function isInScope(text: string) {
  const lower = text.toLowerCase();
  return SCOPE_KEYWORDS.some((keyword) => lower.includes(keyword));
}

function isGreeting(text: string) {
  const lower = text.toLowerCase();
  return GREETING_KEYWORDS.some((keyword) => lower.includes(keyword));
}

export async function POST(request: NextRequest) {
  try {
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
