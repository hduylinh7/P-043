from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Integer, String
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column

from src.db.base import Base, JSONType, generate_uuid, now_utc
from src.db.enums import SyncStatusEnum


class SyncLog(Base):
    __tablename__ = "sync_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=generate_uuid)
    source: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. 'canvas'
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[SyncStatusEnum] = mapped_column(
        SQLEnum(SyncStatusEnum, native_enum=False),
        default=SyncStatusEnum.PENDING,
        nullable=False,
    )
    items_synced: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_details: Mapped[dict[str, Any] | None] = mapped_column(JSONType, nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
