from datetime import timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.planner_graph import planner_agent_graph
from src.agents.planner_state import PlannerAgentState
from src.models.auth import UserResponse
from src.models.planner_agent import (
    PlannerAgentRequest,
    PlannerAgentResponse,
    PlannerTaskResult,
)
from src.services.planner_context_builder import format_iso, parse_week_start


class PlannerAgentService:
    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        if "student" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Planner Agent is available for students only.",
            )

    @classmethod
    async def generate_plan(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        payload: PlannerAgentRequest,
    ) -> PlannerAgentResponse:
        """
        Execute Planner Agent workflow for the authenticated student.
        """
        cls._ensure_student(current_user)

        start_date = parse_week_start(payload.start_date or payload.week_start)
        week_start_str = start_date.strftime("%Y-%m-%d")

        initial_state: PlannerAgentState = {
            "db": db,
            "current_user": current_user,
            "week_start": week_start_str,
            "start_date": payload.start_date or week_start_str,
            "end_date": payload.end_date,
            "assignment_id": payload.assignment_id,
            "user_request": payload.request or "Tự động lập kế hoạch học tập tối ưu.",
        }

        final_state = await planner_agent_graph.ainvoke(initial_state)

        if final_state.get("error"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=final_state["error"],
            )

        created_tasks = [
            PlannerTaskResult(
                id=t.get("id", ""),
                title=t.get("title", ""),
                scheduled_date=format_iso(t.get("scheduled_date")),
                start_time=t.get("start_time"),
                end_time=t.get("end_time"),
                priority=t.get("priority", "medium"),
                source_type=t.get("source_type", "MANUAL"),
                source_id=t.get("source_id"),
            )
            for t in final_state.get("created_tasks", [])
        ]

        updated_tasks = [
            PlannerTaskResult(
                id=t.get("id", ""),
                title=t.get("title", ""),
                scheduled_date=format_iso(t.get("scheduled_date")),
                start_time=t.get("start_time"),
                end_time=t.get("end_time"),
                priority=t.get("priority", "medium"),
                source_type=t.get("source_type", "MANUAL"),
                source_id=t.get("source_id"),
            )
            for t in final_state.get("updated_tasks", [])
        ]

        actual_week_start = final_state.get("week_start", week_start_str)
        actual_week_end = final_state.get("week_end", week_start_str)

        return PlannerAgentResponse(
            weekly_plan_id=final_state.get("weekly_plan_id"),
            week_start=actual_week_start,
            week_end=actual_week_end,
            summary=final_state.get("summary", "Đã lập thành công kế hoạch học tập."),
            created_tasks=created_tasks,
            updated_tasks=updated_tasks,
            skipped_items=final_state.get("skipped_items", []),
            warnings=final_state.get("warnings", []),
        )
