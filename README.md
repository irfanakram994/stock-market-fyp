<<<<<<< HEAD
# TradeFlux - Agentic AI Stock Market Prediction System

Production-grade stock market prediction system powered by multi-agent AI, Prophet forecasting, and real-time sentiment analysis.

## 🚀 Features

- **7 Specialized AI Agents**: NewsFetcher, InsightGenerator, MarketData, Preprocessing, Prediction, LLMSummarizer, Report
- **Prophet Forecasting**: Industry-leading time series prediction with confidence intervals
- **Sentiment Analysis**: VADER + Groq LLM-powered news sentiment analysis
- **Real-time Data**: Live market data from Yahoo Finance
- **Technical Indicators**: RSI, MACD, Bollinger Bands, Moving Averages
- **Backtesting**: Validate trading strategies with historical data
- **Modern UI**: Next.js 14 with dark theme and responsive design

## 📋 Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Recharts

### Backend
- Next.js API Routes
- PostgreSQL
- Prisma ORM

### AI/ML (Python)
- CrewAI (Agent Framework)
- Facebook Prophet
- VADER Sentiment
- Groq LLM
- Yahoo Finance API
- News API

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- Python 3.11+
- PostgreSQL database

### 1. Clone and Install Dependencies

```bash
cd c:/Users/Ultron/Documents/FYP

# Install Node.js dependencies
npm install

# Install Python dependencies
cd apps/agents
pip install -r requirements.txt
cd ../..
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/TradeFlux?schema=public"

# API Keys
GROQ_API_KEY="your_groq_api_key_here"
NEWS_API_KEY="your_news_api_key_here"

# CrewAI (Groq via LiteLLM)
CREWAI_MODEL="groq/llama-3.3-70b-specdec"

# Python Agent Service
AGENT_SERVICE_URL="http://localhost:8000"

# Next.js
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Open Prisma Studio
npx prisma studio
```

### 4. Run the Application

```bash
# Development mode
npm run dev

# The app will be available at http://localhost:3000
```

### 5. Test Python Agents

```bash
cd apps/agents

# Test individual agents
python main.py --agent news --symbol AAPL
python main.py --agent market --symbol AAPL
python main.py --agent prediction --symbol AAPL --days 30

# Run full prediction workflow
python main.py --agent full --symbol AAPL --days 30
```

## 📁 Project Structure

```
TradeFlux/
├── apps/
│   ├── web/                    # Next.js Frontend
│   │   ├── app/
│   │   │   ├── page.tsx       # Landing page
│   │   │   ├── dashboard/     # Dashboard pages
│   │   │   └── api/           # API routes
│   │   ├── components/        # React components
│   │   └── lib/               # Utilities
│   │
│   └── agents/                # Python Agents (CrewAI)
│       ├── crew/              # CrewAI agents, tasks, tools, orchestrator
│       ├── services/          # Deterministic service layer
│       ├── utils/             # Utilities
│       ├── main.py            # CLI entry point
│       └── config.py          # Configuration
│
├── prisma/
│   └── schema.prisma          # Database schema
│
├── package.json
├── tsconfig.json
└── README.md
```

## 🤖 AI Agents

1. **NewsFetcherAgent**: Fetches news articles from News API
2. **InsightGeneratorAgent**: Analyzes sentiment using VADER
3. **MarketDataAgent**: Retrieves historical OHLCV data
4. **PreprocessingAgent**: Merges and cleans data
5. **PredictionAgent**: Generates forecasts using Prophet
6. **LLMSummarizerAgent**: Creates human-readable insights
7. **ReportAgent**: Generates JSON/CSV/PDF reports

## 📊 API Endpoints

- `GET /api/stocks` - List all stocks
- `POST /api/stocks` - Add new stock
- `GET /api/predictions` - Get predictions
- `POST /api/predictions` - Create prediction
- `GET /api/news` - Fetch news with sentiment
- `POST /api/agents/run` - Execute Python agents
- `GET /api/agents/run?jobId=xxx` - Check agent status

## 🎯 Usage

1. **Landing Page**: Visit http://localhost:3000
2. **Dashboard**: Click "Try Demo" to access the dashboard
3. **Stock Analysis**: Search for a stock symbol to view charts and indicators
4. **AI Predictions**: Generate forecasts for any stock
5. **Backtesting**: Test trading strategies with historical data
6. **Agent Logs**: Monitor AI agent execution

## 🔑 API Keys

### Groq API
1. Visit https://console.groq.com
2. Create an account and generate an API key
3. Add to `.env` as `GROQ_API_KEY`

### News API
1. Visit https://newsapi.org
2. Sign up for a free account
3. Get your API key
4. Add to `.env` as `NEWS_API_KEY`

## 📝 License

This project is for educational purposes (Final Year Project).

## 👨‍💻 Author

Built with ❤️ using Next.js, Python, and AI
=======
## Agentic AI for Stock Market Prediction

This project implements an autonomous AI-driven system designed to analyze stock market data and predict future price movements. 
By combining machine learning models with agent-based decision-making, the system is capable of collecting market data, processing technical indicators,
and generating intelligent predictions such as price direction and trading signals.

The project focuses on applying AI techniques to financial forecasting while demonstrating the concept of agentic behavior, 
where the system independently perceives data, reasons over predictions, and makes decisions. 
It also includes data visualization and performance evaluation through backtesting to assess prediction accuracy.

This repository is developed as a Final Year Project (FYP) and serves as a foundation for research-oriented and real-world financial AI applications.

📈 Stock price prediction (Up/Down or price value)

🤖 Autonomous AI agent architecture

📊 Technical indicators (RSI, MACD, SMA)

🧪 Backtesting and evaluation metrics

📉 Data visualization dashboard

🧠 Machine Learning / Deep Learning models


>>>>>>> f37a54cc33abd92fe8028b1c145dff7256ef54be
