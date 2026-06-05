"""
Configuration management for TradeFlux Agent Service
Loads environment variables and provides centralized config access
Supports multiple LLM providers (OpenAI, Groq, etc.) for flexibility
"""

import os
from dotenv import load_dotenv
from pathlib import Path

# Load .env from project root (parent of apps/agents)
# Use override=True so the project .env takes priority over stale shell environment variables.
_script_dir = Path(__file__).resolve().parent
_project_root = _script_dir.parent.parent
load_dotenv(_project_root / ".env", override=True)

class Config:
    """Central configuration class for all agents"""
    
    # ==================== API Keys ====================
    # LLM Provider API Keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")  # For backwards compatibility
    
    # Other APIs
    NEWS_API_KEY = os.getenv("NEWS_API_KEY", "")
    
    # ==================== Database ====================
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/TradeFlux")
    
    # ==================== Agent Settings ====================
    AGENT_LOG_LEVEL = os.getenv("AGENT_LOG_LEVEL", "INFO")
    AGENT_TIMEOUT = int(os.getenv("AGENT_TIMEOUT", "300"))  # 5 minutes default
    
    # ==================== LLM Provider Configuration ====================
    # Supported providers: "openai", "groq"
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
    
    # OpenAI Settings
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    OPENAI_TEMPERATURE = float(os.getenv("OPENAI_TEMPERATURE", "0.7"))
    OPENAI_MAX_TOKENS = int(os.getenv("OPENAI_MAX_TOKENS", "500"))
    
    # Groq Settings (legacy support)
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    GROQ_TEMPERATURE = float(os.getenv("GROQ_TEMPERATURE", "0.7"))
    GROQ_MAX_TOKENS = int(os.getenv("GROQ_MAX_TOKENS", "500"))

    # CrewAI LLM Settings (auto-configured based on provider)
    # These will be properly initialized after the class definition
    CREWAI_MODEL = None  # Will be set by init_crewai_config()
    CREWAI_TEMPERATURE = None
    CREWAI_MAX_TOKENS = None
    CREWAI_TIMEOUT = int(os.getenv("CREWAI_TIMEOUT", "120"))
    CREWAI_MAX_RETRIES = int(os.getenv("CREWAI_MAX_RETRIES", "2"))
    
    # ==================== News API Settings ====================
    NEWS_API_BASE_URL = "https://newsapi.org/v2"
    NEWS_FETCH_LIMIT = int(os.getenv("NEWS_FETCH_LIMIT", "100"))
    NEWS_LOOKBACK_DAYS = int(os.getenv("NEWS_LOOKBACK_DAYS", "7"))
    
    # ==================== Market Data Settings ====================
    MARKET_DATA_PERIOD = os.getenv("MARKET_DATA_PERIOD", "1y")  # 1 year default
    MARKET_DATA_INTERVAL = os.getenv("MARKET_DATA_INTERVAL", "1d")  # Daily
    
    # ==================== Prophet Settings ====================
    PROPHET_FORECAST_DAYS = int(os.getenv("PROPHET_FORECAST_DAYS", "30"))
    PROPHET_CHANGEPOINT_PRIOR = float(os.getenv("PROPHET_CHANGEPOINT_PRIOR", "0.05"))
    PROPHET_SEASONALITY_MODE = os.getenv("PROPHET_SEASONALITY_MODE", "additive")
    
    # ==================== Sentiment Analysis ====================
    SENTIMENT_THRESHOLD_POSITIVE = float(os.getenv("SENTIMENT_THRESHOLD_POSITIVE", "0.05"))
    SENTIMENT_THRESHOLD_NEGATIVE = float(os.getenv("SENTIMENT_THRESHOLD_NEGATIVE", "-0.05"))
    
    # ==================== Output Paths ====================
    OUTPUT_DIR = os.getenv("OUTPUT_DIR", "./output")
    REPORTS_DIR = os.path.join(OUTPUT_DIR, "reports")
    MODELS_DIR = os.path.join(OUTPUT_DIR, "models")
    
    @classmethod
    def get_llm_api_key(cls):
        """Get the appropriate API key based on selected LLM provider"""
        if cls.LLM_PROVIDER == "openai":
            return cls.OPENAI_API_KEY
        elif cls.LLM_PROVIDER == "groq":
            return cls.GROQ_API_KEY
        return None
    
    @classmethod
    def get_llm_model(cls):
        """Get the appropriate model name based on selected LLM provider"""
        if cls.LLM_PROVIDER == "openai":
            return cls.OPENAI_MODEL
        elif cls.LLM_PROVIDER == "groq":
            return cls.GROQ_MODEL
        return None
    
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        errors = []
        
        # Validate selected LLM provider
        if cls.LLM_PROVIDER not in ["openai", "groq"]:
            errors.append(f"LLM_PROVIDER must be 'openai' or 'groq', got: {cls.LLM_PROVIDER}")
        
        # Validate API key for selected provider
        if cls.LLM_PROVIDER == "openai":
            if not cls.OPENAI_API_KEY:
                errors.append("OPENAI_API_KEY is required when LLM_PROVIDER=openai")
        elif cls.LLM_PROVIDER == "groq":
            if not cls.GROQ_API_KEY:
                errors.append("GROQ_API_KEY is required when LLM_PROVIDER=groq")
        
        if not cls.NEWS_API_KEY:
            errors.append("NEWS_API_KEY is required")
        
        if errors:
            raise ValueError(f"Configuration errors: {'; '.join(errors)}")
        
        # Initialize CrewAI config based on selected provider
        cls._init_crewai_config()
        
        return True
    
    @classmethod
    def _init_crewai_config(cls):
        """Initialize CrewAI configuration based on selected LLM provider"""
        if cls.LLM_PROVIDER == "openai":
            cls.CREWAI_MODEL = os.getenv("CREWAI_MODEL", f"openai/{cls.OPENAI_MODEL}")
            cls.CREWAI_TEMPERATURE = float(os.getenv("CREWAI_TEMPERATURE", str(cls.OPENAI_TEMPERATURE)))
            cls.CREWAI_MAX_TOKENS = int(os.getenv("CREWAI_MAX_TOKENS", str(cls.OPENAI_MAX_TOKENS)))
        else:  # groq
            cls.CREWAI_MODEL = os.getenv("CREWAI_MODEL", f"groq/{cls.GROQ_MODEL}")
            cls.CREWAI_TEMPERATURE = float(os.getenv("CREWAI_TEMPERATURE", str(cls.GROQ_TEMPERATURE)))
            cls.CREWAI_MAX_TOKENS = int(os.getenv("CREWAI_MAX_TOKENS", str(cls.GROQ_MAX_TOKENS)))

# Create output directories
os.makedirs(Config.OUTPUT_DIR, exist_ok=True)
os.makedirs(Config.REPORTS_DIR, exist_ok=True)
os.makedirs(Config.MODELS_DIR, exist_ok=True)
