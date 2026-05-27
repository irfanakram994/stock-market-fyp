'use client';

import { Brain, Database, TrendingUp, Zap, Code, Shield } from 'lucide-react';

export default function AboutPage() {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold mb-2">About TradeFlux</h1>
                <p className="text-gray-400">Production-grade Agentic AI Stock Market Prediction System</p>
            </div>

            {/* Overview */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">System Overview</h2>
                <p className="text-gray-300 leading-relaxed mb-4">
                    TradeFlux is a cutting-edge stock market prediction system that leverages multi-agent AI architecture,
                    Prophet forecasting, and real-time sentiment analysis to provide accurate market predictions and actionable insights.
                </p>
                <p className="text-gray-300 leading-relaxed">
                    Built with Next.js 14, Python, PostgreSQL, and powered by CrewAI, Prophet, and Groq LLM,
                    this system represents the future of AI-driven financial analysis.
                </p>
            </div>

            {/* Tech Stack */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Technology Stack</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="font-bold text-primary mb-3">Frontend</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li>• Next.js 14 (App Router)</li>
                            <li>• TypeScript</li>
                            <li>• Tailwind CSS</li>
                            <li>• Recharts</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary mb-3">Backend</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li>• Next.js API Routes</li>
                            <li>• PostgreSQL</li>
                            <li>• Prisma ORM</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary mb-3">AI/ML</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li>• Python 3.11+</li>
                            <li>• CrewAI (Agent Framework)</li>
                            <li>• Facebook Prophet</li>
                            <li>• VADER Sentiment</li>
                            <li>• Groq LLM</li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="font-bold text-primary mb-3">Data Sources</h3>
                        <ul className="space-y-2 text-gray-300">
                            <li>• Yahoo Finance</li>
                            <li>• News API</li>
                            <li>• Real-time Market Data</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* AI Agents */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">AI Agent System</h2>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { name: 'NewsFetcherAgent', desc: 'Fetches news from News API' },
                        { name: 'InsightGeneratorAgent', desc: 'Sentiment analysis with VADER' },
                        { name: 'MarketDataAgent', desc: 'Historical OHLCV from Yahoo Finance' },
                        { name: 'PreprocessingAgent', desc: 'Data merging and cleaning' },
                        { name: 'PredictionAgent', desc: 'Prophet-based forecasting' },
                        { name: 'LLMSummarizerAgent', desc: 'Human insights via Groq' },
                        { name: 'ReportAgent', desc: 'Generate JSON/CSV/PDF reports' },
                    ].map((agent, idx) => (
                        <div key={idx} className="p-4 bg-dark-200 rounded-lg">
                            <div className="flex items-center space-x-2 mb-2">
                                <Brain className="w-5 h-5 text-primary" />
                                <h3 className="font-bold">{agent.name}</h3>
                            </div>
                            <p className="text-sm text-gray-400">{agent.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Features */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">Key Features</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {[
                        { icon: <TrendingUp />, title: 'AI Predictions', desc: 'Prophet forecasting with confidence intervals' },
                        { icon: <Brain />, title: 'Sentiment Analysis', desc: 'Real-time news sentiment using VADER + LLM' },
                        { icon: <Database />, title: 'Historical Data', desc: 'Comprehensive market data with technical indicators' },
                        { icon: <Zap />, title: 'Real-time Updates', desc: 'Live market data and agent execution' },
                        { icon: <Code />, title: 'Production Ready', desc: 'Clean architecture with TypeScript and Python' },
                        { icon: <Shield />, title: 'Reliable', desc: 'Error handling and logging throughout' },
                    ].map((feature, idx) => (
                        <div key={idx} className="flex items-start space-x-4">
                            <div className="p-3 bg-primary/10 rounded-lg text-primary flex-shrink-0">
                                {feature.icon}
                            </div>
                            <div>
                                <h3 className="font-bold mb-1">{feature.title}</h3>
                                <p className="text-sm text-gray-400">{feature.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Architecture */}
            <div className="card">
                <h2 className="text-xl font-bold mb-4">System Architecture</h2>
                <div className="p-6 bg-dark-200 rounded-lg">
                    <pre className="text-sm text-gray-300 overflow-x-auto">
                        {`┌─────────────────────────────────────────────────────┐
│              Next.js Frontend (UI)                  │
│  Landing Page | Dashboard | Charts | Visualizations │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│           Next.js API Routes (REST)                 │
│   /api/stocks | /api/predictions | /api/agents     │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│  PostgreSQL DB   │      │  Python Agents   │
│  (Prisma ORM)    │      │   (CrewAI)       │
└──────────────────┘      └──────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌─────────┐    ┌─────────┐   ┌─────────┐
              │ Prophet │    │  VADER  │   │  Groq   │
              │Forecast │    │Sentiment│   │   LLM   │
              └─────────┘    └─────────┘   └─────────┘`}
                    </pre>
                </div>
            </div>
        </div>
    );
}
