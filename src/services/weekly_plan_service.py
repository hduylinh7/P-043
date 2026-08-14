from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.enums import normalize_priority
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal
from src.models.auth import UserResponse
from src.models.weekly_plan import (
    PlanTaskCreateRequest,
    PlanTaskResponse,
    PlanTaskStatusUpdateRequest,
    PlanTaskUpdateRequest,
    WeeklyPlanCreateRequest,
    WeeklyPlanResponse,
    WeeklyPlanUpdateRequest,
)


import json

def parse_datetime(val: datetime | str | None) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    try:
        # Handle ISO strings
        return datetime.fromisoformat(val.replace("Z", "+00:00"))
    except ValueError:
        return None


def pack_task_description(
    description: str | None = None,
    topic: str | None = None,
    what_to_study: list[str] | None = None,
    what_to_do: list[str] | None = None,
    reason: str | None = None,
    material_id: str | None = None,
    material_title: str | None = None,
    course_id: str | None = None,
    course_name: str | None = None,
    goal_id: str | None = None,
    goal_title: str | None = None,
) -> str | None:
    has_meta = any([
        topic, what_to_study, what_to_do, reason, material_id, material_title, course_id, course_name, goal_id, goal_title
    ])
    if not has_meta:
        return description

    meta = {
        "description": description,
        "topic": topic,
        "what_to_study": what_to_study or [],
        "what_to_do": what_to_do or [],
        "reason": reason,
        "material_id": material_id,
        "material_title": material_title,
        "course_id": course_id,
        "course_name": course_name,
        "goal_id": goal_id,
        "goal_title": goal_title,
    }
    return json.dumps(meta, ensure_ascii=False)


def serialize_task(task: Task) -> PlanTaskResponse:
    # Handle string vs enum values safely
    priority_val = str(task.priority.value) if hasattr(task.priority, "value") else str(task.priority)
    status_val = str(task.status.value) if hasattr(task.status, "value") else str(task.status)

    meta = {}
    if task.description and task.description.startswith("{") and task.description.endswith("}"):
        try:
            meta = json.loads(task.description)
        except Exception:
            meta = {}

    clean_desc = meta.get("description") if meta else task.description

    return PlanTaskResponse(
        id=task.id,
        weekly_goal_id=task.weekly_goal_id,
        assignment_id=task.assignment_id,
        title=task.title,
        description=clean_desc,
        topic=meta.get("topic") or task.title,
        what_to_study=meta.get("what_to_study") or [],
        what_to_do=meta.get("what_to_do") or [],
        reason=meta.get("reason"),
        material_id=meta.get("material_id"),
        material_title=meta.get("material_title"),
        course_id=meta.get("course_id"),
        course_name=meta.get("course_name"),
        goal_id=meta.get("goal_id"),
        goal_title=meta.get("goal_title"),
        priority=priority_val,
        status=status_val,
        scheduled_date=task.scheduled_date,
        start_time=task.start_time,
        end_time=task.end_time,
        estimated_duration=task.estimated_minutes,
        estimated_minutes=task.estimated_minutes,
        source_type=task.source_type or "MANUAL",
        source_id=task.source_id,
        created_at=task.created_at,
        updated_at=task.updated_at,
    )


def serialize_weekly_plan(plan: WeeklyGoal) -> WeeklyPlanResponse:
    status_val = str(plan.status.value) if hasattr(plan.status, "value") else str(plan.status)
    task_responses = [serialize_task(t) for t in (plan.tasks or [])]

    return WeeklyPlanResponse(
        id=plan.id,
        student_id=plan.student_id,
        title=plan.title,
        description=plan.description,
        week_start_date=plan.week_start_date,
        week_end_date=plan.week_end_date,
        status=status_val,
        generated_by_agent=plan.generated_by_agent,
        version=plan.version,
        generated_at=plan.generated_at,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
        tasks=task_responses,
    )


