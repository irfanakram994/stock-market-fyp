from crewai import LLM

from config import Config


def build_llm() -> LLM:
    api_key = Config.GROQ_API_KEY if Config.CREWAI_MODEL.startswith("groq/") else None
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
