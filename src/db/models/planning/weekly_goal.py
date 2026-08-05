from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid, now_utc
from src.db.enums import GoalStatusEnum

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.planning.task import Task
    from src.db.models.reflection.reflection_session import ReflectionSession


class WeeklyGoal(Base, TimestampMixin):
    __tablename__ = "weekly_goals"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    week_start_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[GoalStatusEnum] = mapped_column(
        SQLEnum(GoalStatusEnum, native_enum=False),
        default=GoalStatusEnum.NOT_STARTED,
        nullable=False,
    )
    generated_by_agent: Mapped[str | None] = mapped_column(String(100), nullable=True)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )

    student: Mapped["User"] = relationship("User", back_populates="weekly_goals")
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="weekly_goal", cascade="all, delete-orphan"
    )
    reflection_sessions: Mapped[list["ReflectionSession"]] = relationship(
        "ReflectionSession", back_populates="weekly_goal", cascade="all, delete-orphan"
    )
