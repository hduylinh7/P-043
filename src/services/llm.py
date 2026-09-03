import asyncio
import logging
import os
import threading
from typing import Any, AsyncIterator, Iterator, List, Optional

import httpx

from langchain_core.callbacks.manager import (
    AsyncCallbackManagerForLLMRun,
    CallbackManagerForLLMRun,
)
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatGenerationChunk, ChatResult
from langchain_openai import ChatOpenAI
from pydantic import Field, PrivateAttr

from src.config import get_settings

logger = logging.getLogger(__name__)


class GroqKeyManager:
    """Manages Groq API keys with thread-safe rotation when quota/rate limits are hit."""

    def __init__(self) -> None:
        self._active_index: int = 0
        self._lock = threading.Lock()

    def get_keys(self) -> list[tuple[str, str]]:
        settings = get_settings()
        keys = settings.get_groq_api_keys()
        if not keys:
            return [("GROQ_API_KEY", "dummy-key-for-test")]
        return keys

    def get_current_key(self) -> tuple[int, str, str]:
        keys = self.get_keys()
        with self._lock:
            idx = self._active_index % len(keys)
            name, val = keys[idx]
            return idx, name, val

    def rotate_key(self, failed_index: int, error_reason: str = "") -> tuple[int, str, str]:
        keys = self.get_keys()
        if len(keys) <= 1:
            idx = 0
            name, val = keys[0]
            return idx, name, val

        with self._lock:
            old_idx = self._active_index % len(keys)
            old_name, _ = keys[old_idx]
            # Advance key index if current active matches the failing one
            if (self._active_index % len(keys)) == (failed_index % len(keys)):
                self._active_index = (self._active_index + 1) % len(keys)
            new_idx = self._active_index % len(keys)
            new_name, new_val = keys[new_idx]

            # Log only the key name (e.g. GROQ_API_KEY_1 -> GROQ_API_KEY_2), never the secret token
            reason_msg = f" ({error_reason[:80]})" if error_reason else ""
            logger.warning(
                f"[Groq Key Rotation] {old_name} gặp sự cố quota/rate limit{reason_msg}. "
                f"Tự động chuyển sang {new_name}."
            )
            return new_idx, new_name, new_val

    def switch_key_by_name(self, key_name: str) -> tuple[int, str, str] | None:
        """Manually switch active key to a specific key name."""
        keys = self.get_keys()
        for i, (name, val) in enumerate(keys):
            if name.lower() == key_name.lower():
                with self._lock:
                    self._active_index = i
                logger.info(f"[Groq Key Rotation] Đã chủ động chuyển key sang {name}.")
                return i, name, val
        return None

    async def check_key_quota(self, api_key: str, model_name: str | None = None) -> dict[str, Any]:
        """Fetch live remaining rate-limit/quota info from Groq for a given key."""
        if not api_key or api_key == "dummy-key-for-test" or api_key.startswith("gsk_your"):
            return {"status": "unconfigured"}

        settings = get_settings()
        target_model = model_name or settings.model_name or "openai/gpt-oss-120b"
        if "gemini" in target_model:
            target_model = "openai/gpt-oss-120b"

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": target_model,
            "messages": [{"role": "user", "content": "ping"}],
            "max_tokens": 1,
        }

        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(url, headers=headers, json=payload)

                limit_tokens = res.headers.get("x-ratelimit-limit-tokens")
                remaining_tokens = res.headers.get("x-ratelimit-remaining-tokens")
                reset_tokens = res.headers.get("x-ratelimit-reset-tokens")
                limit_requests = res.headers.get("x-ratelimit-limit-requests")
                remaining_requests = res.headers.get("x-ratelimit-remaining-requests")
                reset_requests = res.headers.get("x-ratelimit-reset-requests")

                if res.status_code == 200:
                    return {
                        "status": "healthy",
                        "remaining_tokens": int(remaining_tokens) if remaining_tokens and remaining_tokens.isdigit() else remaining_tokens,
                        "limit_tokens": int(limit_tokens) if limit_tokens and limit_tokens.isdigit() else limit_tokens,
                        "remaining_requests": int(remaining_requests) if remaining_requests and remaining_requests.isdigit() else remaining_requests,
                        "limit_requests": int(limit_requests) if limit_requests and limit_requests.isdigit() else limit_requests,
                        "reset_tokens_in": reset_tokens or "0s",
                        "reset_requests_in": reset_requests or "0s",
                    }
                elif res.status_code == 429:
                    return {
                        "status": "rate_limited",
                        "error": "Quota or rate limit reached",
                        "remaining_tokens": 0,
                        "limit_tokens": int(limit_tokens) if limit_tokens and limit_tokens.isdigit() else limit_tokens,
                        "reset_tokens_in": reset_tokens or "N/A",
                        "reset_requests_in": reset_requests or "N/A",
                    }
                elif res.status_code == 401:
                    return {
                        "status": "invalid_api_key",
                        "error": "API Key không hợp lệ hoặc đã hết hạn",
                    }
                else:
                    return {
                        "status": f"http_{res.status_code}",
                        "error": res.text[:120],
                    }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
            }

    async def get_status_info(self) -> dict[str, Any]:
        """Return human-readable metadata and live quota for all configured Groq keys."""
        settings = get_settings()
        keys = self.get_keys()
        current_idx, current_name, _ = self.get_current_key()

        def mask_key(k: str) -> str:
            if not k or len(k) < 10:
                return "***"
            return f"{k[:8]}...{k[-4:]}"

        # Query live quota for all keys in parallel
        quotas = await asyncio.gather(*[self.check_key_quota(val) for _, val in keys])

        return {
            "provider": settings.llm_provider,
            "model": settings.model_name,
            "active_key_name": current_name,
            "active_key_index": current_idx,
            "total_keys": len(keys),
            "keys": [
                {
                    "name": name,
                    "masked_key": mask_key(val),
                    "is_active": (i == current_idx),
                    "quota": quotas[i] if i < len(quotas) else {},
                }
                for i, (name, val) in enumerate(keys)
            ],
        }


