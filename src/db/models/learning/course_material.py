from typing import TYPE_CHECKING, Optional

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base, TimestampMixin, generate_uuid

if TYPE_CHECKING:
    from src.db.models.identity.user import User
    from src.db.models.learning.course import Course


class CourseMaterial(Base, TimestampMixin):
    __tablename__ = "course_materials"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    course_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("courses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    type: Mapped[str] = mapped_column(String(50), default="document", nullable=False)
    uploaded_by: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    course: Mapped["Course"] = relationship("Course", back_populates="materials")
    uploader: Mapped[Optional["User"]] = relationship("User", foreign_keys=[uploaded_by])
