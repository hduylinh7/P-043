from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.learning.course import Course


class CourseSchedule(Base, TimestampMixin):
    __tablename__ = "course_schedules"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    course_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    day_of_week: Mapped[str] = mapped_column(String(20), nullable=False)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)
    room: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    course: Mapped["Course"] = relationship("Course", back_populates="schedules")
