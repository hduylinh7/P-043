from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.enums import EnrollmentRoleEnum, normalize_priority
from src.db.models.learning.course import Course
from src.db.models.learning.enrollment import Enrollment
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal
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
from src.services.schedule_utils import check_task_conflict_with_fixed_schedules


import json

def parse_datetime(val: datetime | str | None) -> datetime | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val
    if isinstance(val, date):
        return datetime.combine(val, datetime.min.time())
    try:
        val_clean = str(val).strip()
        if len(val_clean) == 10 and val_clean.count("-") == 2:
            d = date.fromisoformat(val_clean)
            return datetime.combine(d, datetime.min.time())
        return datetime.fromisoformat(val_clean.replace("Z", "+00:00"))
    except ValueError:
        return None


def format_iso_date_clean(val: datetime | date | str | None) -> str | None:
    if val is None:
        return None
    if isinstance(val, str):
        val_clean = val.strip()
        if "T" in val_clean:
            try:
                dt = datetime.fromisoformat(val_clean.replace("Z", "+00:00"))
                return format_iso_date_clean(dt)
            except Exception:
                return val_clean.split("T")[0]
        return val_clean
    if isinstance(val, datetime):
        if val.tzinfo is not None:
            offset = val.utcoffset()
            if offset is not None and offset.total_seconds() == 0 and (val.hour >= 17 or (val.hour == 0 and val.minute == 0)):
                local_dt = val + timedelta(hours=7)
                return local_dt.strftime("%Y-%m-%d")
            elif offset is not None:
                local_dt = val + offset
                return local_dt.strftime("%Y-%m-%d")
        return val.strftime("%Y-%m-%d")
    if isinstance(val, date):
        return val.strftime("%Y-%m-%d")
    return str(val)


