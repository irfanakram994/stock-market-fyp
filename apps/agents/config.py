"""
Configuration management for TradeFlux Agent Service
Loads environment variables and provides centralized config access
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (parent of apps/agents)
_script_dir = Path(__file__).resolve().parent
_project_root = _script_dir.parent.parent
load_dotenv(_project_root / ".env")

class Config:
    """Central configuration class for all agents"""
    
    # API Keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
    
    # Database
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/TradeFlux")
    
    # Agent Settings
    AGENT_LOG_LEVEL = os.getenv("AGENT_LOG_LEVEL", "INFO")
    AGENT_TIMEOUT = int(os.getenv("AGENT_TIMEOUT", "300"))  # 5 minutes default
    
    # News API Settings
    NEWS_API_BASE_URL = "https://newsapi.org/v2"
    NEWS_FETCH_LIMIT = int(os.getenv("NEWS_FETCH_LIMIT", "100"))
    NEWS_LOOKBACK_DAYS = int(os.getenv("NEWS_LOOKBACK_DAYS", "7"))
    
    # Yahoo Finance Settings
    MARKET_DATA_PERIOD = os.getenv("MARKET_DATA_PERIOD", "1y")  # 1 year default
    MARKET_DATA_INTERVAL = os.getenv("MARKET_DATA_INTERVAL", "1d")  # Daily
    
    # Prophet Settings
    PROPHET_FORECAST_DAYS = int(os.getenv("PROPHET_FORECAST_DAYS", "30"))
    PROPHET_CHANGEPOINT_PRIOR = float(os.getenv("PROPHET_CHANGEPOINT_PRIOR", "0.05"))
    PROPHET_SEASONALITY_MODE = os.getenv("PROPHET_SEASONALITY_MODE", "additive")
    
    # Groq LLM Settings
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-specdec")  # Primary model (newer)
    GROQ_TEMPERATURE = float(os.getenv("GROQ_TEMPERATURE", "0.7"))
    GROQ_MAX_TOKENS = int(os.getenv("GROQ_MAX_TOKENS", "500"))

    # CrewAI LLM Settings (Groq via LiteLLM)
    CREWAI_MODEL = os.getenv("CREWAI_MODEL", f"groq/{GROQ_MODEL}")
    CREWAI_TEMPERATURE = float(os.getenv("CREWAI_TEMPERATURE", str(GROQ_TEMPERATURE)))
    CREWAI_MAX_TOKENS = int(os.getenv("CREWAI_MAX_TOKENS", str(GROQ_MAX_TOKENS)))
    CREWAI_TIMEOUT = int(os.getenv("CREWAI_TIMEOUT", "120"))
    CREWAI_MAX_RETRIES = int(os.getenv("CREWAI_MAX_RETRIES", "2"))
    
    # Sentiment Analysis
    SENTIMENT_THRESHOLD_POSITIVE = float(os.getenv("SENTIMENT_THRESHOLD_POSITIVE", "0.05"))
    SENTIMENT_THRESHOLD_NEGATIVE = float(os.getenv("SENTIMENT_THRESHOLD_NEGATIVE", "-0.05"))
    
    # Output Paths
    OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./output")
    REPORTS_DIR = os.path.join(OUTPUT_DIR, "reports")
    MODELS_DIR = os.path.join(OUTPUT_DIR, "models")
    
    @classmethod
    def validate(cls):
        """Validate required configuration (DB not required for agent-only prediction)"""
        errors = []
        
        if not cls.GROQ_API_KEY:
            errors.append("GROQ_API_KEY is required")
        
        if not cls.NEWS_API_KEY:
            errors.append("NEWS_API_KEY is required")
        
        # DATABASE_URL optional - agents use APIs (Prophet, Groq, News) directly
        
        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")
        
        return True

# Create output directories
os.makedirs(Config.OUTPUT_DIR, exist_ok=True)
os.makedirs(Config.REPORTS_DIR, exist_ok=True)
os.makedirs(Config.MODELS_DIR, exist_ok=True)
