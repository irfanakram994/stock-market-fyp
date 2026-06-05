# TradeFlux

TradeFlux is an agentic AI stock market prediction system built as a Final Year Project. It combines a Next.js frontend, API routes, a PostgreSQL/Prisma data layer, and a Python agent service to analyze market data, generate forecasts, and present results in a dashboard.

## Overview

The application is organized around three core layers:

- A Next.js App Router frontend for the landing page, dashboard, admin panel, and super-admin panel.
- A REST-style API layer built with Next.js route handlers for stocks, predictions, news, backtesting, notifications, authentication, and agent execution.
- A Python agent service in `apps/agents` that orchestrates market data collection, preprocessing, forecasting, and report generation.

## Current Architecture

### Frontend

- Next.js 14 with the App Router
- TypeScript
- Tailwind CSS
- Recharts for charts and visualizations
- Role-based UI surfaces for dashboard, admin, and super-admin workflows

### Backend API

- Next.js API routes under `app/api`
- Authentication and access control helpers in `lib`
- Supabase client support where needed
- Prisma for database access

### Data Layer

- PostgreSQL as the main database
- Prisma schema and migrations in `prisma/`
- Cached or generated outputs stored under `output/`

### Python Agent Service

- Python service in `apps/agents`
- **Multi-provider LLM support**: OpenAI (gpt-4o-mini recommended), Groq, or other LiteLLM-supported providers
- CrewAI-based orchestration
- Deterministic service modules for market data, sentiment, preprocessing, predictions, and reporting
- CLI entry points for running individual workflows during development
- Flexible configuration system for easy model/provider switching

## Key Features

- Stock analysis dashboards with technical indicators
- Prediction workflows for future price movement and trend analysis
- News-driven sentiment processing
- Backtesting and performance review
- Agent execution logs and monitoring
- Admin and super-admin management interfaces

## Repository Structure

```text
tradeflux/
├── app/                 # Next.js app routes, pages, layouts, and API handlers
├── apps/
│   └── agents/          # Python agent service and workflow orchestration
├── components/         # Shared React components
├── docs/               # Architecture and project documentation
├── lib/                # Shared frontend/server utilities
├── output/             # Generated reports and model artifacts
├── prisma/             # Prisma schema and migrations
├── public/             # Static assets
├── middleware.ts       # Route middleware
├── package.json        # Next.js scripts and dependencies
└── README.md
```

## Important Routes

- `/` landing page
- `/dashboard` main analytics dashboard
- `/admin` admin portal
- `/super-admin` system administration portal
- `/api/stocks` stock data endpoints
- `/api/predictions` prediction endpoints
- `/api/news` news and sentiment endpoints
- `/api/backtesting` backtesting endpoints
- `/api/agents` agent orchestration endpoints
- `/api/agents/run` run-status and execution endpoint

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL database

### Install dependencies

```bash
npm install
cd apps/agents
pip install -r requirements.txt
cd ../..
```

### Environment variables

Create a `.env` file in the project root. You can copy from `.env.example`:

```bash
cp .env.example .env
```

Then update with your actual API keys:

```env
# ===============================================================================
# LLM PROVIDER CONFIGURATION
# ===============================================================================
# Select your LLM provider: "openai" or "groq"
LLM_PROVIDER=openai

# OpenAI Configuration
# Get your API key from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
OPENAI_TEMPERATURE=0.7
OPENAI_MAX_TOKENS=500

# Groq Configuration (Legacy/Fallback)
# Get your API key from: https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant
GROQ_TEMPERATURE=0.7
GROQ_MAX_TOKENS=500

# CrewAI LLM Settings (auto-configured based on LLM_PROVIDER)
CREWAI_MODEL=openai/gpt-4o-mini
CREWAI_TEMPERATURE=0.7
CREWAI_MAX_TOKENS=500
CREWAI_TIMEOUT=120
CREWAI_MAX_RETRIES=2

# News API
NEWS_API_KEY="your_news_api_key"

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/tradeflux?schema=public"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Agent Service
AGENT_SERVICE_URL="http://localhost:8000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

#### Switching LLM Providers

To switch between LLM providers, simply change the `LLM_PROVIDER` environment variable:

- **For OpenAI**: Set `LLM_PROVIDER=openai` (recommended - using gpt-4o-mini)
- **For Groq**: Set `LLM_PROVIDER=groq`

The configuration system will automatically use the correct API key and model settings based on your selection.

### Database setup

```bash
npm run db:generate
npm run db:push
npm run db:studio
```

### Run locally

```bash
npm run dev
```

## Python Agents

The agent service is structured around a workflow that:

1. Fetches stock and news data.
2. Processes sentiment and technical indicators.
3. Generates forecasts and insights.
4. Saves or exports reports for later review.

Run the service from `apps/agents` using the scripts in that directory, or invoke the CLI entry point directly during development.

## Notes

- Generated artifacts under `output/` should not be committed unless they are intentionally part of the project history.
- Large binary exports and archives should remain out of Git history to avoid push failures.

## License

This project is for educational use as a Final Year Project.

## Authors

### 1. Irfan Ali 2. Zainab Mazhar 3. Syed Mohsin Taseer Naqvi