def normalize_time_str(ts: str | None) -> str | None:
    if not ts:
        return ts
    ts_clean = str(ts).strip()
    parts = ts_clean.split(":")
    if len(parts) >= 2:
        h, m = parts[0], parts[1]
        if len(h) == 1:
            h = f"0{h}"
        return f"{h}:{m[:2]}"
    return ts_clean


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
    started_at: str | None = None,
    completed_at: str | None = None,
    actual_duration: int | None = None,
    completed_activities: list[str] | None = None,
    reflection_data: dict | None = None,
    ai_insight: str | None = None,
    suggested_next_focus: str | None = None,
    companion_data: dict | None = None,
) -> str | None:
    has_meta = any([
        topic, what_to_study, what_to_do, reason, material_id, material_title,
        course_id, course_name, goal_id, goal_title, started_at, completed_at,
        actual_duration, completed_activities, reflection_data, ai_insight, suggested_next_focus, companion_data
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
        "started_at": started_at,
        "completed_at": completed_at,
        "actual_duration": actual_duration,
        "completed_activities": completed_activities or [],
        "reflection_data": reflection_data,
        "ai_insight": ai_insight,
        "suggested_next_focus": suggested_next_focus,
        "companion_data": companion_data,
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
    clean_sched_date = format_iso_date_clean(task.scheduled_date)

    companion_val = meta.get("companion_data")

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
        scheduled_date=clean_sched_date,
        start_time=task.start_time,
        end_time=task.end_time,
        estimated_duration=task.estimated_minutes,
        estimated_minutes=task.estimated_minutes,
        source_type=task.source_type or "MANUAL",
        source_id=task.source_id,
        started_at=meta.get("started_at"),
        completed_at=meta.get("completed_at"),
        actual_duration=meta.get("actual_duration"),
        completed_activities=meta.get("completed_activities") or [],
        reflection_data=meta.get("reflection_data"),
        ai_insight=meta.get("ai_insight"),
        suggested_next_focus=meta.get("suggested_next_focus"),
        companion_data=companion_val,
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
        week_start_date=format_iso_date_clean(plan.week_start_date) or str(plan.week_start_date),
        week_end_date=format_iso_date_clean(plan.week_end_date) or str(plan.week_end_date),
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
        res = await db.execute(
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.id == plan_id)
        )
        plan = res.scalar_one()
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

        # Check schedule conflict with fixed university course schedules and existing plan tasks & auto-shift if overlapped
        if sched_dt and payload.start_time and payload.end_time:
            # 1. Fixed Course Schedules Conflict Check
            enroll_stmt = (
                select(Course)
                .join(Enrollment, Enrollment.course_id == Course.id)
                .options(selectinload(Course.schedules))
                .where(
                    (Enrollment.user_id == current_user.id)
                    & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
                    & (Enrollment.status == "active")
                )
            )
            enroll_res = await db.execute(enroll_stmt)
            enrolled_courses = enroll_res.scalars().all()

            fixed_conflict = check_task_conflict_with_fixed_schedules(
                scheduled_date=sched_dt,
                start_time=payload.start_time,
                end_time=payload.end_time,
                enrolled_courses=enrolled_courses,
            )
            if fixed_conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Trùng lịch! Khung giờ ({payload.start_time} - {payload.end_time}) bị trùng với Lịch học giảng đường cố định môn '{fixed_conflict['course_name']}' ({fixed_conflict['fixed_start_time']} - {fixed_conflict['fixed_end_time']}). Vui lòng chọn khung giờ khác.",
                )

            # 2. Existing Tasks Conflict Check
            tasks_stmt = select(Task).where(Task.weekly_goal_id == plan.id)
            tasks_res = await db.execute(tasks_stmt)
            existing_tasks = tasks_res.scalars().all()

            target_date = sched_dt.date() if isinstance(sched_dt, datetime) else sched_dt

            def check_overlap(st_str: str, et_str: str) -> bool:
                for t in existing_tasks:
                    if t.scheduled_date and t.start_time and t.end_time:
                        t_date = t.scheduled_date.date() if isinstance(t.scheduled_date, datetime) else t.scheduled_date
                        if t_date == target_date:
                            if st_str < t.end_time and et_str > t.start_time:
                                return True
                return False

            if check_overlap(payload.start_time, payload.end_time):
                try:
                    t1 = datetime.strptime(payload.start_time, "%H:%M")
                    t2 = datetime.strptime(payload.end_time, "%H:%M")
                    duration_mins = int((t2 - t1).total_seconds() / 60)
                    if duration_mins <= 0:
                        duration_mins = 120
                except Exception:
                    duration_mins = 120

                # Search next available slot starting from 07:00 to 22:00
                found_slot = False
                for hour in range(7, 22):
                    candidate_st = datetime.strptime(f"{hour:02d}:00", "%H:%M")
                    candidate_et = candidate_st + timedelta(minutes=duration_mins)
                    if candidate_et.hour >= 23 and candidate_et.minute > 0:
                        break
                    st_str = candidate_st.strftime("%H:%M")
                    et_str = candidate_et.strftime("%H:%M")
                    if not check_overlap(st_str, et_str):
                        payload.start_time = st_str
                        payload.end_time = et_str
                        found_slot = True
                        break

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
    async def get_task_by_id(
        db: AsyncSession,
        task_id: str,
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

        # Unpack existing meta if any
        existing_meta = {}
        if task.description and task.description.startswith("{") and task.description.endswith("}"):
            try:
                existing_meta = json.loads(task.description)
            except Exception:
                existing_meta = {}

        meta_updated = False
        meta_fields = [
            "description", "topic", "what_to_study", "what_to_do", "reason",
            "material_id", "material_title", "course_id", "course_name", "goal_id",
            "goal_title", "started_at", "completed_at", "actual_duration", "completed_activities"
        ]

        for field in meta_fields:
            if getattr(payload, field, None) is not None:
                meta_updated = True
                break

        if meta_updated:
            # Auto calculate timing if completing
            new_status = payload.status if payload.status is not None else (str(task.status.value) if hasattr(task.status, "value") else str(task.status))
            eff_started_at = payload.started_at if payload.started_at is not None else existing_meta.get("started_at")
            eff_completed_at = payload.completed_at if payload.completed_at is not None else existing_meta.get("completed_at")
            eff_actual_dur = payload.actual_duration if payload.actual_duration is not None else existing_meta.get("actual_duration")

            if (new_status in ("in_progress", "IN_PROGRESS")) and not eff_started_at:
                eff_started_at = datetime.now(timezone.utc).isoformat()

            if (new_status in ("completed", "COMPLETED")) and not eff_completed_at:
                eff_completed_at = datetime.now(timezone.utc).isoformat()
                if eff_started_at and not eff_actual_dur:
                    try:
                        s_dt = parse_datetime(eff_started_at)
                        c_dt = parse_datetime(eff_completed_at)
                        if s_dt and c_dt:
                            eff_actual_dur = max(1, int((c_dt - s_dt).total_seconds() / 60))
                    except Exception:
                        pass

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
                started_at=eff_started_at,
                completed_at=eff_completed_at,
                actual_duration=eff_actual_dur,
                completed_activities=payload.completed_activities if payload.completed_activities is not None else existing_meta.get("completed_activities"),
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
            # 1. Fixed Course Schedules Conflict Check
            enroll_stmt = (
                select(Course)
                .join(Enrollment, Enrollment.course_id == Course.id)
                .options(selectinload(Course.schedules))
                .where(
                    (Enrollment.user_id == current_user.id)
                    & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
                    & (Enrollment.status == "active")
                )
            )
            enroll_res = await db.execute(enroll_stmt)
            enrolled_courses = enroll_res.scalars().all()

            fixed_conflict = check_task_conflict_with_fixed_schedules(
                scheduled_date=eff_date,
                start_time=eff_start,
                end_time=eff_end,
                enrolled_courses=enrolled_courses,
            )
            if fixed_conflict:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Trùng lịch! Khung giờ ({eff_start} - {eff_end}) bị trùng với Lịch học giảng đường cố định môn '{fixed_conflict['course_name']}' ({fixed_conflict['fixed_start_time']} - {fixed_conflict['fixed_end_time']}). Vui lòng chọn khung giờ khác.",
                )

            # 2. Existing Tasks Conflict Check
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

        existing_meta = {}
        if task.description and task.description.startswith("{") and task.description.endswith("}"):
            try:
                existing_meta = json.loads(task.description)
            except Exception:
                existing_meta = {}

        new_status = payload.status
        started_at = existing_meta.get("started_at")
        completed_at = existing_meta.get("completed_at")
        actual_duration = existing_meta.get("actual_duration")

        if (new_status in ("in_progress", "IN_PROGRESS")) and not started_at:
            started_at = datetime.now(timezone.utc).isoformat()

        if (new_status in ("completed", "COMPLETED")) and not completed_at:
            completed_at = datetime.now(timezone.utc).isoformat()
            if started_at and not actual_duration:
                try:
                    s_dt = parse_datetime(started_at)
                    c_dt = parse_datetime(completed_at)
                    if s_dt and c_dt:
                        actual_duration = max(1, int((c_dt - s_dt).total_seconds() / 60))
                except Exception:
                    pass

        task.status = new_status
        task.description = pack_task_description(
            description=existing_meta.get("description"),
            topic=existing_meta.get("topic"),
            what_to_study=existing_meta.get("what_to_study"),
            what_to_do=existing_meta.get("what_to_do"),
            reason=existing_meta.get("reason"),
            material_id=existing_meta.get("material_id"),
            material_title=existing_meta.get("material_title"),
            course_id=existing_meta.get("course_id"),
            course_name=existing_meta.get("course_name"),
            goal_id=existing_meta.get("goal_id"),
            goal_title=existing_meta.get("goal_title"),
            started_at=started_at,
            completed_at=completed_at,
            actual_duration=actual_duration,
            completed_activities=existing_meta.get("completed_activities"),
        )

        await db.commit()
        await db.refresh(task)
        return serialize_task(task)

    @staticmethod
    async def save_task_reflection(
        db: AsyncSession,
        task_id: str,
        payload: PlanTaskReflectionRequest,
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

        existing_meta = {}
        if task.description and task.description.startswith("{") and task.description.endswith("}"):
            try:
                existing_meta = json.loads(task.description)
            except Exception:
                existing_meta = {}

        reflection_dict = {
            "what_learned": payload.what_learned,
            "understood_well": payload.understood_well,
            "struggling_with": payload.struggling_with,
            "understanding_level": payload.understanding_level,
            "achieved_goal": payload.achieved_goal,
        }

        topic = existing_meta.get("topic") or task.title
        course_name = existing_meta.get("course_name") or "Khóa học"

        ai_insight = f"Bạn đã hoàn thành tốt buổi học về '{topic}'. Cần chú ý thêm phần: {payload.struggling_with or 'các khái niệm khó'}."
        suggested_next_focus = f"Ôn tập và thực hành thêm kiến thức thuộc bài giảng {topic} ({course_name})."

        try:
            from src.services.llm import get_llm
            from langchain_core.messages import HumanMessage
            llm = get_llm(temperature=0.3)
            prompt = (
                f"Dựa trên phản hồi Reflection của sinh viên sau buổi học:\n"
                f"- Khóa học: {course_name}\n"
                f"- Chủ đề: {topic}\n"
                f"- Đã học được: {payload.what_learned or 'Chưa nhập'}\n"
                f"- Hiểu tốt: {payload.understood_well or 'Chưa nhập'}\n"
                f"- Vẫn vướng mắc: {payload.struggling_with or 'Chưa nhập'}\n"
                f"- Mức độ hiểu: {payload.understanding_level}\n"
                f"- Đạt mục tiêu: {payload.achieved_goal}\n\n"
                f"Hãy đưa ra 1 nhận xét ngắn gọn (ai_insight - max 2 câu) và 1 gợi ý trọng tâm tiếp theo (suggested_next_focus - max 1 câu) bằng tiếng Việt dưới dạng JSON:\n"
                f'{{"ai_insight": "...", "suggested_next_focus": "..."}}'
            )
            response = await llm.ainvoke([HumanMessage(content=prompt)])
            text = str(response.content)
            if "{" in text and "}" in text:
                json_str = text[text.find("{"):text.rfind("}")+1]
                parsed = json.loads(json_str)
                if parsed.get("ai_insight"):
                    ai_insight = parsed.get("ai_insight")
                if parsed.get("suggested_next_focus"):
                    suggested_next_focus = parsed.get("suggested_next_focus")
        except Exception as e:
            pass

        started_at = existing_meta.get("started_at") or datetime.now(timezone.utc).isoformat()
        completed_at = datetime.now(timezone.utc).isoformat()
        actual_duration = existing_meta.get("actual_duration")
        if started_at and not actual_duration:
            try:
                s_dt = parse_datetime(started_at)
                c_dt = parse_datetime(completed_at)
                if s_dt and c_dt:
                    actual_duration = max(1, int((c_dt - s_dt).total_seconds() / 60))
            except Exception:
                actual_duration = 30

        task.status = "completed"
        task.description = pack_task_description(
            description=existing_meta.get("description"),
            topic=existing_meta.get("topic"),
            what_to_study=existing_meta.get("what_to_study"),
            what_to_do=existing_meta.get("what_to_do"),
            reason=existing_meta.get("reason"),
            material_id=existing_meta.get("material_id"),
            material_title=existing_meta.get("material_title"),
            course_id=existing_meta.get("course_id"),
            course_name=existing_meta.get("course_name"),
            goal_id=existing_meta.get("goal_id"),
            goal_title=existing_meta.get("goal_title"),
            started_at=started_at,
            completed_at=completed_at,
            actual_duration=actual_duration,
            completed_activities=existing_meta.get("completed_activities"),
            reflection_data=reflection_dict,
            ai_insight=ai_insight,
            suggested_next_focus=suggested_next_focus,
        )

        await db.commit()
        await db.refresh(task)
        return serialize_task(task)

    @staticmethod
    async def get_study_session_companion_data(
        db: AsyncSession,
        task_id: str,
        current_user: UserResponse,
    ) -> StudySessionCompanionResponse:
        """
        Generate or fetch cached grounded companion data for a Study Session:
        - Learning Objectives
        - AI Study Guide (Key Concepts, Focus Areas, Important Points, Sources)
        - Source Traceability
        - Related Assignment Info
        - Quick Self-Check Questions (Non-graded)
        """
        WeeklyPlanService._ensure_student(current_user)

        stmt = select(Task).options(selectinload(Task.weekly_goal)).where(Task.id == task_id)
        res = await db.execute(stmt)
        task = res.scalar_one_or_none()

        if not task or not task.weekly_goal or task.weekly_goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or access denied.",
            )

        existing_meta = {}
        if task.description and task.description.startswith("{") and task.description.endswith("}"):
            try:
                existing_meta = json.loads(task.description)
            except Exception:
                existing_meta = {}

        # If companion_data is already generated and saved in metadata, return it
        cached_comp = existing_meta.get("companion_data")
        if cached_comp and isinstance(cached_comp, dict) and cached_comp.get("learning_objectives"):
            try:
                return StudySessionCompanionResponse(**cached_comp)
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Could not parse cached companion_data: {e}")

        # Retrieve course material chunks via RAGService
        course_id = existing_meta.get("course_id")
        material_id = existing_meta.get("material_id")
        assignment_id = task.assignment_id or existing_meta.get("assignment_id")
        topic = existing_meta.get("topic") or task.title
        course_name = existing_meta.get("course_name") or "Khóa học"
        what_to_study = existing_meta.get("what_to_study") or []
        what_to_do = existing_meta.get("what_to_do") or []

        # RAG Search
        retrieved_chunks = []
        try:
            from src.services.rag_service import RAGService
            query = f"{topic} {' '.join(what_to_study)}"
            retrieved_chunks = RAGService.search_course_materials(
                course_id=course_id,
                query=query,
                material_id=material_id,
                assignment_id=assignment_id,
                top_k=5,
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"RAG search failed for study session task {task_id}: {e}")

        # Fetch Related Assignment info if assignment_id exists
        related_assign_dict = None
        if assignment_id:
            try:
                from src.db.models.learning.assignment import Assignment
                a_stmt = select(Assignment).where(Assignment.id == assignment_id)
                a_res = await db.execute(a_stmt)
                assign_obj = a_res.scalar_one_or_none()
                if assign_obj:
                    due_str = format_iso_date_clean(assign_obj.due_at)
                    related_assign_dict = {
                        "id": assign_obj.id,
                        "title": assign_obj.title,
                        "due_date": due_str,
                        "description": assign_obj.description,
                        "why_relevant": f"Buổi học này củng cố các kiến thức trọng tâm để chuẩn bị cho bài tập '{assign_obj.title}'.",
                    }
            except Exception as a_err:
                import logging
                logging.getLogger(__name__).warning(f"Failed fetching assignment details: {a_err}")

        # Build Sources list
        sources_list = []
        if material_id and existing_meta.get("material_title"):
            sources_list.append({
                "title": existing_meta.get("material_title"),
                "file_name": existing_meta.get("material_title"),
                "material_id": material_id,
                "course_id": course_id,
            })
        for chunk in retrieved_chunks:
            meta = chunk.get("metadata", {})
            f_name = meta.get("file_name") or meta.get("title")
            m_id = meta.get("material_id")
            c_id = meta.get("course_id") or course_id
            if f_name and not any(s["file_name"] == f_name for s in sources_list):
                sources_list.append({
                    "title": meta.get("title") or f_name,
                    "file_name": f_name,
                    "material_id": m_id,
                    "course_id": c_id,
                })

        context_text = "\n\n".join([
            f"--- Snippet từ tài liệu '{c.get('metadata', {}).get('file_name', 'Tài liệu')}':\n{c.get('content', '')}"
            for c in retrieved_chunks
        ])

        system_instruction = (
            "You are a Personal Learning Companion AI Assistant. "
            "Generate grounded Study Guide, Learning Objectives, and Quick Self-Check questions from the provided course materials.\n"
            "STRICT RULES:\n"
            "1. Ground all information strictly in provided materials. Do not hallucinate external facts.\n"
            "2. learning_objectives: 3-4 actionable items in Vietnamese ('Giải thích...', 'Phân biệt...', 'Hiểu rõ...').\n"
            "3. ai_study_guide:\n"
            "   - key_concepts: 2-3 concepts (title, short definition in Vietnamese, main characteristics list, examples list).\n"
            "   - focus_area: 1 sentence highlighted focus in Vietnamese (e.g. ⭐ Trọng tâm cần chú ý là...).\n"
            "   - important_points: 3-5 key points in Vietnamese.\n"
            "4. quick_self_check: 2-3 lightweight non-graded self-check questions in Vietnamese with hint and explanation.\n"
            "5. Return valid JSON strictly matching the specified structure."
        )

        user_prompt = (
            f"Study Session Context:\n"
            f"- Course: {course_name}\n"
            f"- Topic: {topic}\n"
            f"- Topics to study: {', '.join(what_to_study)}\n"
            f"- Activities: {', '.join(what_to_do)}\n\n"
            f"Retrieved Course Material Snippets:\n"
            f"{context_text if context_text else 'No detailed snippets retrieved. Generate standard framework based on topic.'}\n\n"
            f"Return JSON:\n"
            f'{{\n'
            f'  "learning_objectives": [\n'
            f'    {{"id": "1", "text": "Giải thích khái niệm...", "checked": false}}\n'
            f'  ],\n'
            f'  "ai_study_guide": {{\n'
            f'    "key_concepts": [\n'
            f'      {{"title": "...", "definition": "...", "main_characteristics": ["..."], "examples": ["..."]}}\n'
            f'    ],\n'
            f'    "focus_area": "⭐ Trọng tâm cần chú ý đặc biệt...",\n'
            f'    "important_points": ["..."]\n'
            f'  }},\n'
            f'  "quick_self_check": [\n'
            f'    {{"id": "q1", "question": "...", "type": "short_answer", "options": [], "hint": "...", "sample_answer": "...", "explanation": "..."}}\n'
            f'  ]\n'
            f'}}'
        )

        comp_data_dict = {
            "learning_objectives": [
                {"id": "1", "text": f"Giải thích khái niệm cốt lõi về {topic}.", "checked": False},
                {"id": "2", "text": f"Phân biệt đặc điểm và ứng dụng chính của {topic}.", "checked": False},
                {"id": "3", "text": "Áp dụng kiến thức vào thực hành giải bài tập môn học.", "checked": False},
            ],
            "ai_study_guide": {
                "key_concepts": [
                    {
                        "title": topic,
                        "definition": f"Khái niệm và nguyên lý cốt lõi thuộc chủ đề {topic} môn {course_name}.",
                        "main_characteristics": what_to_study or [f"Đặc điểm chính của {topic}"],
                        "examples": [f"Ví dụ thực tế thuộc môn {course_name}"],
                    }
                ],
                "focus_area": f"⭐ Tập trung hiểu rõ {topic} và ứng dụng của nó trong bài tập môn học.",
                "important_points": what_to_study or [f"Ôn tập kiến thức {topic}"],
                "sources": sources_list,
            },
            "related_assignment": related_assign_dict,
            "quick_self_check": [
                {
                    "id": "q1",
                    "question": f"Đâu là khái niệm cốt lõi của {topic}?",
                    "type": "short_answer",
                    "options": [],
                    "hint": "Nắm định nghĩa cơ bản trong tài liệu bài giảng.",
                    "sample_answer": f"{topic} là...",
                    "explanation": f"Hiểu đúng khái niệm {topic} giúp sinh viên làm tốt các câu hỏi lý thuyết và bài tập.",
                },
                {
                    "id": "q2",
                    "question": f"Hãy nêu 1 ví dụ hoặc ứng dụng chính của {topic}?",
                    "type": "short_answer",
                    "options": [],
                    "hint": "Liên hệ với bài học hoặc ví dụ thực tế.",
                    "sample_answer": "Ứng dụng...",
                    "explanation": "Khả năng đưa ra ví dụ minh chứng cho mức độ hiểu sâu bài học.",
                }
            ],
            "sources": sources_list,
        }

        try:
            from src.services.llm import get_llm
            from langchain_core.messages import SystemMessage, HumanMessage
            llm = get_llm(temperature=0.2)
            res_msg = await llm.ainvoke([
                SystemMessage(content=system_instruction),
                HumanMessage(content=user_prompt),
            ])
            res_text = str(res_msg.content)
            if "{" in res_text and "}" in res_text:
                j_str = res_text[res_text.find("{"):res_text.rfind("}")+1]
                parsed = json.loads(j_str)
                if parsed.get("learning_objectives"):
                    comp_data_dict["learning_objectives"] = parsed["learning_objectives"]
                if parsed.get("ai_study_guide"):
                    parsed_guide = parsed["ai_study_guide"]
                    parsed_guide["sources"] = sources_list
                    comp_data_dict["ai_study_guide"] = parsed_guide
                if parsed.get("quick_self_check"):
                    comp_data_dict["quick_self_check"] = parsed["quick_self_check"]
        except Exception as llm_err:
            import logging
            logging.getLogger(__name__).warning(f"LLM study session companion generation failed: {llm_err}")

        # Save companion_data into task description JSON metadata for instant reload
        existing_meta["companion_data"] = comp_data_dict
        task.description = pack_task_description(
            description=existing_meta.get("description"),
            topic=existing_meta.get("topic"),
            what_to_study=existing_meta.get("what_to_study"),
            what_to_do=existing_meta.get("what_to_do"),
            reason=existing_meta.get("reason"),
            material_id=existing_meta.get("material_id"),
            material_title=existing_meta.get("material_title"),
            course_id=existing_meta.get("course_id"),
            course_name=existing_meta.get("course_name"),
            goal_id=existing_meta.get("goal_id"),
            goal_title=existing_meta.get("goal_title"),
            started_at=existing_meta.get("started_at"),
            completed_at=existing_meta.get("completed_at"),
            actual_duration=existing_meta.get("actual_duration"),
            completed_activities=existing_meta.get("completed_activities"),
            reflection_data=existing_meta.get("reflection_data"),
            ai_insight=existing_meta.get("ai_insight"),
            suggested_next_focus=existing_meta.get("suggested_next_focus"),
            companion_data=comp_data_dict,
        )

        await db.commit()
        await db.refresh(task)

        return StudySessionCompanionResponse(**comp_data_dict)

    @staticmethod
    async def evaluate_self_check_answer(
        db: AsyncSession,
        task_id: str,
        payload: SelfCheckEvalRequest,
        current_user: UserResponse,
    ) -> SelfCheckEvalResponse:
        """
        Evaluate student's quick self-check answer using AI feedback (non-graded).
        """
        WeeklyPlanService._ensure_student(current_user)

        stmt = select(Task).options(selectinload(Task.weekly_goal)).where(Task.id == task_id)
        res = await db.execute(stmt)
        task = res.scalar_one_or_none()

        if not task or not task.weekly_goal or task.weekly_goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found or access denied.",
            )

        existing_meta = {}
        if task.description and task.description.startswith("{") and task.description.endswith("}"):
            try:
                existing_meta = json.loads(task.description)
            except Exception:
                existing_meta = {}

        topic = existing_meta.get("topic") or task.title
        course_name = existing_meta.get("course_name") or "Khóa học"

        feedback = "Câu trả lời của bạn đã thể hiện đúng ý chính cốt lõi!"
        explanation = "Nhớ kết hợp thêm ví dụ cụ thể để nắm vững hơn."
        is_correct = True

        try:
            from src.services.llm import get_llm
            from langchain_core.messages import HumanMessage

            llm = get_llm(temperature=0.3)
            prompt = (
                f"Đánh giá câu trả lời tự kiểm tra (Quick Self-Check) của sinh viên trong buổi học:\n"
                f"- Môn học: {course_name}\n"
                f"- Chủ đề: {topic}\n"
                f"- Câu hỏi: {payload.question_text}\n"
                f"- Câu trả lời của sinh viên: {payload.student_answer}\n\n"
                f"Hãy đưa ra đánh giá nhẹ nhàng, mang tính hỗ trợ học tập (không chấm điểm gắt gao).\n"
                f"Trả về đúng định dạng JSON:\n"
                f'{{\n'
                f'  "is_correct": true,\n'
                f'  "feedback": "Nhận xét động viên 1-2 câu",\n'
                f'  "explanation": "Giải thích chi tiết 1-2 câu",\n'
                f'  "suggested_review": "Gợi ý điểm cần chú ý thêm"\n'
                f'}}'
            )

            res = await llm.ainvoke([HumanMessage(content=prompt)])
            text = str(res.content)
            if "{" in text and "}" in text:
                parsed = json.loads(text[text.find("{"):text.rfind("}")+1])
                return SelfCheckEvalResponse(
                    question_id=payload.question_id,
                    is_correct=parsed.get("is_correct", True),
                    feedback=parsed.get("feedback", feedback),
                    explanation=parsed.get("explanation", explanation),
                    suggested_review=parsed.get("suggested_review"),
                )
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning(f"Self check evaluation LLM failed: {e}")

        return SelfCheckEvalResponse(
            question_id=payload.question_id,
            is_correct=is_correct,
            feedback=feedback,
            explanation=explanation,
        )

    @staticmethod
    async def get_unified_calendar(
        db: AsyncSession,
        current_user: UserResponse,
        week_start: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Fetch unified calendar events for a student (Fixed University Classes, AI Planned, Student Study Sessions).
        """
        WeeklyPlanService._ensure_student(current_user)
        student_id = current_user.id

        # Determine Monday start date
        today = datetime.now(timezone.utc).date()
        if week_start:
            try:
                parsed_d = date.fromisoformat(week_start.split("T")[0])
                monday = parsed_d - timedelta(days=parsed_d.weekday())
            except ValueError:
                monday = today - timedelta(days=today.weekday())
        else:
            monday = today - timedelta(days=today.weekday())

        week_dates = [(monday + timedelta(days=i)) for i in range(7)]
        day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        events: list[dict[str, Any]] = []

        # 1. Fetch Enrolled Fixed Course Schedules
        enroll_stmt = (
            select(Course)
            .join(Enrollment, Enrollment.course_id == Course.id)
            .options(selectinload(Course.schedules))
            .where(
                (Enrollment.user_id == student_id)
                & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
                & (Enrollment.status == "active")
            )
        )
        enroll_res = await db.execute(enroll_stmt)
        enrolled_courses = enroll_res.scalars().all()

        for c in enrolled_courses:
            c_start = c.start_date.date() if isinstance(c.start_date, datetime) else c.start_date
            c_end = c.end_date.date() if isinstance(c.end_date, datetime) else c.end_date

            for s in (c.schedules or []):
                s_day = s.day_of_week.strip().lower()
                for idx, w_date in enumerate(week_dates):
                    w_day_name = day_names[idx]
                    if s_day == w_day_name.lower():
                        if c_start and c_end and not (c_start <= w_date <= c_end):
                            continue

                        events.append({
                            "id": f"fixed_{c.id}_{s.id}_{w_date.strftime('%Y%m%d')}",
                            "type": "FIXED_CLASS",
                            "title": f"{c.code} — {c.name}",
                            "description": f"Lịch học giảng đường cố định ({c.credits or 3} tín chỉ)",
                            "course_id": c.id,
                            "course_code": c.code,
                            "course_name": c.name,
                            "day_of_week": s.day_of_week,
                            "scheduled_date": w_date.strftime("%Y-%m-%d"),
                            "start_time": s.start_time,
                            "end_time": s.end_time,
                            "priority": "HIGH",
                            "status": "FIXED",
                            "task_data": None,
                        })

        # 2. Fetch Weekly Plan Tasks for requested week
        plans = await WeeklyPlanService.get_weekly_plans(db, current_user)
        sunday = monday + timedelta(days=6)
        added_task_ids = set()

        for p in plans:
            if not p.tasks:
                continue

            is_plan_ai = p.generated_by_agent is not None

            for t in p.tasks:
                if t.id in added_task_ids:
                    continue

                t_dt = parse_datetime(t.scheduled_date) if t.scheduled_date else None
                task_date = t_dt.date() if t_dt else None

                # Check if task falls within requested week [monday, sunday]
                if task_date:
                    if not (monday <= task_date <= sunday):
                        continue
                else:
                    # Fallback to plan date check
                    p_start = parse_datetime(p.week_start_date)
                    if p_start and not (monday <= p_start.date() <= sunday):
                        continue

                d_idx = task_date.weekday() if task_date else 0
                d_name = day_names[d_idx]
                date_str = task_date.strftime("%Y-%m-%d") if task_date else monday.strftime("%Y-%m-%d")

                start_time_clean = normalize_time_str(t.start_time) or "09:00"
                end_time_clean = normalize_time_str(t.end_time) or "10:00"

                s_type = (t.source_type or "MANUAL").upper()
                is_ai_task = is_plan_ai or (s_type in ["AI_PLAN", "ASSIGNMENT", "GOAL", "AI"])
                event_type = "AI_STUDY" if is_ai_task else "STUDENT_STUDY"

                task_dto = serialize_task(t)
                task_dict = task_dto.model_dump() if hasattr(task_dto, "model_dump") else task_dto.dict()

                events.append({
                    "id": t.id,
                    "type": event_type,
                    "title": t.title,
                    "description": task_dto.description,
                    "course_id": task_dto.course_id,
                    "course_name": task_dto.course_name,
                    "course_code": None,
                    "day_of_week": d_name,
                    "scheduled_date": date_str,
                    "start_time": start_time_clean,
                    "end_time": end_time_clean,
                    "priority": str(t.priority.value if hasattr(t.priority, "value") else t.priority),
                    "status": str(t.status.value if hasattr(t.status, "value") else t.status),
                    "task_data": task_dict,
                })
                added_task_ids.add(t.id)

        return events
