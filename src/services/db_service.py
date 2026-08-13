from collections.abc import Sequence
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import ChatMessage, ChatSession
from src.repositories.chat_repository import ChatRepository


async def create_session(
    db: AsyncSession,
    user_id: str | None = "default_user",
    title: str = "New Chat",
    course_id: str | None = None,
    agent_name: str = "default_agent",
) -> ChatSession:
    """Create a new chat session."""
    return await ChatRepository.create_session(
        db, user_id=user_id, course_id=course_id, title=title, agent_name=agent_name
    )


async def get_session(db: AsyncSession, session_id: str) -> ChatSession | None:
    """Retrieve a session by ID."""
    return await ChatRepository.get_session(db, session_id)


async def list_sessions(
    db: AsyncSession,
    user_id: str = "default_user",
    limit: int = 50,
    course_id: str | None = None,
    agent_name: str | None = None,
) -> Sequence[ChatSession]:
    """List sessions for a specific user."""
    return await ChatRepository.list_sessions(
        db, user_id=user_id, course_id=course_id, agent_name=agent_name, limit=limit
    )


async def add_message(
    db: AsyncSession,
    session_id: str,
    role: str,
    content: str,
    metadata_json: dict[str, Any] | None = None,
) -> ChatMessage:
    """Add a message to a session."""
    return await ChatRepository.add_message(
        db, session_id=session_id, role=role, content=content, metadata_json=metadata_json
    )


async def get_session_messages(
    db: AsyncSession, session_id: str
) -> Sequence[ChatMessage]:
    """Get all messages for a session in chronological order."""
    return await ChatRepository.get_session_messages(db, session_id)


async def get_recent_messages(
    db: AsyncSession, session_id: str, limit: int = 10
) -> list[ChatMessage]:
    """Get recent N messages for context window management."""
    return await ChatRepository.get_recent_messages(db, session_id, limit=limit)

