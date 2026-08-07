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

        # 4. Ensure course_materials table exists and has storage metadata columns
        try:
            async with engine.begin() as conn:
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS course_materials (
                        id VARCHAR(36) PRIMARY KEY,
                        course_id VARCHAR(36) NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        file_name VARCHAR(255) NOT NULL,
                        file_url VARCHAR(500) NOT NULL,
                        object_key VARCHAR(500),
                        bucket VARCHAR(255),
                        size INTEGER,
                        mime_type VARCHAR(100),
                        type VARCHAR(50) NOT NULL DEFAULT 'document',
                        uploaded_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_course_materials_course_id ON course_materials(course_id);"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_course_materials_uploaded_by ON course_materials(uploaded_by);"))

                # Alter existing table if columns were added later
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS object_key VARCHAR(500);"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS bucket VARCHAR(255);"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS size INTEGER;"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';"))
        except Exception as table_err:
            logger.error(f"course_materials table creation/alteration error: {table_err}")

        # 5. Ensure course_id column exists on chat_sessions
        try:
            async with engine.begin() as conn:
                await conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS course_id VARCHAR(36) REFERENCES courses(id) ON DELETE CASCADE;"))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_chat_sessions_course_id ON chat_sessions(course_id);"))
        except Exception as col_err:
            logger.debug(f"course_id column check notice for chat_sessions: {col_err}")

        # 6. Ensure assignments columns exist and student_assignment_progress table exists
        try:
            async with engine.begin() as conn:
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS estimated_hours FLOAT;"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT 'MEDIUM';"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS created_by VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL;"))
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS student_assignment_progress (
                        id VARCHAR(36) PRIMARY KEY,
                        assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
                        student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        progress_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        CONSTRAINT uq_student_assignment_progress UNIQUE (assignment_id, student_id)
                    );
                """))
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS assignment_checklists (
                        id VARCHAR(36) PRIMARY KEY,
                        assignment_id VARCHAR(36) NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        display_order INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_assignment_checklists_assignment_id ON assignment_checklists(assignment_id);"))
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS student_checklist_progress (
                        id VARCHAR(36) PRIMARY KEY,
                        checklist_id VARCHAR(36) NOT NULL REFERENCES assignment_checklists(id) ON DELETE CASCADE,
                        student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        completed BOOLEAN NOT NULL DEFAULT FALSE,
                        completed_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        CONSTRAINT uq_student_checklist_progress UNIQUE (checklist_id, student_id)
                    );
                """))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_student_checklist_progress_checklist_id ON student_checklist_progress(checklist_id);"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_file_name VARCHAR(255);"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_file_url VARCHAR(500);"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_object_key VARCHAR(500);"))
                await conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_name VARCHAR(255);"))
                await conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS file_url VARCHAR(500);"))
                await conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS object_key VARCHAR(500);"))
                await conn.execute(text("ALTER TABLE submissions ADD COLUMN IF NOT EXISTS submission_text TEXT;"))
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS personal_tasks (
                        id VARCHAR(36) PRIMARY KEY,
                        student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        category VARCHAR(50) NOT NULL DEFAULT 'STUDY',
                        priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
                        status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
                        estimated_hours FLOAT,
                        due_at TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """))
                await conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS goals (
                        id VARCHAR(36) PRIMARY KEY,
                        student_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        title VARCHAR(255) NOT NULL,
                        description TEXT,
                        category VARCHAR(50) NOT NULL DEFAULT 'LEARNING',
                        priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
                        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
                        target_date TIMESTAMP WITH TIME ZONE,
                        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
                        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
                    );
                """))
                await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_goals_student_id ON goals(student_id);"))
        except Exception as assign_err:
            logger.debug(f"assignments / checklists / submissions / personal_tasks / goals check notice: {assign_err}")

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
            try:
                await conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN course_id VARCHAR(36);"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN object_key VARCHAR(500);"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN bucket VARCHAR(255);"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN size INTEGER;"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN mime_type VARCHAR(100);"))
                await conn.execute(text("ALTER TABLE course_materials ADD COLUMN status VARCHAR(50);"))
            except Exception:
                pass
            try:
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN estimated_hours FLOAT;"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN priority VARCHAR(50) DEFAULT 'MEDIUM';"))
                await conn.execute(text("ALTER TABLE assignments ADD COLUMN created_by VARCHAR(36);"))
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
