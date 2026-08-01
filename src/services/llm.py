from langchain_openai import ChatOpenAI

from src.config import get_settings


def get_llm(model_name: str | None = None, temperature: float | None = None) -> ChatOpenAI:
    """Get initialized ChatOpenAI instance using gpt-4o-mini API."""
    settings = get_settings()
    api_key = settings.openai_api_key or "sk-dummy-key-for-test"
    
    return ChatOpenAI(
        model=model_name or settings.model_name,
        api_key=api_key,
        temperature=temperature if temperature is not None else settings.llm_temperature,
    )
