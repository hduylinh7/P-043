from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.knowledge.document import Document
    from src.db.models.learning.assignment import Assignment
    from src.db.models.learning.course_material import CourseMaterial
    from src.db.models.learning.course_schedule import CourseSchedule
    from src.db.models.learning.enrollment import Enrollment


class Course(Base, TimestampMixin):
    __tablename__ = "courses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    canvas_course_id: Mapped[str | None] = mapped_column(
        String(255), unique=True, index=True, nullable=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    term: Mapped[str | None] = mapped_column(String(50), nullable=True)
    credits: Mapped[int] = mapped_column(Integer, nullable=False, default=3)
    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    instructor_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    @property
    def computed_status(self) -> str:
        now = datetime.now(timezone.utc)
        if self.start_date:
            start = self.start_date if self.start_date.tzinfo else self.start_date.replace(tzinfo=timezone.utc)
            if now < start:
                return "UPCOMING"
        if self.end_date:
            end = self.end_date if self.end_date.tzinfo else self.end_date.replace(tzinfo=timezone.utc)
            if now > end:
                return "COMPLETED"
        return "ACTIVE"

    instructor: Mapped[Optional["User"]] = relationship("User", foreign_keys=[instructor_id])
    enrollments: Mapped[list["Enrollment"]] = relationship(
        "Enrollment", back_populates="course", cascade="all, delete-orphan"
    )
    assignments: Mapped[list["Assignment"]] = relationship(
        "Assignment", back_populates="course", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document", back_populates="course", cascade="all, delete-orphan"
    )
    materials: Mapped[list["CourseMaterial"]] = relationship(
        "CourseMaterial", back_populates="course", cascade="all, delete-orphan"
    )
    schedules: Mapped[list["CourseSchedule"]] = relationship(
        "CourseSchedule", back_populates="course", cascade="all, delete-orphan"
    )