class WeeklyPlanService:
    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        if "student" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Weekly Plan feature is available for students only.",
            )

    @staticmethod
    async def get_weekly_plans(
        db: AsyncSession,
        current_user: UserResponse,
    ) -> list[WeeklyPlanResponse]:
        WeeklyPlanService._ensure_student(current_user)

        stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.student_id == current_user.id)
            .order_by(WeeklyGoal.week_start_date.desc())
        )
        res = await db.execute(stmt)
        plans = res.scalars().all()
        return [serialize_weekly_plan(p) for p in plans]

    @staticmethod
    async def get_weekly_plan_detail(
        db: AsyncSession,
        plan_id: str,
        current_user: UserResponse,
    ) -> WeeklyPlanResponse:
        WeeklyPlanService._ensure_student(current_user)

        stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.id == plan_id)
        )
        res = await db.execute(stmt)
        plan = res.scalar_one_or_none()

        if not plan or plan.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weekly plan not found.",
            )

        return serialize_weekly_plan(plan)

    @staticmethod
    async def create_weekly_plan(
        db: AsyncSession,
        payload: WeeklyPlanCreateRequest,
        current_user: UserResponse,
    ) -> WeeklyPlanResponse:
        WeeklyPlanService._ensure_student(current_user)

        start_dt = parse_datetime(payload.week_start_date)
        if not start_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid week_start_date format.",
            )

        end_dt = parse_datetime(payload.week_end_date)
        if not end_dt:
            end_dt = start_dt + timedelta(days=6)

        plan = WeeklyGoal(
            student_id=current_user.id,
            title=payload.title,
            description=payload.description,
            week_start_date=start_dt,
            week_end_date=end_dt,
            status=payload.status,
        )

        db.add(plan)
        await db.commit()
        await db.refresh(plan)

        # Reload with tasks
        stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.id == plan.id)
        )
        res = await db.execute(stmt)
        plan_with_tasks = res.scalar_one()

        return serialize_weekly_plan(plan_with_tasks)

    @staticmethod
    async def update_weekly_plan(
        db: AsyncSession,
        plan_id: str,
        payload: WeeklyPlanUpdateRequest,
        current_user: UserResponse,
    ) -> WeeklyPlanResponse:
        WeeklyPlanService._ensure_student(current_user)

        stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.id == plan_id)
        )
        res = await db.execute(stmt)
        plan = res.scalar_one_or_none()

        if not plan or plan.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weekly plan not found.",
            )

        if payload.title is not None:
            plan.title = payload.title
        if payload.description is not None:
            plan.description = payload.description
        if payload.week_start_date is not None:
            dt = parse_datetime(payload.week_start_date)
            if dt:
                plan.week_start_date = dt
        if payload.week_end_date is not None:
            dt = parse_datetime(payload.week_end_date)
            if dt:
                plan.week_end_date = dt
        if payload.status is not None:
            plan.status = payload.status

        await db.commit()
        await db.refresh(plan)
        return serialize_weekly_plan(plan)

    @staticmethod
    async def delete_weekly_plan(
        db: AsyncSession,
        plan_id: str,
        current_user: UserResponse,
    ) -> dict[str, str]:
        WeeklyPlanService._ensure_student(current_user)

        stmt = select(WeeklyGoal).where(WeeklyGoal.id == plan_id)
        res = await db.execute(stmt)
        plan = res.scalar_one_or_none()

        if not plan or plan.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weekly plan not found.",
            )

        await db.delete(plan)
        await db.commit()
        return {"message": "Weekly plan deleted successfully."}

    @staticmethod
    async def get_weekly_plan_tasks(
        db: AsyncSession,
        plan_id: str,
        current_user: UserResponse,
    ) -> list[PlanTaskResponse]:
        WeeklyPlanService._ensure_student(current_user)

        stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.id == plan_id)
        )
        res = await db.execute(stmt)
        plan = res.scalar_one_or_none()

        if not plan or plan.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weekly plan not found.",
            )

        return [serialize_task(t) for t in (plan.tasks or [])]

    @staticmethod
    async def create_task(
        db: AsyncSession,
        plan_id: str,
        payload: PlanTaskCreateRequest,
        current_user: UserResponse,
    ) -> PlanTaskResponse:
        WeeklyPlanService._ensure_student(current_user)

        stmt = select(WeeklyGoal).where(WeeklyGoal.id == plan_id)
        res = await db.execute(stmt)
        plan = res.scalar_one_or_none()

        if not plan or plan.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Weekly plan not found.",
            )

        sched_dt = parse_datetime(payload.scheduled_date)

        # Validate start_time < end_time
        if payload.start_time and payload.end_time and payload.start_time >= payload.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Giờ bắt đầu ({payload.start_time}) phải trước giờ kết thúc ({payload.end_time}).",
            )

        # Check schedule conflict with existing tasks in the same plan
        if sched_dt and payload.start_time and payload.end_time:
            tasks_stmt = select(Task).where(Task.weekly_goal_id == plan.id)
            tasks_res = await db.execute(tasks_stmt)
            existing_tasks = tasks_res.scalars().all()

            target_date = sched_dt.date() if isinstance(sched_dt, datetime) else sched_dt
            for t in existing_tasks:
                if t.scheduled_date and t.start_time and t.end_time:
                    t_date = t.scheduled_date.date() if isinstance(t.scheduled_date, datetime) else t.scheduled_date
                    if t_date == target_date:
                        if payload.start_time < t.end_time and payload.end_time > t.start_time:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Trùng lịch! Khung giờ ({payload.start_time} - {payload.end_time}) bị trùng với nhiệm vụ '{t.title}' ({t.start_time} - {t.end_time}). Vui lòng chọn khung giờ khác.",
                            )

        packed_desc = pack_task_description(
            description=payload.description,
            topic=payload.topic,
            what_to_study=payload.what_to_study,
            what_to_do=payload.what_to_do,
            reason=payload.reason,
            material_id=payload.material_id,
            material_title=payload.material_title,
            course_id=payload.course_id,
            course_name=payload.course_name,
            goal_id=payload.goal_id,
            goal_title=payload.goal_title,
        )

        task = Task(
            weekly_goal_id=plan.id,
            assignment_id=payload.assignment_id,
            title=payload.title,
            description=packed_desc,
            priority=normalize_priority(payload.priority),
            status=payload.status,
            scheduled_date=sched_dt,
            start_time=payload.start_time,
            end_time=payload.end_time,
            estimated_minutes=payload.estimated_duration,
            source_type=payload.source_type,
            source_id=payload.source_id,
        )

        db.add(task)
        await db.commit()
        await db.refresh(task)
        return serialize_task(task)

    @staticmethod
    async def update_task(
        db: AsyncSession,
        task_id: str,
        payload: PlanTaskUpdateRequest,
        current_user: UserResponse,
    ) -> PlanTaskResponse:
        WeeklyPlanService._ensure_student(current_user)

        stmt = select(Task).options(selectinload(Task.weekly_goal)).where(Task.id == task_id)
        res = await db.execute(stmt)
        task = res.scalar_one_or_none()

        if not task or not task.weekly_goal or task.weekly_goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or access denied.",
            )

        if payload.title is not None:
            task.title = payload.title
        if (
            payload.description is not None
            or payload.topic is not None
            or payload.what_to_study is not None
            or payload.what_to_do is not None
            or payload.reason is not None
            or payload.material_id is not None
            or payload.material_title is not None
            or payload.course_id is not None
            or payload.course_name is not None
            or payload.goal_id is not None
            or payload.goal_title is not None
        ):
            # Unpack existing meta if any
            existing_meta = {}
            if task.description and task.description.startswith("{") and task.description.endswith("}"):
                try:
                    existing_meta = json.loads(task.description)
                except Exception:
                    existing_meta = {}

            task.description = pack_task_description(
                description=payload.description if payload.description is not None else existing_meta.get("description"),
                topic=payload.topic if payload.topic is not None else existing_meta.get("topic"),
                what_to_study=payload.what_to_study if payload.what_to_study is not None else existing_meta.get("what_to_study"),
                what_to_do=payload.what_to_do if payload.what_to_do is not None else existing_meta.get("what_to_do"),
                reason=payload.reason if payload.reason is not None else existing_meta.get("reason"),
                material_id=payload.material_id if payload.material_id is not None else existing_meta.get("material_id"),
                material_title=payload.material_title if payload.material_title is not None else existing_meta.get("material_title"),
                course_id=payload.course_id if payload.course_id is not None else existing_meta.get("course_id"),
                course_name=payload.course_name if payload.course_name is not None else existing_meta.get("course_name"),
                goal_id=payload.goal_id if payload.goal_id is not None else existing_meta.get("goal_id"),
                goal_title=payload.goal_title if payload.goal_title is not None else existing_meta.get("goal_title"),
            )
        if payload.priority is not None:
            task.priority = normalize_priority(payload.priority)
        if payload.status is not None:
            task.status = payload.status
        if payload.scheduled_date is not None:
            task.scheduled_date = parse_datetime(payload.scheduled_date)
        if payload.start_time is not None:
            task.start_time = payload.start_time
        if payload.end_time is not None:
            task.end_time = payload.end_time
        if payload.estimated_duration is not None:
            task.estimated_minutes = payload.estimated_duration
        if payload.source_type is not None:
            task.source_type = payload.source_type
        if payload.source_id is not None:
            task.source_id = payload.source_id
        if payload.assignment_id is not None:
            task.assignment_id = payload.assignment_id

        # Check schedule conflict for updated task
        eff_date = parse_datetime(payload.scheduled_date) if payload.scheduled_date is not None else task.scheduled_date
        eff_start = payload.start_time if payload.start_time is not None else task.start_time
        eff_end = payload.end_time if payload.end_time is not None else task.end_time

        if eff_start and eff_end and eff_start >= eff_end:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Giờ bắt đầu ({eff_start}) phải trước giờ kết thúc ({eff_end}).",
            )

        if eff_date and eff_start and eff_end:
            tasks_stmt = select(Task).where(
                Task.weekly_goal_id == task.weekly_goal_id,
                Task.id != task.id,
            )
            tasks_res = await db.execute(tasks_stmt)
            existing_tasks = tasks_res.scalars().all()

            target_date = eff_date.date() if isinstance(eff_date, datetime) else eff_date
            for t in existing_tasks:
                if t.scheduled_date and t.start_time and t.end_time:
                    t_date = t.scheduled_date.date() if isinstance(t.scheduled_date, datetime) else t.scheduled_date
                    if t_date == target_date:
                        if eff_start < t.end_time and eff_end > t.start_time:
                            raise HTTPException(
                                status_code=status.HTTP_400_BAD_REQUEST,
                                detail=f"Trùng lịch! Khung giờ ({eff_start} - {eff_end}) bị trùng với nhiệm vụ '{t.title}' ({t.start_time} - {t.end_time}). Vui lòng chọn khung giờ khác.",
                            )

        await db.commit()
        await db.refresh(task)
        return serialize_task(task)

    @staticmethod
    async def delete_task(
        db: AsyncSession,
        task_id: str,
        current_user: UserResponse,
    ) -> dict[str, str]:
        WeeklyPlanService._ensure_student(current_user)

        stmt = select(Task).options(selectinload(Task.weekly_goal)).where(Task.id == task_id)
        res = await db.execute(stmt)
        task = res.scalar_one_or_none()

        if not task or not task.weekly_goal or task.weekly_goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or access denied.",
            )

        await db.delete(task)
        await db.commit()
        return {"message": "Task deleted successfully."}

    @staticmethod
    async def update_task_status(
        db: AsyncSession,
        task_id: str,
        payload: PlanTaskStatusUpdateRequest,
        current_user: UserResponse,
    ) -> PlanTaskResponse:
        WeeklyPlanService._ensure_student(current_user)

        stmt = select(Task).options(selectinload(Task.weekly_goal)).where(Task.id == task_id)
        res = await db.execute(stmt)
        task = res.scalar_one_or_none()

        if not task or not task.weekly_goal or task.weekly_goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or access denied.",
            )

        task.status = payload.status
        await db.commit()
        await db.refresh(task)
        return serialize_task(task)
