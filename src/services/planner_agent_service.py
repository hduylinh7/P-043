from datetime import datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.nodes.planner_nodes import (
    analyze_and_decide_node,
    load_context_node,
    resolve_proposed_tasks_for_preview,
)
from src.agents.planner_graph import planner_agent_graph
from src.agents.planner_state import PlannerAgentState
from src.agents.tools.planner_tools import PlannerTools
from src.db.enums import normalize_priority
from src.models.auth import UserResponse
from src.models.planner_agent import (
    PlannerAgentRequest,
    PlannerAgentResponse,
    PlannerApplyRequest,
    PlannerProposedTask,
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
        By default (auto_apply=False), generates a draft preview plan for user review.
        If auto_apply=True, saves directly to database.
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
            "user_request": payload.user_message or payload.request or "Tự động lập kế hoạch học tập tối ưu.",
        }

        # If auto_apply is True, execute full graph (including DB tool execution)
        if payload.auto_apply:
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

            actual_week_start = final_state.get("week_start", week_start_str)
            actual_week_end = final_state.get("week_end", week_start_str)

            return PlannerAgentResponse(
                weekly_plan_id=final_state.get("weekly_plan_id"),
                week_start=actual_week_start,
                week_end=actual_week_end,
                summary=final_state.get("summary", "Đã lập thành công kế hoạch học tập."),
                plan_title=final_state.get("plan_title"),
                is_preview=False,
                created_tasks=created_tasks,
                skipped_items=final_state.get("skipped_items", []),
                warnings=final_state.get("warnings", []),
            )

        # Default preview mode: Load context -> LLM decide -> Resolve preview tasks (NO DB WRITE)
        step1 = await load_context_node(initial_state)
        initial_state.update(step1)

        if initial_state.get("error"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=initial_state["error"],
            )

        step2 = await analyze_and_decide_node(initial_state)
        initial_state.update(step2)

        preview_res = await resolve_proposed_tasks_for_preview(initial_state)

        actual_week_start = preview_res.get("week_start", week_start_str)
        actual_week_end = (start_date + timedelta(days=6)).strftime("%Y-%m-%d")

        proposed_tasks = [
            PlannerProposedTask(**t) for t in preview_res.get("proposed_tasks", [])
        ]

        return PlannerAgentResponse(
            weekly_plan_id=None,
            week_start=actual_week_start,
            week_end=actual_week_end,
            summary=preview_res.get("summary", "Đã lập xong dự thảo kế hoạch học tập."),
            plan_title=preview_res.get("plan_title"),
            is_preview=True,
            proposed_tasks=proposed_tasks,
            skipped_items=preview_res.get("skipped_items", []),
            warnings=preview_res.get("warnings", []),
        )

    @classmethod
    async def apply_plan(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        payload: PlannerApplyRequest,
    ) -> PlannerAgentResponse:
        """
        Accept and persist approved draft plan tasks into database.
        """
        cls._ensure_student(current_user)

        week_start = payload.week_start
        week_end = payload.week_end
        if not week_end:
            try:
                start_dt = datetime.strptime(week_start, "%Y-%m-%d").date()
                week_end = (start_dt + timedelta(days=6)).strftime("%Y-%m-%d")
            except Exception:
                week_end = week_start

        # 1. Fetch or create WeeklyPlan
        plan = await PlannerTools.get_current_weekly_plan(db, current_user, week_start=week_start)
        if not plan:
            plan_title = payload.plan_title or f"Kế hoạch học tập {week_start}"
            plan = await PlannerTools.create_weekly_plan(
                db, current_user, week_start=week_start, week_end=week_end, title=plan_title
            )

        weekly_plan_id = plan.id
        created_tasks: list[PlannerTaskResult] = []
        warnings: list[str] = []

        # 2. Persist tasks to DB
        for task_data in payload.tasks:
            t_dict = task_data.model_dump()
            try:
                task_res = await PlannerTools.create_plan_task(
                    db=db,
                    current_user=current_user,
                    weekly_plan_id=weekly_plan_id,
                    title=t_dict.get("title", "Buổi học tập"),
                    description=t_dict.get("description"),
                    topic=t_dict.get("topic"),
                    what_to_study=t_dict.get("what_to_study"),
                    what_to_do=t_dict.get("what_to_do"),
                    reason=t_dict.get("reason"),
                    material_id=t_dict.get("material_id"),
                    material_title=t_dict.get("material_title"),
                    course_id=t_dict.get("course_id"),
                    course_name=t_dict.get("course_name"),
                    goal_id=t_dict.get("goal_id"),
                    goal_title=t_dict.get("goal_title"),
                    scheduled_date=t_dict.get("scheduled_date"),
                    start_time=t_dict.get("start_time"),
                    end_time=t_dict.get("end_time"),
                    priority=normalize_priority(t_dict.get("priority", "medium")),
                    estimated_duration=t_dict.get("estimated_duration") or 90,
                    source_type=t_dict.get("source_type", "AI_PLAN") or "AI_PLAN",
                    source_id=t_dict.get("source_id"),
                )
                created_tasks.append(
                    PlannerTaskResult(
                        id=task_res.id,
                        title=task_res.title,
                        description=task_res.description,
                        topic=task_res.topic,
                        what_to_study=task_res.what_to_study,
                        what_to_do=task_res.what_to_do,
                        reason=task_res.reason,
                        scheduled_date=format_iso(task_res.scheduled_date),
                        start_time=task_res.start_time,
                        end_time=task_res.end_time,
                        priority=task_res.priority,
                        estimated_duration=task_res.estimated_duration,
                        source_type=task_res.source_type,
                        source_id=task_res.source_id,
                        course_id=task_res.course_id,
                        course_name=task_res.course_name,
                        material_id=task_res.material_id,
                        material_title=task_res.material_title,
                        goal_id=task_res.goal_id,
                        goal_title=task_res.goal_title,
                    )
                )
            except Exception as e:
                try:
                    await db.rollback()
                except Exception:
                    pass
                warnings.append(f"Không thể lưu nhiệm vụ '{t_dict.get('title')}': {e}")

        return PlannerAgentResponse(
            weekly_plan_id=weekly_plan_id,
            week_start=week_start,
            week_end=week_end,
            summary=payload.summary or "Đã áp dụng và lưu thành công kế hoạch học tập.",
            plan_title=payload.plan_title or f"Kế hoạch học tập {week_start}",
            is_preview=False,
            created_tasks=created_tasks,
            warnings=warnings,
        )

