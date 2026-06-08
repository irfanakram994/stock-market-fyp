"use client";

import {
  Brain,
  Code,
  Database,
  LineChart,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";

const techStack = [
  {
    title: "Frontend",
    items: ["Next.js 14 (App Router)", "TypeScript", "Tailwind CSS", "Recharts"],
  },
  {
    title: "Backend",
    items: ["Next.js API Routes", "PostgreSQL", "Prisma ORM", "Supabase auth"],
  },
  {
    title: "AI/ML",
    items: [
      "Python 3.11+",
      "CrewAI and legacy agent runner",
      "Prophet forecasting",
      "VADER sentiment analysis",
      "Groq LLM with OpenAI-compatible support",
    ],
  },
  {
    title: "Data Sources",
    items: ["Yahoo Finance", "News API", "Stored prediction history"],
  },
];

const teamMembers = [
  { name: "Irfan Ali", rollNo: "22011519-029" },
  { name: "Zainab Mazhar", rollNo: "22011519-043" },
  { name: "Syed Mohsin Taseer Naqvi", rollNo: "22011519-067" },
];

const agents = [
  { name: "NewsFetcherAgent", desc: "Fetches relevant market news from News API." },
  { name: "InsightGeneratorAgent", desc: "Analyzes news sentiment with VADER." },
  { name: "MarketDataAgent", desc: "Loads historical OHLCV data from Yahoo Finance." },
  { name: "PreprocessingAgent", desc: "Merges, cleans, and prepares model inputs." },
  { name: "PredictionAgent", desc: "Generates Prophet-based price forecasts." },
  { name: "LLMSummarizerAgent", desc: "Turns forecast outputs into readable insights." },
  { name: "ReportAgent", desc: "Packages prediction results for reports and exports." },
];

const features = [
  {
    icon: TrendingUp,
    title: "AI Predictions",
    desc: "Prophet forecasting with confidence intervals and charted forecast horizons.",
  },
  {
    icon: Brain,
    title: "Sentiment Analysis",
    desc: "Recent news sentiment is processed and folded into market insights.",
  },
  {
    icon: Database,
    title: "Historical Data",
    desc: "Market data and generated predictions are saved for review and export.",
  },
  {
    icon: Zap,
    title: "Live Workflows",
    desc: "Dashboard actions run agents, show progress, and refresh saved results.",
  },
  {
    icon: Code,
    title: "Production Stack",
    desc: "Next.js, TypeScript, Python services, API routes, and Prisma work together.",
  },
  {
    icon: Shield,
    title: "Operational Visibility",
    desc: "Agent logs and guarded APIs help track execution and failures.",
  },
];

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">About TradeFlux</h1>
        <p className="max-w-3xl text-gray-400">
          Production-grade Agentic AI Stock Market Prediction System for
          forecasts, sentiment analysis, visualizations, backtesting, and
          explainable dashboard insights.
        </p>
      </div>

      <section className="card">
        <h2 className="text-xl font-bold">System Overview</h2>
        <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4 text-gray-300">
            <p className="leading-relaxed">
              TradeFlux helps users analyze stocks through market data,
              AI-generated forecasts, news sentiment, and human-readable model
              insights. It combines a modern dashboard with a Python agent
              pipeline so prediction runs can be tracked, reviewed, and exported.
            </p>
            <p className="leading-relaxed">
              The current setup is configured around Groq-powered LLM responses,
              with OpenAI-compatible settings available in the project
              configuration.
            </p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/10 p-4">
            <div className="flex items-center gap-2 text-primary">
              <LineChart className="h-5 w-5" />
              <h3 className="font-semibold">Core Purpose</h3>
            </div>
            <p className="mt-3 text-sm leading-6 text-gray-300">
              Make forecasting workflows easier to run, inspect, explain, and
              present from one TradeFlux dashboard.
            </p>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">TradeFlux Team</h2>
            <p className="text-sm text-gray-400">
              Final Year Project team members
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {teamMembers.map((member) => (
            <div
              key={member.rollNo}
              className="rounded-lg border border-gray-700/70 bg-dark-200/60 p-4"
            >
              <p className="font-semibold text-gray-100">{member.name}</p>
              <p className="mt-1 text-sm text-primary">{member.rollNo}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold">Technology Stack</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {techStack.map((group) => (
            <div key={group.title}>
              <h3 className="mb-3 font-bold text-primary">{group.title}</h3>
              <ul className="space-y-2 text-gray-300">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold">AI Agent System</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <div key={agent.name} className="rounded-lg bg-dark-200 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="font-bold">{agent.name}</h3>
              </div>
              <p className="text-sm leading-6 text-gray-400">{agent.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold">Key Features</h2>
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div key={feature.title} className="flex items-start gap-4">
                <div className="flex-shrink-0 rounded-lg bg-primary/10 p-3 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="mb-1 font-bold">{feature.title}</h3>
                  <p className="text-sm leading-6 text-gray-400">{feature.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2 className="text-xl font-bold">System Architecture</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-4">
          {[
            "Next.js Dashboard",
            "API Routes",
            "PostgreSQL + Prisma",
            "Python Agent Pipeline",
          ].map((step, index) => (
            <div
              key={step}
              className="rounded-lg border border-gray-700/70 bg-dark-200/60 p-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Layer {index + 1}
              </p>
              <p className="mt-2 font-semibold text-gray-100">{step}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
