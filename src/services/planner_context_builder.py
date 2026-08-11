from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.enums import EnrollmentRoleEnum, SubmissionStatusEnum
from src.db.models.identity.user import User
from src.db.models.learning.assignment import Assignment
from src.db.models.learning.enrollment import Enrollment
from src.db.models.learning.submission import Submission
from src.db.models.planning.goal import Goal
from src.db.models.planning.personal_task import PersonalTask
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal
from src.models.auth import UserResponse
from src.models.planner_context import (
    AssignmentContextDTO,
    CurrentWeeklyPlanContextDTO,
    GoalContextDTO,
    PersonalTaskContextDTO,
    PlanTaskContextDTO,
    PlannerContext,
    PlanningPeriodDTO,
    StudentContextDTO,
)


def format_iso(dt: datetime | date | str | None) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, (datetime, date)):
        return dt.strftime("%Y-%m-%d")
    return str(dt).split("T")[0]



def parse_week_start(val: datetime | date | str | None) -> date:
    if val is None:
        today = datetime.now(timezone.utc).date()
        return today - timedelta(days=today.weekday())
    if isinstance(val, datetime):
        return val.date() - timedelta(days=val.date().weekday())
    if isinstance(val, date):
        return val - timedelta(days=val.weekday())
    if isinstance(val, str):
        val_clean = val.split("T")[0].rstrip("Z")
        try:
            parsed = date.fromisoformat(val_clean)
            return parsed - timedelta(days=parsed.weekday())
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid week_start format: '{val}'. Expected YYYY-MM-DD.",
            )
    today = datetime.now(timezone.utc).date()
    return today - timedelta(days=today.weekday())


class PlannerContextBuilder:
    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        if "student" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Planner Context Builder is available for students only.",
            )

    @classmethod
    async def build_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        week_start: datetime | date | str | None = None,
    ) -> PlannerContext:
        """
        Collect and normalize student data into a PlannerContext object.
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        # 1. Planning Period
        start_date = parse_week_start(week_start)
        end_date = start_date + timedelta(days=6)
        planning_period = PlanningPeriodDTO(
            week_start=start_date.strftime("%Y-%m-%d"),
            week_end=end_date.strftime("%Y-%m-%d"),
        )

        # 2. Active Goals
        goals_stmt = (
            select(Goal)
            .where(Goal.student_id == student_id)
            .where(Goal.status == "ACTIVE")
            .order_by(Goal.target_date.asc().nulls_last())
        )
        goals_res = await db.execute(goals_stmt)
        active_goals = goals_res.scalars().all()

        goal_dtos = [
            GoalContextDTO(
                id=g.id,
                title=g.title,
                description=g.description,
                category=g.category,
                priority=g.priority,
                target_date=format_iso(g.target_date),
                status=g.status,
            )
            for g in active_goals
        ]

        # 3. Enrolled Courses & Upcoming Assignments
        enroll_stmt = select(Enrollment.course_id).where(
            (Enrollment.user_id == student_id) & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
        )
        enroll_res = await db.execute(enroll_stmt)
        course_ids = enroll_res.scalars().all()

        assignment_dtos: list[AssignmentContextDTO] = []
        if course_ids:
            # Query completed/submitted assignments for student
            sub_stmt = select(Submission.assignment_id).where(
                (Submission.student_id == student_id)
                & (
                    Submission.status.in_(
                        [
                            SubmissionStatusEnum.SUBMITTED,
                            SubmissionStatusEnum.GRADED,
                            "submitted",
                            "graded",
                        ]
                    )
                )
            )
            sub_res = await db.execute(sub_stmt)
            submitted_assignment_ids = set(sub_res.scalars().all())

            # Query active assignments
            assign_stmt = (
                select(Assignment)
                .options(selectinload(Assignment.course))
                .where(
                    Assignment.course_id.in_(course_ids),
                    Assignment.status == "ACTIVE",
                )
                .order_by(Assignment.due_at.asc().nulls_last())
            )
            assign_res = await db.execute(assign_stmt)
            active_assignments = assign_res.scalars().all()

            for a in active_assignments:
                if a.id in submitted_assignment_ids:
                    continue  # Exclude completed assignments
                course_title = a.course.name if a.course else None
                assignment_dtos.append(
                    AssignmentContextDTO(
                        id=a.id,
                        title=a.title,
                        description=a.description,
                        course_id=a.course_id,
                        course_name=course_title,
                        due_date=format_iso(a.due_at),
                        priority=a.priority,
                        estimated_hours=a.estimated_hours,
                        status=a.status,
                    )
                )

        # 4. Active Personal Tasks
        p_task_stmt = (
            select(PersonalTask)
            .where(
                PersonalTask.student_id == student_id,
                PersonalTask.status.notin_(["COMPLETED", "completed"]),
            )
            .order_by(PersonalTask.due_at.asc().nulls_last())
        )
        p_task_res = await db.execute(p_task_stmt)
        active_personal_tasks = p_task_res.scalars().all()

        personal_task_dtos = [
            PersonalTaskContextDTO(
                id=pt.id,
                title=pt.title,
                description=pt.description,
                category=pt.category,
                priority=pt.priority,
                status=pt.status,
                due_date=format_iso(pt.due_at),
                estimated_hours=pt.estimated_hours,
            )
            for pt in active_personal_tasks
        ]

        # 5. Current Weekly Plan for requested week
        start_dt_tz = datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc)
        plan_stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.student_id == student_id)
        )
        plan_res = await db.execute(plan_stmt)
        user_plans = plan_res.scalars().all()

        matched_plan: WeeklyGoal | None = None
        for p in user_plans:
            p_start = p.week_start_date.date() if isinstance(p.week_start_date, datetime) else p.week_start_date
            if p_start == start_date:
                matched_plan = p
                break

        current_weekly_plan_dto: CurrentWeeklyPlanContextDTO | None = None
        if matched_plan:
            task_dtos = [
                PlanTaskContextDTO(
                    id=t.id,
                    title=t.title,
                    description=t.description,
                    status=t.status.value if hasattr(t.status, "value") else str(t.status),
                    priority=t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                    scheduled_date=format_iso(t.scheduled_date),
                    start_time=t.start_time,
                    end_time=t.end_time,
                    estimated_duration=t.estimated_minutes,
                    source_type=t.source_type or "MANUAL",
                    source_id=t.source_id,
                )
                for t in (matched_plan.tasks or [])
            ]

            plan_status = (
                matched_plan.status.value
                if hasattr(matched_plan.status, "value")
                else str(matched_plan.status)
            )

            current_weekly_plan_dto = CurrentWeeklyPlanContextDTO(
                id=matched_plan.id,
                title=matched_plan.title,
                description=matched_plan.description,
                week_start_date=format_iso(matched_plan.week_start_date) or start_date.strftime("%Y-%m-%d"),
                week_end_date=format_iso(matched_plan.week_end_date) or end_date.strftime("%Y-%m-%d"),
                status=plan_status,
                tasks=task_dtos,
            )

        # 6. Assemble PlannerContext
        return PlannerContext(
            student=StudentContextDTO(id=student_id),
            planning_period=planning_period,
            goals=goal_dtos,
            assignments=assignment_dtos,
            personal_tasks=personal_task_dtos,
            current_weekly_plan=current_weekly_plan_dto,
        )
