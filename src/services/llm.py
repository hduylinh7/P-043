import os
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI

from src.config import get_settings


def get_llm(
    model_name: str | None = None,
    temperature: float | None = None,
    provider: str | None = None,
) -> BaseChatModel:
    """Get initialized LLM instance based on configuration or provider argument."""
    settings = get_settings()
    llm_provider = (provider or settings.llm_provider or "openai").lower()
    temp = temperature if temperature is not None else settings.llm_temperature

    if llm_provider in ("openrouter", "open_router"):
        api_key = (
            settings.openrouter_api_key
            or os.getenv("OPENROUTER_API_KEY")
            or "dummy-key-for-test"
        )
        target_model = model_name or settings.model_name or "google/gemini-2.5-flash"
        return ChatOpenAI(
            model=target_model,
            api_key=api_key,
            base_url=settings.openrouter_base_url or "https://openrouter.ai/api/v1",
            temperature=temp,
            max_tokens=2000,
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "AI20K Learning Companion",
            },
        )

    if llm_provider in ("gemini", "google"):
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI

            api_key = (
                settings.gemini_api_key
                or settings.google_api_key
                or os.getenv("GEMINI_API_KEY")
                or os.getenv("GOOGLE_API_KEY")
                or "dummy-key-for-test"
            )
            g_model = model_name or settings.model_name or "gemini-3.6-flash"

            return ChatGoogleGenerativeAI(
                model=g_model,
                google_api_key=api_key,
                temperature=temp,
            )
        except Exception:
            # Fallback to ChatOpenAI if ChatGoogleGenerativeAI initialization fails
            pass

    # Default to ChatOpenAI
    api_key = settings.openai_api_key or "sk-dummy-key-for-test"
    return ChatOpenAI(
        model=model_name or settings.model_name,
        api_key=api_key,
        temperature=temp,
    )

