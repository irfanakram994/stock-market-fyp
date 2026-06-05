# TradeFlux System Architecture

## Overview

TradeFlux is a production-grade Agentic AI Stock Market Prediction System that combines multi-agent architecture, machine learning forecasting, and real-time data analysis to provide accurate stock market predictions.

## System Components

### 1. Frontend Layer (Next.js 14)

**Technology**: Next.js 14 with App Router, TypeScript, Tailwind CSS

**Components**:

- Landing Page: Marketing page with hero section and feature showcase
- Dashboard: Main application interface with sidebar navigation
- Stock Analysis: Real-time stock data with technical indicators
- AI Predictions: Prophet-based forecasting interface
- Backtesting: Historical strategy testing
- Visualizations: Advanced charts and comparisons
- Agent Logs: Real-time agent execution monitoring

**Key Features**:

- Server-side rendering for optimal performance
- Responsive design with dark theme
- Interactive charts using Recharts
- Real-time updates via API polling

### 2. Backend API Layer (Next.js API Routes)

**Technology**: Next.js API Routes (REST)

**Endpoints**:

- `/api/stocks` - Stock management (GET, POST)
- `/api/predictions` - Prediction management (GET, POST)
- `/api/news` - News retrieval with sentiment (GET)
- `/api/agents/run` - Agent execution (POST, GET)
- `/api/backtesting` - Backtesting operations (POST, GET)

**Responsibilities**:

- Request validation and authentication
- Database operations via Prisma
- Python agent orchestration
- Response formatting and error handling

### 3. Database Layer (PostgreSQL + Prisma)

**Technology**: PostgreSQL with Prisma ORM

**Models**:

- **User**: User authentication and profiles
- **Stock**: Stock symbols and metadata
- **News**: News articles with source information
- **Sentiment**: Sentiment scores linked to news
- **Prediction**: Prophet forecasts with confidence intervals
- **AgentLog**: Agent execution logs for debugging
- **BacktestResult**: Backtesting performance metrics

**Features**:

- Type-safe database access
- Automatic migrations
- Relationship management
- Query optimization

### 4. AI Agent Layer (Python)

**Technology**: Python 3.11+, CrewAI, Prophet, VADER, Multi-provider LLM support (OpenAI, Groq)

**CrewAI Agents (Tools + Services)**:

1. **News Fetcher**
   - Fetches news from News API
   - Filters by stock symbol and date range
   - Returns structured news data

2. **Sentiment Analyst**
   - Analyzes sentiment using VADER
   - Processes news text
   - Generates sentiment scores (-1 to 1)

3. **Market Data Specialist**
   - Retrieves OHLCV data from Yahoo Finance
   - Calculates technical indicators
   - Provides company information

4. **Data Preprocessor**
   - Merges sentiment and market data
   - Handles missing values
   - Prepares data for Prophet

5. **Forecasting Specialist**
   - Trains Prophet model
   - Generates forecasts with confidence intervals
   - Determines trend direction

6. **Insight Analyst**
   - Uses configurable LLM provider (OpenAI recommended, Groq fallback)
   - Converts predictions to human-readable text
   - Provides actionable recommendations
   - Graceful degradation with local insight generation if LLM unavailable

7. **Report Generator**
   - Generates JSON reports
   - Aggregates prediction results
   - Creates summary statistics

**Orchestration**:

- CrewAI sequential crew with explicit tasks and tools
- Deterministic service layer invoked by CrewAI tools
- Centralized error handling and logging
- Result persistence for reports

### 5. External Services

**Data Sources**:

- **Yahoo Finance**: Historical and real-time market data
- **News API**: News articles from trusted sources
- **LLM API**: LLM-powered insights (OpenAI gpt-4o-mini recommended, Groq fallback)

## Data Flow

```
User Request (Frontend)
    ↓
Next.js API Route
    ↓
    ├─→ Database (Prisma) ─→ Return cached data
    │
    └─→ Python Agent Service
            ↓
        Agent Orchestrator
            ↓
        ├─→ NewsFetcherAgent ─→ News API
        ├─→ MarketDataAgent ─→ Yahoo Finance
        ├─→ InsightGeneratorAgent ─→ VADER
        ├─→ PreprocessingAgent
        ├─→ PredictionAgent ─→ Prophet
        ├─→ LLMSummarizerAgent ─→ OpenAI/Groq API (configurable)
        └─→ ReportAgent
            ↓
        Save to Database
            ↓
        Return to Frontend
```

## Prediction Workflow

1. **Data Collection**
   - Fetch historical price data (1 year)
   - Retrieve recent news (7 days)

2. **Sentiment Analysis**
   - Analyze news sentiment
   - Calculate aggregated sentiment score

3. **Data Preprocessing**
   - Merge price and sentiment data
   - Handle missing values
   - Feature engineering

4. **Forecasting**
   - Train Prophet model
   - Generate 30-day forecast
   - Calculate confidence intervals

5. **Insight Generation**
   - Use configured LLM provider (OpenAI or Groq) for human insights
   - Determine trend and risks
   - Fall back to deterministic generation if LLM provider unavailable

6. **Persistence**
   - Save predictions to database
   - Log agent execution
   - Generate reports

## Security Considerations

- API key management via environment variables
- Input validation on all endpoints
- SQL injection prevention via Prisma
- Rate limiting on external API calls
- Error message sanitization

## Scalability

- Stateless agent design for horizontal scaling
- Database connection pooling
- Async agent execution
- Caching for frequently accessed data
- CDN for static assets

## Monitoring & Logging

- Agent execution logs in database
- Error tracking and alerting
- Performance metrics
- User activity logging

## Future Enhancements

- Real-time WebSocket updates
- Multi-model ensemble predictions
- Advanced backtesting strategies
- User authentication and portfolios
- Mobile application
- Email/SMS alerts
