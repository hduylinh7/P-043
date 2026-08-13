from collections.abc import Sequence
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import ChatMessage, ChatSession


class ChatRepository:
    @staticmethod
    async def create_session(
        db: AsyncSession,
        user_id: str | None = "default_user",
        course_id: str | None = None,
        title: str = "New Chat",
        agent_name: str = "default_agent",
    ) -> ChatSession:
        """Create a new chat session safely handling optional user_id."""
        valid_user_id = None
        if user_id:
            from src.db.models import User
            user_exists = await db.scalar(select(User.id).where(User.id == user_id))
            if user_exists:
                valid_user_id = user_id

        session = ChatSession(
            user_id=valid_user_id,
            course_id=course_id,
            title=title,
            agent_name=agent_name,
        )
        db.add(session)
        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_session(db: AsyncSession, session_id: str) -> ChatSession | None:
        """Retrieve a session by ID."""
        result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        return result.scalar_one_or_none()

    @staticmethod
    async def list_sessions(
        db: AsyncSession,
        user_id: str = "default_user",
        course_id: str | None = None,
        agent_name: str | None = None,
        limit: int = 50,
    ) -> Sequence[ChatSession]:
        """List sessions for a specific user and optional course/agent_name."""
        query = select(ChatSession)
        if user_id and user_id != "default_user":
            query = query.where(ChatSession.user_id == user_id)
        if course_id:
            query = query.where(ChatSession.course_id == course_id)
        if agent_name:
            query = query.where(ChatSession.agent_name == agent_name)
        query = query.order_by(ChatSession.updated_at.desc()).limit(limit)

        result = await db.execute(query)
        return result.scalars().all()

    @staticmethod
    async def add_message(
        db: AsyncSession,
        session_id: str,
        role: str,
        content: str,
        tokens_used: int | None = None,
        metadata_json: dict[str, Any] | None = None,
    ) -> ChatMessage:
        """Add a message to a session."""
        msg = ChatMessage(
            session_id=session_id,
            role=role,
            content=content,
            tokens_used=tokens_used,
            metadata_json=metadata_json,
        )
        db.add(msg)
        await db.commit()
        await db.refresh(msg)
        return msg

    @staticmethod
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

    @staticmethod
    async def get_recent_messages(
        db: AsyncSession, session_id: str, limit: int = 10
    ) -> list[ChatMessage]:
        """Get recent N messages for context window management."""
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(limit)
        )
        recent_desc = list(result.scalars().all())
        return list(reversed(recent_desc))
