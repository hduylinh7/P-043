from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models.auth import UserResponse
from src.models.schemas import (
    MessageResponse,
    SessionCreate,
    SessionResponse,
)
from src.routers.auth_router import get_current_user
from src.services.db_service import (
    create_session,
    get_session_messages,
    list_sessions,
)

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.post("", response_model=SessionResponse)
async def create_new_session(
    payload: SessionCreate,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new chat session for authenticated user."""
    session = await create_session(db, user_id=current_user.id, title=payload.title)
    return session


@router.get("", response_model=list[SessionResponse])
async def get_user_sessions(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """List sessions for current authenticated user."""
    sessions = await list_sessions(db, user_id=current_user.id)
    return sessions


@router.get("/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(
    session_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a session."""
    messages = await get_session_messages(db, session_id=session_id)
    return messages
