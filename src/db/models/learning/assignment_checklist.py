from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.learning.assignment import Assignment
    from src.db.models.learning.student_checklist_progress import StudentChecklistProgress


class AssignmentChecklist(Base, TimestampMixin):
    __tablename__ = "assignment_checklists"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    assignment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    assignment: Mapped["Assignment"] = relationship("Assignment", back_populates="checklists")
    progress_records: Mapped[list["StudentChecklistProgress"]] = relationship(
        "StudentChecklistProgress", back_populates="checklist", cascade="all, delete-orphan"
    )
