from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.ai.agent_memory import AgentMemory
    from src.db.models.ai.recommendation import Recommendation
    from src.db.models.chat.chat_session import ChatSession
    from src.db.models.identity.anonymous_profile import AnonymousProfile
    from src.db.models.identity.user_role import UserRole
    from src.db.models.learning.enrollment import Enrollment
    from src.db.models.planning.goal import Goal
    from src.db.models.planning.weekly_goal import WeeklyGoal


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    canvas_user_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user_roles: Mapped[list["UserRole"]] = relationship(
        "UserRole", back_populates="user", cascade="all, delete-orphan"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="user", cascade="all, delete-orphan"
    )
    goals: Mapped[list["Goal"]] = relationship(
        "Goal", back_populates="student", cascade="all, delete-orphan"
    )
    weekly_goals: Mapped[list["WeeklyGoal"]] = relationship(
        "WeeklyGoal", back_populates="student", cascade="all, delete-orphan"
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(
        "ChatSession", back_populates="user", cascade="all, delete-orphan"
    )
    memories: Mapped[list["AgentMemory"]] = relationship(
        "AgentMemory", back_populates="user", cascade="all, delete-orphan"
    )
    recommendations: Mapped[list["Recommendation"]] = relationship(
        "Recommendation", back_populates="student", cascade="all, delete-orphan"
    )
    anonymous_profile: Mapped[Optional["AnonymousProfile"]] = relationship(
        "AnonymousProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
