from typing import Any, TypedDict
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth import UserResponse
from src.models.planner_context import PlannerContext


class PlannerAgentState(TypedDict, total=False):
    """Typed state for the LangGraph Planner Agent execution pipeline."""

    db: AsyncSession
    current_user: UserResponse
    week_start: str
    week_end: str
    start_date: str
    end_date: str | None
    assignment_id: str | None
    user_request: str
    context: PlannerContext | dict[str, Any]
    plan_decision: dict[str, Any]
    weekly_plan_id: str | None
    created_tasks: list[dict[str, Any]]
    updated_tasks: list[dict[str, Any]]
    skipped_items: list[dict[str, Any]]
    warnings: list[str]
    summary: str
    error: str | None