# Singleton key manager
groq_key_manager = GroqKeyManager()


class RotatingChatGroq(BaseChatModel):
    """ChatGroq wrapper with automatic fallback key rotation when hitting quota/rate limit."""

    model_name: str = "openai/gpt-oss-120b"
    temperature: float = 0.7
    client_kwargs: dict[str, Any] = Field(default_factory=dict)
    _clients: dict[str, BaseChatModel] = PrivateAttr(default_factory=dict)

    @property
    def _llm_type(self) -> str:
        return "groq-rotating"

    def _get_client(self, api_key: str) -> BaseChatModel:
        if api_key in self._clients:
            return self._clients[api_key]

        try:
            from langchain_groq import ChatGroq

            client = ChatGroq(
                model=self.model_name,
                groq_api_key=api_key,
                temperature=self.temperature,
                **self.client_kwargs,
            )
        except Exception as e:
            logger.warning(f"ChatGroq initialization failed ({e}), falling back to ChatOpenAI with Groq base URL.")
            client = ChatOpenAI(
                model=self.model_name,
                api_key=api_key,
                base_url="https://api.groq.com/openai/v1",
                temperature=self.temperature,
                **self.client_kwargs,
            )

        self._clients[api_key] = client
        return client

    def _is_rotatable_error(self, e: Exception) -> bool:
        err_str = str(e).lower()
        type_name = type(e).__name__.lower()
        keywords = [
            "429",
            "rate_limit",
            "rate limit",
            "ratelimit",
            "quota",
            "tpm",
            "rpm",
            "tokens per minute",
            "requests per minute",
            "resource_exhausted",
            "resourceexhausted",
            "overloaded",
            "413",
            "invalid_api_key",
            "401",
        ]
        return any(k in err_str or k in type_name for k in keywords)

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        keys = groq_key_manager.get_keys()
        attempts = 0
        max_attempts = max(1, len(keys))
        last_exception = None

        while attempts < max_attempts:
            idx, key_name, key_val = groq_key_manager.get_current_key()
            client = self._get_client(key_val)
            try:
                return client._generate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as e:
                last_exception = e
                if self._is_rotatable_error(e) and max_attempts > 1:
                    groq_key_manager.rotate_key(idx, error_reason=str(e))
                    attempts += 1
                    continue
                raise e

        if last_exception:
            raise last_exception
        raise RuntimeError("No Groq API keys available or all failed.")

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        keys = groq_key_manager.get_keys()
        attempts = 0
        max_attempts = max(1, len(keys))
        last_exception = None

        while attempts < max_attempts:
            idx, key_name, key_val = groq_key_manager.get_current_key()
            client = self._get_client(key_val)
            try:
                return await client._agenerate(messages, stop=stop, run_manager=run_manager, **kwargs)
            except Exception as e:
                last_exception = e
                if self._is_rotatable_error(e) and max_attempts > 1:
                    groq_key_manager.rotate_key(idx, error_reason=str(e))
                    attempts += 1
                    continue
                raise e

        if last_exception:
            raise last_exception
        raise RuntimeError("No Groq API keys available or all failed.")

    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        keys = groq_key_manager.get_keys()
        attempts = 0
        max_attempts = max(1, len(keys))
        last_exception = None

        while attempts < max_attempts:
            idx, key_name, key_val = groq_key_manager.get_current_key()
            client = self._get_client(key_val)
            try:
                yield from client._stream(messages, stop=stop, run_manager=run_manager, **kwargs)
                return
            except Exception as e:
                last_exception = e
                if self._is_rotatable_error(e) and max_attempts > 1:
                    groq_key_manager.rotate_key(idx, error_reason=str(e))
                    attempts += 1
                    continue
                raise e

        if last_exception:
            raise last_exception

    async def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> AsyncIterator[ChatGenerationChunk]:
        keys = groq_key_manager.get_keys()
        attempts = 0
        max_attempts = max(1, len(keys))
        last_exception = None

        while attempts < max_attempts:
            idx, key_name, key_val = groq_key_manager.get_current_key()
            client = self._get_client(key_val)
            try:
                async for chunk in client._astream(messages, stop=stop, run_manager=run_manager, **kwargs):
                    yield chunk
                return
            except Exception as e:
                last_exception = e
                if self._is_rotatable_error(e) and max_attempts > 1:
                    groq_key_manager.rotate_key(idx, error_reason=str(e))
                    attempts += 1
                    continue
                raise e

        if last_exception:
            raise last_exception


