from functools import lru_cache
from typing import Literal

from pydantic import Field
# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "AI20K Agent"
    app_env: Literal["development", "production", "test"] = "development"
    app_port: int = Field(default=8000, ge=1, le=65535)
    app_host: str = "0.0.0.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173"

    # LLM & Embeddings
    llm_provider: str = Field(default="groq", validation_alias="LLM_PROVIDER")
    openai_api_key: str = ""
    groq_api_key: str = Field(default="", validation_alias="GROQ_API_KEY")
    groq_api_key_1: str = Field(default="", validation_alias="GROQ_API_KEY_1")
    groq_api_key_2: str = Field(default="", validation_alias="GROQ_API_KEY_2")
    groq_api_key_3: str = Field(default="", validation_alias="GROQ_API_KEY_3")
    gemini_api_key: str = Field(default="", validation_alias="GEMINI_API_KEY")
    google_api_key: str = Field(default="", validation_alias="GOOGLE_API_KEY")
    openrouter_api_key: str = Field(default="", validation_alias="OPENROUTER_API_KEY")
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", validation_alias="OPENROUTER_BASE_URL")
    embedding_model_name: str = Field(default="models/gemini-embedding-2", validation_alias="EMBEDDING_MODEL_NAME")
    model_name: str = Field(default="openai/gpt-oss-120b", validation_alias="MODEL_NAME")

    def get_groq_api_keys(self) -> list[tuple[str, str]]:
        """Return list of configured Groq API keys as (key_name, key_value) tuples."""
        import os
        keys: list[tuple[str, str]] = []
        for i in range(1, 10):
            name = f"GROQ_API_KEY_{i}"
            val = getattr(self, f"groq_api_key_{i}", "") or os.getenv(name, "")
            val = val.strip() if val else ""
            if val and not val.startswith("gsk_your") and not any(k[0] == name for k in keys):
                keys.append((name, val))

        # Fallback to GROQ_API_KEY if none of indexed keys or add if unique
        fallback_val = (self.groq_api_key or os.getenv("GROQ_API_KEY") or "").strip()
        if fallback_val and not fallback_val.startswith("gsk_your"):
            if not any(k[1] == fallback_val for k in keys):
                keys.append(("GROQ_API_KEY", fallback_val))
        return keys


    llm_temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    rag_top_k: int = Field(default=4, ge=1, le=20, validation_alias="RAG_TOP_K")
    rag_min_score: float = Field(default=0.50, ge=0.0, le=1.0, validation_alias="RAG_MIN_SCORE")
    enable_reranker: bool = Field(default=True, validation_alias="ENABLE_RERANKER")
    rag_rerank_fetch_k: int = Field(default=15, ge=1, le=50, validation_alias="RAG_RERANK_FETCH_K")
    reranker_model_name: str = Field(default="ms-marco-TinyBERT-L-2-v2", validation_alias="RERANKER_MODEL_NAME")
    chat_history_limit: int = Field(default=10, ge=1, le=50, validation_alias="CHAT_HISTORY_LIMIT")

    # Database (PostgreSQL default, falls back to SQLite if sqlite specified)
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/p043_db"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT Authentication
    jwt_secret_key: str = Field(default="change-in-production-secret-key", validation_alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field(default="HS256", validation_alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(default=15, validation_alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, validation_alias="REFRESH_TOKEN_EXPIRE_DAYS")
    reset_token_expire_seconds: int = Field(default=3600, validation_alias="RESET_TOKEN_EXPIRE_SECONDS")

    # SMTP / Email / Brevo API
    brevo_api_key: str = Field(default="", validation_alias="BREVO_API_KEY")
    smtp_host: str = Field(default="smtp.gmail.com", validation_alias="SMTP_HOST")
    smtp_port: int = Field(default=587, validation_alias="SMTP_PORT")
    smtp_user: str = Field(default="", validation_alias="SMTP_USER")
    smtp_password: str = Field(default="", validation_alias="SMTP_PASSWORD")
    smtp_from: str = Field(default="noreply@ailearningcompanion.com", validation_alias="SMTP_FROM")
    smtp_tls: bool = Field(default=True, validation_alias="SMTP_TLS")

    # Vector Store (Qdrant Cloud)
    vector_store_type: str = Field(default="qdrant", validation_alias="VECTOR_STORE_TYPE")
    qdrant_url: str = Field(default="", validation_alias="QDRANT_URL")
    qdrant_api_key: str = Field(default="", validation_alias="QDRANT_API_KEY")
    qdrant_collection_name: str = Field(default="course_materials", validation_alias="QDRANT_COLLECTION_NAME")

    # Google OAuth
    google_client_id: str = Field(default="", validation_alias="GOOGLE_CLIENT_ID")
    google_client_secret: str = Field(default="", validation_alias="GOOGLE_CLIENT_SECRET")

    # Role & Institution Verification
    instructor_invite_code: str = Field(default="VINUNI-2026-AI", validation_alias="INSTRUCTOR_INVITE_CODE")

    # Object Storage (MinIO / S3)
    storage_provider: str = Field(default="minio", validation_alias="STORAGE_PROVIDER")
    s3_endpoint: str = Field(default="http://localhost:9000", validation_alias="S3_ENDPOINT")
    s3_bucket: str = Field(default="course-materials", validation_alias="S3_BUCKET")
    s3_access_key: str = Field(default="minioadmin", validation_alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(default="minioadmin", validation_alias="S3_SECRET_KEY")
    s3_region: str = Field(default="us-east-1", validation_alias="S3_REGION")
    s3_secure: bool = Field(default=False, validation_alias="S3_SECURE")
    s3_custom_domain: str = Field(default="", validation_alias="S3_CUSTOM_DOMAIN")
    max_upload_size_mb: int = Field(default=50, validation_alias="MAX_UPLOAD_SIZE_MB")



@lru_cache
def get_settings() -> Settings:
    return Settings()

