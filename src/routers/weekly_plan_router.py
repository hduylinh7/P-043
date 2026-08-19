from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models.auth import UserResponse
from src.models.weekly_plan import (
    PlanTaskCreateRequest,
    PlanTaskReflectionRequest,
    PlanTaskResponse,
    PlanTaskStatusUpdateRequest,
    PlanTaskUpdateRequest,
    SelfCheckEvalRequest,
    SelfCheckEvalResponse,
    StudySessionCompanionResponse,
    WeeklyPlanCreateRequest,
    WeeklyPlanResponse,
    WeeklyPlanUpdateRequest,
)
from src.routers.auth_router import get_current_user
from src.services.weekly_plan_service import WeeklyPlanService

router = APIRouter(tags=["Weekly Plans"])


@router.get("/weekly-plans/unified-calendar")
async def get_unified_calendar(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    week_start: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """Fetch unified student calendar events (Fixed Classes, AI Planned, Student Study Sessions)."""
    return await WeeklyPlanService.get_unified_calendar(db, current_user, week_start=week_start)


# 1. Weekly Plan APIs
@router.get("/weekly-plans", response_model=list[WeeklyPlanResponse])
async def get_weekly_plans(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch current student's weekly plans with nested tasks."""
    return await WeeklyPlanService.get_weekly_plans(db, current_user)


@router.get("/weekly-plans/{id}", response_model=WeeklyPlanResponse)
async def get_weekly_plan_detail(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get weekly plan details by ID."""
    return await WeeklyPlanService.get_weekly_plan_detail(db, id, current_user)


@router.post("/weekly-plans", response_model=WeeklyPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_weekly_plan(
    payload: WeeklyPlanCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a new weekly plan."""
    return await WeeklyPlanService.create_weekly_plan(db, payload, current_user)


@router.put("/weekly-plans/{id}", response_model=WeeklyPlanResponse)
async def update_weekly_plan(
    id: str,
    payload: WeeklyPlanUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update weekly plan metadata."""
    return await WeeklyPlanService.update_weekly_plan(db, id, payload, current_user)


@router.delete("/weekly-plans/{id}")
async def delete_weekly_plan(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a weekly plan."""
    return await WeeklyPlanService.delete_weekly_plan(db, id, current_user)


# 2. Plan Task APIs
@router.get("/weekly-plans/{id}/tasks", response_model=list[PlanTaskResponse])
async def get_weekly_plan_tasks(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch tasks for a specific weekly plan."""
    return await WeeklyPlanService.get_weekly_plan_tasks(db, id, current_user)


@router.post("/weekly-plans/{id}/tasks", response_model=PlanTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_weekly_plan_task(
    id: str,
    payload: PlanTaskCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Create a task inside a specific weekly plan."""
    return await WeeklyPlanService.create_task(db, id, payload, current_user)


@router.get("/tasks/{id}", response_model=PlanTaskResponse)
async def get_task_by_id(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get a task by ID."""
    return await WeeklyPlanService.get_task_by_id(db, id, current_user)


@router.put("/tasks/{id}", response_model=PlanTaskResponse)
async def update_task(
    id: str,
    payload: PlanTaskUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update a task's details."""
    return await WeeklyPlanService.update_task(db, id, payload, current_user)


@router.delete("/tasks/{id}")
async def delete_task(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Delete a task."""
    return await WeeklyPlanService.delete_task(db, id, current_user)


@router.patch("/tasks/{id}/status", response_model=PlanTaskResponse)
async def update_task_status(
    id: str,
    payload: PlanTaskStatusUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Update task status (todo, in_progress, completed, skipped)."""
    return await WeeklyPlanService.update_task_status(db, id, payload, current_user)


@router.post("/tasks/{id}/reflection", response_model=PlanTaskResponse)
async def save_task_reflection(
    id: str,
    payload: PlanTaskReflectionRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Submit study session reflection and generate AI learning insights."""
    return await WeeklyPlanService.save_task_reflection(db, id, payload, current_user)


@router.get("/tasks/{id}/study-companion", response_model=StudySessionCompanionResponse)
async def get_study_session_companion_data(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch grounded Learning Objectives, AI Study Guide, Sources, Related Assignment, and Quick Self-Check questions for a study session."""
    return await WeeklyPlanService.get_study_session_companion_data(db, id, current_user)


@router.post("/tasks/{id}/self-check/evaluate", response_model=SelfCheckEvalResponse)
async def evaluate_self_check_answer(
    id: str,
    payload: SelfCheckEvalRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Evaluate student's quick self-check response and return instant non-graded AI feedback."""
    return await WeeklyPlanService.evaluate_self_check_answer(db, id, payload, current_user)

