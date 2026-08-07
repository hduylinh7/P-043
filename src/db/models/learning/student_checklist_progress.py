from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.learning.assignment_checklist import AssignmentChecklist


class StudentChecklistProgress(Base, TimestampMixin):
    __tablename__ = "student_checklist_progress"
    __table_args__ = (
        UniqueConstraint("checklist_id", "student_id", name="uq_student_checklist_progress"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    checklist_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assignment_checklists.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    checklist: Mapped["AssignmentChecklist"] = relationship(
        "AssignmentChecklist", back_populates="progress_records"
    )
    student: Mapped["User"] = relationship("User")
