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
        from sqlalchemy import text

        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

        # 1. Ensure is_verified column exists on users
        try:
            async with engine.begin() as conn:
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;"))
        except Exception as col_err:
            logger.debug(f"is_verified column check notice: {col_err}")

        # 2. Ensure instructor_id column exists on courses
        try:
            async with engine.begin() as conn:
                await conn.execute(text("ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;"))
        except Exception as col_err:
            logger.debug(f"instructor_id column check notice: {col_err}")

        # 3. Ensure unique constraint on enrollments (user_id, course_id)
        try:
            async with engine.begin() as conn:
                await conn.execute(text("ALTER TABLE enrollments ADD CONSTRAINT uq_user_course_enrollment UNIQUE (user_id, course_id);"))
        except Exception as col_err:
            logger.debug(f"enrollment constraint notice: {col_err}")

        # 4. Ensure course_materials table exists
        try:
            async with engine.begin() as conn:
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS course_materials (
                        id VARCHAR(36) PRIMARY KEY,
                        course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        file_name VARCHAR(255) NOT NULL,
                        file_url VARCHAR(500) NOT NULL,
                        type VARCHAR(50) NOT NULL DEFAULT 'document',
                        uploaded_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_course_materials_course_id ON course_materials(course_id);"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_course_materials_uploaded_by ON course_materials(uploaded_by);"))
        except Exception as table_err:
            logger.error(f"course_materials table creation error: {table_err}")

        logger.info(f"Database tables initialized using {engine.url.drivername}")


    except Exception as e:
        logger.warning(f"Failed to connect to primary DB ({db_url}): {e}. Falling back to SQLite...")
        fallback_url = "sqlite+aiosqlite:///./data/app.db"
        engine, AsyncSessionLocal = _create_engine_and_session(fallback_url)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
            from sqlalchemy import text
            try:
                await conn.execute(text("ALTER TABLE courses ADD COLUMN instructor_id VARCHAR(36);"))
            except Exception:
                pass
        logger.info("Database tables initialized using fallback SQLite database.")



async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for obtaining an async DB session in FastAPI handlers."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
