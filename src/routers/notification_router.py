from typing import Annotated, List, Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from src.db.database import get_db
from src.db.models.planning.notification import Notification
from src.models.auth import UserResponse
from src.routers.auth_router import get_current_user

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationResponse(BaseModel):
    id: str
    student_id: str
    task_id: str | None = None
    notification_type: str
    scheduled_at: str
    is_sent: bool
    sent_at: str | None = None
    payload: Dict[str, Any] | None = None
    created_at: str | None = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
):
    """Retrieve notifications for the current authenticated user."""
    stmt = (
        select(Notification)
        .where(Notification.student_id == current_user.id)
        .order_by(Notification.scheduled_at.desc(), Notification.created_at.desc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    notifications = res.scalars().all()

    response = []
    for notif in notifications:
        response.append(
            NotificationResponse(
                id=notif.id,
                student_id=notif.student_id,
                task_id=notif.task_id,
                notification_type=notif.notification_type,
                scheduled_at=notif.scheduled_at.isoformat() if notif.scheduled_at else "",
                is_sent=notif.is_sent,
                sent_at=notif.sent_at.isoformat() if notif.sent_at else None,
                payload=notif.payload,
                created_at=notif.created_at.isoformat() if notif.created_at else None,
            )
        )
    return response


@router.patch("/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Mark a specific notification as read."""
    stmt = select(Notification).where(
        and_(
            Notification.id == notification_id,
            Notification.student_id == current_user.id,
        )
    )
    res = await db.execute(stmt)
    notif = res.scalars().first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )

    # Update payload JSON to set is_read = True
    payload = dict(notif.payload or {})
    payload["is_read"] = True
    notif.payload = payload
    await db.commit()
    return {"status": "ok", "id": notification_id}


@router.patch("/read-all")
async def mark_all_notifications_as_read(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Mark all notifications as read for current user."""
    stmt = select(Notification).where(Notification.student_id == current_user.id)
    res = await db.execute(stmt)
    notifications = res.scalars().all()
    for notif in notifications:
        payload = dict(notif.payload or {})
        payload["is_read"] = True
        notif.payload = payload
    await db.commit()
    return {"status": "ok", "updated_count": len(notifications)}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a single notification by ID."""
    stmt = select(Notification).where(
        and_(
            Notification.id == notification_id,
            Notification.student_id == current_user.id,
        )
    )
    res = await db.execute(stmt)
    notif = res.scalars().first()
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )
    await db.delete(notif)
    await db.commit()
    return {"status": "ok", "id": notification_id}


@router.delete("")
async def delete_all_notifications(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete all notifications for current user."""
    stmt = select(Notification).where(Notification.student_id == current_user.id)
    res = await db.execute(stmt)
    notifications = res.scalars().all()
    count = len(notifications)
    for notif in notifications:
        await db.delete(notif)
    await db.commit()
    return {"status": "ok", "deleted_count": count}
