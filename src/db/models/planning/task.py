from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid
from src.db.enums import TaskPriorityEnum, TaskStatusEnum

if TYPE_CHECKING:
    from src.db.models.learning.assignment import Assignment
    from src.db.models.planning.notification import Notification
    from src.db.models.planning.weekly_goal import WeeklyGoal


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    weekly_goal_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("weekly_goals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assignment_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("assignments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriorityEnum] = mapped_column(
        SQLEnum(TaskPriorityEnum, native_enum=False),
        default=TaskPriorityEnum.MEDIUM,
        nullable=False,
    )
    status: Mapped[TaskStatusEnum] = mapped_column(
        SQLEnum(TaskStatusEnum, native_enum=False),
        default=TaskStatusEnum.TODO,
        nullable=False,
    )
    estimated_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    weekly_goal: Mapped["WeeklyGoal"] = relationship("WeeklyGoal", back_populates="tasks")
    assignment: Mapped[Optional["Assignment"]] = relationship("Assignment", back_populates="tasks")
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="task", cascade="all, delete-orphan"
    )
