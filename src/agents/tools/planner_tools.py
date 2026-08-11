from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.learning.assignment import Assignment
from src.db.models.planning.goal import Goal
from src.db.models.planning.personal_task import PersonalTask
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal
from src.models.auth import UserResponse
from src.models.planner_context import PlannerContext
from src.models.weekly_plan import (
    PlanTaskCreateRequest,
    PlanTaskResponse,
    PlanTaskUpdateRequest,
    WeeklyPlanCreateRequest,
    WeeklyPlanResponse,
)
from src.services.planner_context_builder import PlannerContextBuilder, parse_week_start
from src.services.weekly_plan_service import WeeklyPlanService, parse_datetime

VALID_SOURCE_TYPES = {"ASSIGNMENT", "PERSONAL_TASK", "GOAL", "MANUAL"}


class PlannerTools:
    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        if "student" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Planner tools are available for students only.",
            )

    @classmethod
    async def get_planner_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        week_start: str | date | datetime | None = None,
    ) -> PlannerContext:
        """Fetch normalized Planner Context for the authenticated student."""
        return await PlannerContextBuilder.build_context(
            db=db, current_user=current_user, week_start=week_start
        )

    @classmethod
    async def get_current_weekly_plan(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        week_start: str | date | datetime | None = None,
    ) -> WeeklyPlanResponse | None:
        """Fetch the authenticated student's Weekly Plan for a specific week."""
        cls._ensure_student(current_user)
        target_monday = parse_week_start(week_start)

        plans = await WeeklyPlanService.get_weekly_plans(db, current_user)
        for p in plans:
            p_start = parse_datetime(p.week_start_date)
            if p_start and p_start.date() == target_monday:
                return p
        return None

    @classmethod
    async def get_weekly_plan_tasks(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        weekly_plan_id: str,
    ) -> list[PlanTaskResponse]:
        """Fetch tasks belonging to a specific Weekly Plan owned by the authenticated student."""
        cls._ensure_student(current_user)
        return await WeeklyPlanService.get_weekly_plan_tasks(db, weekly_plan_id, current_user)

    @classmethod
    async def create_weekly_plan(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        week_start: str,
        title: str,
        description: str | None = None,
    ) -> WeeklyPlanResponse:
        """Create a new Weekly Plan for the authenticated student after verifying no duplicate exists."""
        cls._ensure_student(current_user)
        start_date = parse_week_start(week_start)

        # Check for duplicate plan for the same week
        existing = await cls.get_current_weekly_plan(db, current_user, week_start=start_date)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Weekly plan already exists for week starting {start_date.strftime('%Y-%m-%d')}.",
            )

        end_date = start_date + timedelta(days=6)
        payload = WeeklyPlanCreateRequest(
            title=title,
            description=description,
            week_start_date=start_date.strftime("%Y-%m-%d"),
            week_end_date=end_date.strftime("%Y-%m-%d"),
            status="ACTIVE",
        )
        return await WeeklyPlanService.create_weekly_plan(db, payload, current_user)

    @classmethod
    async def create_plan_task(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        weekly_plan_id: str,
        title: str,
        description: str | None = None,
        scheduled_date: str | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        priority: str = "medium",
        estimated_duration: int | None = None,
        source_type: str = "MANUAL",
        source_id: str | None = None,
    ) -> PlanTaskResponse:
        """Create a task inside a Weekly Plan with full range, time, and source validation."""
        cls._ensure_student(current_user)

        # 1. Verify plan exists and belongs to current student
        plan = await WeeklyPlanService.get_weekly_plan_detail(db, weekly_plan_id, current_user)

        # 2. Validate scheduled_date belongs to plan date range
        if scheduled_date:
            sched_dt = parse_datetime(scheduled_date)
            plan_start = parse_datetime(plan.week_start_date)
            plan_end = parse_datetime(plan.week_end_date) if plan.week_end_date else None

            if sched_dt and plan_start and plan_end:
                if not (plan_start.date() <= sched_dt.date() <= plan_end.date()):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"scheduled_date '{scheduled_date}' must fall within weekly plan period ({plan.week_start_date} to {plan.week_end_date}).",
                    )

        # 3. Validate time range (start_time < end_time)
        if start_time and end_time:
            if start_time >= end_time:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"start_time ({start_time}) must be before end_time ({end_time}).",
                )

        # 4. Validate source_type
        clean_source_type = source_type.upper() if source_type else "MANUAL"
        if clean_source_type not in VALID_SOURCE_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid source_type '{source_type}'. Must be one of {list(VALID_SOURCE_TYPES)}.",
            )

        # 5. Validate source entity exists if source_id provided
        if source_id and clean_source_type != "MANUAL":
            if clean_source_type == "GOAL":
                res = await db.execute(select(Goal).where(Goal.id == source_id))
                goal_obj = res.scalar_one_or_none()
                if not goal_obj or goal_obj.student_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Goal with id '{source_id}' not found for current student.",
                    )
            elif clean_source_type == "PERSONAL_TASK":
                res = await db.execute(select(PersonalTask).where(PersonalTask.id == source_id))
                pt_obj = res.scalar_one_or_none()
                if not pt_obj or pt_obj.student_id != current_user.id:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"PersonalTask with id '{source_id}' not found for current student.",
                    )
            elif clean_source_type == "ASSIGNMENT":
                res = await db.execute(select(Assignment).where(Assignment.id == source_id))
                ass_obj = res.scalar_one_or_none()
                if not ass_obj:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail=f"Assignment with id '{source_id}' not found.",
                    )

        payload = PlanTaskCreateRequest(
            title=title,
            description=description,
            priority=priority,
            status="todo",
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=end_time,
            estimated_duration=estimated_duration,
            source_type=clean_source_type,
            source_id=source_id,
            assignment_id=source_id if clean_source_type == "ASSIGNMENT" else None,
        )
        return await WeeklyPlanService.create_task(db, weekly_plan_id, payload, current_user)

    @classmethod
    async def update_plan_task(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        task_id: str,
        title: str | None = None,
        description: str | None = None,
        scheduled_date: str | None = None,
        start_time: str | None = None,
        end_time: str | None = None,
        priority: str | None = None,
        estimated_duration: int | None = None,
        status: str | None = None,
    ) -> PlanTaskResponse:
        """Update an existing task with ownership, range, and time validations."""
        cls._ensure_student(current_user)

        # 1. Fetch task and check ownership
        stmt = select(Task).where(Task.id == task_id)
        res = await db.execute(stmt)
        task_obj = res.scalar_one_or_none()

        if not task_obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Task with id '{task_id}' not found.",
            )

        plan = await WeeklyPlanService.get_weekly_plan_detail(
            db, task_obj.weekly_goal_id, current_user
        )

        # 2. Validate updated scheduled_date if provided
        if scheduled_date:
            sched_dt = parse_datetime(scheduled_date)
            plan_start = parse_datetime(plan.week_start_date)
            plan_end = parse_datetime(plan.week_end_date) if plan.week_end_date else None

            if sched_dt and plan_start and plan_end:
                if not (plan_start.date() <= sched_dt.date() <= plan_end.date()):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"scheduled_date '{scheduled_date}' must fall within weekly plan period ({plan.week_start_date} to {plan.week_end_date}).",
                    )

        # 3. Validate updated time range
        eff_start = start_time if start_time is not None else task_obj.start_time
        eff_end = end_time if end_time is not None else task_obj.end_time
        if eff_start and eff_end and eff_start >= eff_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"start_time ({eff_start}) must be before end_time ({eff_end}).",
            )

        payload = PlanTaskUpdateRequest(
            title=title,
            description=description,
            scheduled_date=scheduled_date,
            start_time=start_time,
            end_time=end_time,
            priority=priority,
            estimated_duration=estimated_duration,
            status=status,
        )
        return await WeeklyPlanService.update_task(db, task_id, payload, current_user)

    @classmethod
    async def delete_plan_task(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        task_id: str,
    ) -> dict[str, str]:
        """Delete a task owned by the authenticated student."""
        cls._ensure_student(current_user)
        return await WeeklyPlanService.delete_task(db, task_id, current_user)
