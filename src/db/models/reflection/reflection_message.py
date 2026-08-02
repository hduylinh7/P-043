from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, generate_uuid, now_utc

if TYPE_CHECKING:
    from src.db.models.reflection.reflection_session import ReflectionSession


class ReflectionMessage(Base):
    __tablename__ = "reflection_messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    reflection_session_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("reflection_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender: Mapped[str] = mapped_column(String(50), nullable=False)  # 'user' or 'agent'
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    session: Mapped["ReflectionSession"] = relationship("ReflectionSession", back_populates="messages")
