from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models.auth import UserResponse
from src.models.planner_agent import PlannerAgentRequest, PlannerAgentResponse
from src.models.planner_context import PlannerContext
from src.routers.auth_router import get_current_user
from src.services.planner_agent_service import PlannerAgentService
from src.services.planner_context_builder import PlannerContextBuilder

router = APIRouter(prefix="/planner", tags=["Planner Agent"])


@router.get("/context", response_model=PlannerContext)
async def get_planner_context(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    week_start: str | None = Query(
        default=None,
        description="Optional start date of planning week (YYYY-MM-DD). Defaults to current week Monday.",
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Fetch normalized Planner Context for the authenticated student.
    Aggregates active goals, upcoming assignments, active personal tasks, and current weekly plan.
    """
    return await PlannerContextBuilder.build_context(
        db=db,
        current_user=current_user,
        week_start=week_start,
    )


@router.post("/generate", response_model=PlannerAgentResponse)
async def generate_weekly_plan(
    payload: PlannerAgentRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """
    Execute AI Planner Agent to automatically generate/update the student's Weekly Plan.
    """
    return await PlannerAgentService.generate_plan(db, current_user, payload)

