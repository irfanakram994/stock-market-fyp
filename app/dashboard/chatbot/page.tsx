"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Send, Sparkles, Bot, User, Loader2 } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

function normalizeMarkdown(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^(\d+)\)\s+/gm, "$1. ")
    .replace(/^\s*[-*]\s*/gm, "- ")
    .trim();
}

const QUICK_PROMPTS = [
  "Summarize today's trend for AAPL and key risks.",
  "Explain RSI and how to read overbought signals.",
  "Compare MSFT vs NVDA short-term momentum.",
  "What does a golden cross signal in trading?",
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hi! I can help with stock trends, trading concepts, and market signals. Ask me anything about tickers, indicators, or strategy basics.",
        timestamp: new Date().toISOString(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const trimmedMessages = useMemo(
    () =>
      messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
    [messages],
  );

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...trimmedMessages, userMessage] }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      const reply: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: "assistant",
        content: normalizeMarkdown(data.data.message),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, reply]);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold" style={{ fontFamily: "Space Grotesk, ui-sans-serif" }}>
          TradeFlux Chat
        </h1>
        <p className="text-gray-400 max-w-3xl">
          Ask about stocks, trading signals, or market trends. Responses are
          grounded in general market knowledge and should be verified before
          making decisions.
        </p>
      </div>

      <div className="space-y-6">
        <div className="card flex h-[calc(100vh-280px)] min-h-[520px] flex-col">
          <div className="flex items-center justify-between border-b border-gray-700/50 pb-3">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Groq-powered market assistant</span>
            </div>
            <span className="text-xs text-gray-500">Live session</span>
          </div>

          <div
            ref={listRef}
            className="mt-4 flex-1 space-y-4 overflow-y-auto pr-2"
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "assistant" && (
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={`max-w-[78%] rounded-2xl border px-4 py-3 text-[15px] leading-relaxed ${
                    msg.role === "user"
                      ? "border-primary/40 bg-primary/10 text-gray-100"
                      : "border-gray-700/60 bg-dark-200/50 text-gray-200"
                  }`}
                >
                  <ReactMarkdown
                    className="chat-markdown"
                    remarkPlugins={[remarkGfm]}
                  >
                    {msg.content}
                  </ReactMarkdown>
                  <div className="mt-2 text-[10px] uppercase tracking-wide text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-dark-200 text-gray-300">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Thinking...
              </div>
            )}
          </div>

          <div className="mt-4 border-t border-gray-700/50 pt-4">
            {error && (
              <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs text-red-200">
                {error}
              </div>
            )}
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask about a stock, trend, or signal..."
                className="flex-1 rounded-xl border border-gray-700 bg-dark-200/60 px-4 py-3 text-[15px] text-gray-100 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="btn-primary flex items-center justify-center gap-2 px-6 py-3"
              >
                <Send className="h-4 w-4" />
                Send
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Tip: Press Enter to send. Shift+Enter for a new line.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold">Quick prompts</h3>
              <p className="mt-1 text-sm text-gray-400">
                Jump-start a conversation with these ready prompts.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className="rounded-full border border-gray-700/60 bg-dark-200/40 px-4 py-2 text-left text-sm text-gray-200 transition hover:border-primary/40 hover:bg-dark-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
