"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ElementType } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Brain,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface PromptGroup {
  title: string;
  icon: ElementType;
  prompts: string[];
}

function normalizeMarkdown(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/^(\d+)\)\s+/gm, "$1. ")
    .replace(/^\s*[-*]\s*/gm, "- ")
    .trim();
}

const WELCOME_MESSAGE = `Hi, I am TradeFlux Chat. I can help you use TradeFlux and explain stock-market concepts.

Ask me how to run forecasts, read AI Prediction graphs, change your password, export reports, or understand indicators like RSI and MACD.`;

const PROMPT_GROUPS: PromptGroup[] = [
  {
    title: "TradeFlux Help",
    icon: MessageSquareText,
    prompts: [
      "How do I view Apple's 29-day forecast?",
      "How do I change my password?",
      "What is TradeFlux?",
      "Who made you?",
    ],
  },
  {
    title: "Predictions",
    icon: Brain,
    prompts: [
      "How do I download prediction reports?",
      "How do I read the AI Predictions graph?",
      "What does forecast confidence mean?",
      "Where can I see agent execution logs?",
    ],
  },
  {
    title: "Market Questions",
    icon: Sparkles,
    prompts: [
      "Explain RSI and how to read overbought signals.",
      "What does a golden cross signal in trading?",
      "Compare MSFT vs NVDA short-term momentum.",
      "Summarize key risks before buying AAPL.",
    ],
  },
];

const CAPABILITIES = [
  "TradeFlux navigation",
  "Forecast workflows",
  "Stock concepts",
  "Report guidance",
];

function createWelcomeMessage(): ChatMessage {
  return {
    id: `welcome-${Date.now()}`,
    role: "assistant",
    content: WELCOME_MESSAGE,
    timestamp: new Date().toISOString(),
  };
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([createWelcomeMessage()]);
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

  const handleResetChat = () => {
    setMessages([createWelcomeMessage()]);
    setInput("");
    setError(null);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="card flex min-h-[11rem] flex-col justify-center">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Groq-powered assistant
            </span>
            <span className="rounded-full border border-gray-700 bg-dark-200/60 px-3 py-1 text-xs text-gray-400">
              TradeFlux project aware
            </span>
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ fontFamily: "Space Grotesk, ui-sans-serif" }}
          >
            TradeFlux Chat
          </h1>
          <p className="mt-3 max-w-4xl text-gray-400">
            Ask about forecasts, dashboard steps, reports, account actions,
            stock indicators, trading terms, or the TradeFlux project itself.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="card flex min-h-[5rem] items-center gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-100">Assistant online</p>
              <p className="text-xs text-gray-500">Ready for TradeFlux guidance</p>
            </div>
          </div>

          <div className="card flex min-h-[5rem] items-center gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-100">Project aware</p>
              <p className="text-xs text-gray-500">
                Forecasts, reports, team, account help
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {CAPABILITIES.map((item) => (
          <div
            key={item}
            className="rounded-lg border border-gray-700/70 bg-dark-200/50 px-4 py-3"
          >
            <p className="text-sm font-medium text-gray-200">{item}</p>
            <p className="mt-1 text-xs text-gray-500">Quick support area</p>
          </div>
        ))}
      </div>

      <div className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="card flex h-[calc(100vh-250px)] min-h-[620px] flex-col overflow-hidden p-0">
          <div className="border-b border-gray-700/50 px-5 py-4">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Bot className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-gray-100">Conversation</h2>
                  <p className="text-xs text-gray-500">
                    Ask naturally, then use the quick panel for shortcuts
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="rounded-lg border border-gray-700/60 bg-dark-200/60 px-3 py-2 text-xs text-gray-400">
                  {messages.length} messages
                </div>
                <button
                  type="button"
                  onClick={handleResetChat}
                  disabled={loading}
                  className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-700/70 bg-dark-200/70 px-3 text-xs font-medium text-gray-300 transition hover:border-primary/50 hover:bg-primary/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  title="Reset chat"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Chat
                </button>
              </div>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 space-y-5 overflow-y-auto bg-dark-100/20 px-4 py-5 sm:px-5"
          >
            {messages.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}
                  <div
                    className={`min-w-0 max-w-[88%] rounded-lg border px-4 py-3 text-[15px] leading-relaxed shadow-sm md:max-w-[76%] ${
                      isUser
                        ? "border-primary/40 bg-primary/15 text-gray-100"
                        : "border-gray-700/70 bg-dark-200/80 text-gray-200"
                    }`}
                  >
                    <ReactMarkdown
                      className="chat-markdown"
                      remarkPlugins={[remarkGfm]}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    <div className="mt-3 text-[10px] uppercase tracking-wide text-gray-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  {isUser && (
                    <div className="mt-1 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-dark-200 text-gray-300">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
                <div>
                  <p className="font-medium text-gray-300">Thinking through your request</p>
                  <p className="text-xs text-gray-500">
                    Preparing a TradeFlux-aware answer
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-700/50 bg-dark-100/60 p-4">
            {error && (
              <div className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_8.5rem] md:items-stretch">
              <textarea
                value={input}
                rows={1}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask how to view AAPL's 29-day forecast, change password, or read an indicator..."
                className="h-14 max-h-32 min-h-14 resize-none rounded-lg border border-gray-700 bg-dark-200/70 px-4 py-4 text-[15px] leading-6 text-gray-100 outline-none transition placeholder:text-gray-500 focus:border-primary focus:ring-1 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="btn-primary inline-flex h-14 items-center justify-center gap-2 px-4 py-0 disabled:cursor-not-allowed disabled:opacity-50"
                title="Send message"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                <span>Send</span>
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Press Enter to send. Use Shift+Enter for a new line.
            </p>
          </div>
        </section>

        <aside className="card flex h-[calc(100vh-250px)] min-h-[620px] flex-col overflow-hidden p-0">
          <div className="border-b border-gray-700/50 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MessageSquareText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-100">Quick Access</h2>
                <p className="text-xs text-gray-500">Common questions and shortcuts</p>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {PROMPT_GROUPS.map((group) => {
              const Icon = group.icon;

              return (
                <div
                  key={group.title}
                  className="rounded-lg border border-gray-700/70 bg-dark-200/45 p-4"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-100">
                      {group.title}
                    </h3>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {group.prompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        disabled={loading}
                        className="w-full rounded-lg border border-gray-700/60 bg-dark-100/50 px-3 py-2.5 text-left text-sm leading-5 text-gray-200 transition hover:border-primary/50 hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

        </aside>
      </div>
    </div>
  );
}