def get_llm(
    model_name: str | None = None,
    temperature: float | None = None,
    provider: str | None = None,
    **kwargs: Any,
) -> BaseChatModel:
    """Get initialized LLM instance based on configuration or provider argument."""
    settings = get_settings()
    llm_provider = (provider or settings.llm_provider or "groq").lower()
    temp = temperature if temperature is not None else settings.llm_temperature

    if llm_provider == "groq":
        g_model = model_name or settings.model_name or "openai/gpt-oss-120b"
        if "gemini" in g_model:
            g_model = "openai/gpt-oss-120b"

        return RotatingChatGroq(
            model_name=g_model,
            temperature=temp,
            client_kwargs=kwargs,
        )

    if llm_provider in ("openrouter", "open_router"):
        api_key = (
            settings.openrouter_api_key
            or os.getenv("OPENROUTER_API_KEY")
            or "dummy-key-for-test"
        ).strip().strip('"\'')
        target_model = (model_name or settings.model_name or "meta-llama/llama-3.3-70b-instruct").strip().strip('"\'')
        base_url = (settings.openrouter_base_url or os.getenv("OPENROUTER_BASE_URL") or "https://openrouter.ai/api/v1").strip().strip('"\'')
        return ChatOpenAI(
            model=target_model,
            api_key=api_key,
            base_url=base_url,
            temperature=temp,
            max_tokens=kwargs.get("max_tokens", 2000),
            default_headers={
                "HTTP-Referer": "http://localhost:3000",
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
            g_model = model_name or "gemini-2.5-flash"
            if "llama" in g_model or "gpt" in g_model:
                g_model = "gemini-2.5-flash"

            return ChatGoogleGenerativeAI(
                model=g_model,
                google_api_key=api_key,
                temperature=temp,
            )
        except Exception:
            pass

    # Default to Groq with key rotation
    return RotatingChatGroq(
        model_name=model_name or "openai/gpt-oss-120b",
        temperature=temp,
        client_kwargs=kwargs,
    )
