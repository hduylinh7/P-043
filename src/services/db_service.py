from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import ChatMessage, ChatSession


async def create_session(
    db: AsyncSession, user_id: str = "default_user", title: str = "New Chat"
) -> ChatSession:
    """Create a new chat session."""
    session = ChatSession(user_id=user_id, title=title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_session(db: AsyncSession, session_id: str) -> ChatSession | None:
    """Retrieve a session by ID."""
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    return result.scalar_one_or_none()


async def list_sessions(
    db: AsyncSession, user_id: str = "default_user", limit: int = 50
) -> Sequence[ChatSession]:
    """List sessions for a specific user."""
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.updated_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def add_message(
    db: AsyncSession, session_id: str, role: str, content: str
) -> ChatMessage:
    """Add a message to a session."""
    msg = ChatMessage(session_id=session_id, role=role, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def get_session_messages(
    db: AsyncSession, session_id: str
) -> Sequence[ChatMessage]:
    """Get all messages for a session in chronological order."""
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return result.scalars().all()
