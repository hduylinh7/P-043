import logging
import os
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.config import get_settings
from src.db.base import Base

logger = logging.getLogger(__name__)
settings = get_settings()

db_url = settings.database_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif db_url.startswith("sqlite://"):
    db_url = db_url.replace("sqlite://", "sqlite+aiosqlite://", 1)


def _create_engine_and_session(url: str):
    if "sqlite" in url:
        os.makedirs("./data", exist_ok=True)
    eng = create_async_engine(
        url,
        echo=(settings.app_env == "development"),
        future=True,
    )
    sess_factory = async_sessionmaker(
        bind=eng,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    return eng, sess_factory


engine, AsyncSessionLocal = _create_engine_and_session(db_url)


async def init_db() -> None:
    """Initialize database tables, falling back to SQLite if PostgreSQL is unreachable."""
    global engine, AsyncSessionLocal
    # Import all models to ensure metadata is populated
    import src.db.models  # noqa: F401

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            # Ensure is_verified column exists if users table was created in an earlier DB volume
            try:
                from sqlalchemy import text
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;"))
            except Exception as col_err:
                logger.debug(f"is_verified column check notice: {col_err}")
        logger.info(f"Database tables initialized using {engine.url.drivername}")
    except Exception as e:
        logger.warning(f"Failed to connect to primary DB ({db_url}): {e}. Falling back to SQLite...")
        fallback_url = "sqlite+aiosqlite:///./data/app.db"
        engine, AsyncSessionLocal = _create_engine_and_session(fallback_url)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables initialized using fallback SQLite database.")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async DB session in FastAPI handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
