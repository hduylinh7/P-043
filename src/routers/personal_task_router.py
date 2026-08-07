from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models.auth import UserResponse
from src.models.personal_task import (
    PersonalTaskCreateRequest,
    PersonalTaskResponse,
    PersonalTaskStatusUpdateRequest,
    PersonalTaskUpdateRequest,
)
from src.routers.auth_router import get_current_user
from src.services.personal_task_service import PersonalTaskService

router = APIRouter(prefix="/personal-tasks", tags=["Personal Tasks"])


@router.get("", response_model=list[PersonalTaskResponse])
async def get_personal_tasks(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    status: str | None = Query(default=None, description="Filter by status: NOT_STARTED, IN_PROGRESS, COMPLETED"),
    priority: str | None = Query(default=None, description="Filter by priority: LOW, MEDIUM, HIGH, CRITICAL"),
    category: str | None = Query(default=None, description="Filter by category: STUDY, CAREER, PERSONAL, HEALTH, MEETING, OTHER"),
    sort_by: str = Query(default="due_date", description="Sort by: due_date, priority, updated_at"),
    db: AsyncSession = Depends(get_db),
):
    """Fetch current student's personal tasks with optional filtering and sorting."""
    return await PersonalTaskService.get_personal_tasks(
        db=db,
        current_user=current_user,
        status_filter=status,
        priority_filter=priority,
        category_filter=category,
        sort_by=sort_by,
    )


@router.post("", response_model=PersonalTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_personal_task(
    payload: PersonalTaskCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Student creates a new personal task."""
    return await PersonalTaskService.create_personal_task(db, payload, current_user)


@router.get("/{id}", response_model=PersonalTaskResponse)
async def get_personal_task_detail(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get personal task detail by ID."""
    return await PersonalTaskService.get_personal_task_detail(db, id, current_user)


@router.put("/{id}", response_model=PersonalTaskResponse)
async def update_personal_task(
    id: str,
    payload: PersonalTaskUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update personal task details."""
    return await PersonalTaskService.update_personal_task(db, id, payload, current_user)


@router.delete("/{id}")
async def delete_personal_task(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a personal task."""
    return await PersonalTaskService.delete_personal_task(db, id, current_user)


@router.patch("/{id}/status", response_model=PersonalTaskResponse)
async def update_personal_task_status(
    id: str,
    payload: PersonalTaskStatusUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update task status (NOT_STARTED, IN_PROGRESS, COMPLETED)."""
    return await PersonalTaskService.update_personal_task_status(db, id, payload, current_user)
