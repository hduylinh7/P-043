from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models.auth import UserResponse
from src.models.goal import (
    GoalCreateRequest,
    GoalResponse,
    GoalStatusUpdateRequest,
    GoalUpdateRequest,
)
from src.routers.auth_router import get_current_user
from src.services.goal_service import GoalService

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("", response_model=list[GoalResponse])
async def get_goals(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    status: str | None = Query(default=None, description="Filter by status: ACTIVE, COMPLETED, ARCHIVED"),
    priority: str | None = Query(default=None, description="Filter by priority: LOW, MEDIUM, HIGH, CRITICAL"),
    category: str | None = Query(default=None, description="Filter by category: LEARNING, CAREER, PERSONAL, HEALTH, OTHER"),
    sort_by: str = Query(default="target_date", description="Sort by: target_date, priority, updated_at"),
    db: AsyncSession = Depends(get_db),
):
    """Fetch current student's goals with optional filtering and sorting."""
    return await GoalService.get_goals(
        db=db,
        current_user=current_user,
        status_filter=status,
        priority_filter=priority,
        category_filter=category,
        sort_by=sort_by,
    )


@router.post("", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Student creates a new personal/career goal."""
    return await GoalService.create_goal(db, payload, current_user)


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal_detail(
    goal_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get goal detail by ID."""
    return await GoalService.get_goal_detail(db, goal_id, current_user)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: str,
    payload: GoalUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update goal details."""
    return await GoalService.update_goal(db, goal_id, payload, current_user)


@router.delete("/{goal_id}")
async def delete_goal(
    goal_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a goal."""
    return await GoalService.delete_goal(db, goal_id, current_user)


@router.patch("/{goal_id}/status", response_model=GoalResponse)
async def update_goal_status(
    goal_id: str,
    payload: GoalStatusUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update goal status (ACTIVE, COMPLETED, ARCHIVED)."""
    return await GoalService.update_goal_status(db, goal_id, payload, current_user)
