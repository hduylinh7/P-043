from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.learning.assignment_checklist import AssignmentChecklist
    from src.db.models.learning.course import Course
    from src.db.models.learning.question import AssignmentQuestion
    from src.db.models.learning.student_assignment_progress import StudentAssignmentProgress
    from src.db.models.learning.submission import Submission
    from src.db.models.planning.task import Task


class Assignment(Base, TimestampMixin):
    __tablename__ = "assignments"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    course_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    canvas_assignment_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    available_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="DRAFT", nullable=False)
    priority: Mapped[str] = mapped_column(String(50), default="MEDIUM", nullable=False)
    created_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    attachment_file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attachment_file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    attachment_object_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    points_possible: Mapped[float | None] = mapped_column(Float, nullable=True)

    @property
    def due_date(self) -> datetime | None:
        return self.due_at

    @due_date.setter
    def due_date(self, value: datetime | None) -> None:
        self.due_at = value

    @property
    def start_date(self) -> datetime | None:
        return self.available_from

    @start_date.setter
    def start_date(self, value: datetime | None) -> None:
        self.available_from = value

    course: Mapped["Course"] = relationship("Course", back_populates="assignments")
    creator: Mapped["User | None"] = relationship("User", foreign_keys=[created_by])
    submissions: Mapped[list["Submission"]] = relationship(
        "Submission", back_populates="assignment", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="assignment", cascade="all, delete-orphan"
    )
    progress_records: Mapped[list["StudentAssignmentProgress"]] = relationship(
        "StudentAssignmentProgress", back_populates="assignment", cascade="all, delete-orphan"
    )
    checklists: Mapped[list["AssignmentChecklist"]] = relationship(
        "AssignmentChecklist",
        back_populates="assignment",
        cascade="all, delete-orphan",
        order_by="AssignmentChecklist.display_order",
    )
    questions: Mapped[list["AssignmentQuestion"]] = relationship(
        "AssignmentQuestion",
        back_populates="assignment",
        cascade="all, delete-orphan",
        order_by="AssignmentQuestion.display_order",
    )



