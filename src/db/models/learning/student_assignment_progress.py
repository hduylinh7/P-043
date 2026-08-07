from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.learning.assignment import Assignment


class StudentAssignmentProgress(Base, TimestampMixin):
    __tablename__ = "student_assignment_progress"
    __table_args__ = (
        UniqueConstraint("assignment_id", "student_id", name="uq_student_assignment_progress"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    assignment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    progress_status: Mapped[str] = mapped_column(
        String(50), default="NOT_STARTED", nullable=False
    )

    assignment: Mapped["Assignment"] = relationship("Assignment", back_populates="progress_records")
    student: Mapped["User"] = relationship("User")
