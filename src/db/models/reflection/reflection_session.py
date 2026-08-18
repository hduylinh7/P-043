from typing import TYPE_CHECKING

from sqlalchemy import Enum as SQLEnum
from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid
from src.db.enums import ReflectionSessionStatusEnum

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.planning.weekly_goal import WeeklyGoal
    from src.db.models.reflection.reflection_message import ReflectionMessage


class ReflectionSession(Base, TimestampMixin):
    __tablename__ = "reflection_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    weekly_goal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weekly_goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default=ReflectionSessionStatusEnum.IN_PROGRESS,
        nullable=False,
    )
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    weekly_goal: Mapped["WeeklyGoal"] = relationship(
        "WeeklyGoal", back_populates="reflection_sessions"
    )
    student: Mapped["User"] = relationship("User")
    messages: Mapped[list["ReflectionMessage"]] = relationship(
        "ReflectionMessage", back_populates="session", cascade="all, delete-orphan"
    )
