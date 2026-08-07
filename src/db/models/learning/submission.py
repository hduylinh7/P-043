from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid
from src.db.enums import SubmissionStatusEnum

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.learning.assignment import Assignment


class Submission(Base, TimestampMixin):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    assignment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("assignments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    canvas_submission_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    grade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    object_key: Mapped[str | None] = mapped_column(String(500), nullable=True)
    submission_text: Mapped[str | None] = mapped_column(String(5000), nullable=True)
    status: Mapped[SubmissionStatusEnum] = mapped_column(
        SQLEnum(SubmissionStatusEnum, native_enum=False),
        default=SubmissionStatusEnum.UNSUBMITTED,
        nullable=False,
    )

    assignment: Mapped["Assignment"] = relationship("Assignment", back_populates="submissions")
    student: Mapped["User"] = relationship("User")
