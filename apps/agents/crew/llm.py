from crewai import LLM
import os
from config import Config


def build_llm() -> LLM:
    """Build LLM instance based on configured provider (OpenAI or Groq)"""
    
    # Ensure CrewAI config is initialized even if validate() was not called explicitly.
    if Config.CREWAI_MODEL is None:
        Config._init_crewai_config()

    # Determine API key based on provider
    if Config.CREWAI_MODEL.startswith("openai/"):
        api_key = Config.OPENAI_API_KEY
    elif Config.CREWAI_MODEL.startswith("groq/"):
        api_key = Config.GROQ_API_KEY
    else:
        api_key = Config.get_llm_api_key()

    print(f"[Config] LLM_PROVIDER={Config.LLM_PROVIDER}, CREWAI_MODEL={Config.CREWAI_MODEL}, api_key_set={bool(api_key)}")
    
    # Subclass LLM to disable provider-side function calling support so
    # the Crew runtime does local tool handling instead of sending tool
    # schemas to the external provider which may reject them.
    class NoFuncLLM(LLM):
        def supports_function_calling(self) -> bool:  # type: ignore[override]
            return False

    return NoFuncLLM(
        model=Config.CREWAI_MODEL,
        api_key=api_key,
        temperature=Config.CREWAI_TEMPERATURE,
        max_tokens=Config.CREWAI_MAX_TOKENS,
        timeout=Config.CREWAI_TIMEOUT,
        max_retries=Config.CREWAI_MAX_RETRIES,
    )
