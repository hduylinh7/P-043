import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.enums import EnrollmentRoleEnum, SubmissionStatusEnum
from src.db.models.identity.user import User
from src.db.models.learning.assignment import Assignment
from src.db.models.learning.course import Course
from src.db.models.learning.course_material import CourseMaterial
from src.db.models.learning.enrollment import Enrollment
from src.db.models.learning.question import AssignmentQuestion
from src.db.models.learning.submission import Submission
from src.db.models.planning.goal import Goal
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal
from src.models.auth import UserResponse
from src.services.rag_service import RAGService

logger = logging.getLogger(__name__)
from src.models.planner_context import (
    AssignmentContextDTO,
    CourseMaterialContextDTO,
    CurrentWeeklyPlanContextDTO,
    FixedCourseScheduleDTO,
    GoalContextDTO,
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


def parse_date_val(val: datetime | date | str | None) -> date | None:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        val_clean = val.split("T")[0].rstrip("Z")
        try:
            return date.fromisoformat(val_clean)
        except ValueError:
            return None
    return None


class PlannerContextBuilder:
    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        if "student" not in current_user.roles and "instructor" not in current_user.roles and "admin" not in current_user.roles:
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
        start_date_val: datetime | date | str | None = None,
        end_date_val: datetime | date | str | None = None,
        target_assignment_id: str | None = None,
    ) -> PlannerContext:
        """
        Collect and normalize student data into a PlannerContext object.
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        # 1. Planning Period
        start_d = parse_date_val(start_date_val)
        if start_d is None:
            start_d = parse_week_start(week_start)

        end_d = parse_date_val(end_date_val)

        if target_assignment_id and end_d is None:
            assign_stmt = select(Assignment).where(Assignment.id == target_assignment_id)
            assign_res = await db.execute(assign_stmt)
            target_assign = assign_res.scalar_one_or_none()
            if target_assign and target_assign.due_at:
                due_d = parse_date_val(target_assign.due_at)
                if due_d and due_d >= start_d:
                    end_d = due_d

        if end_d is None:
            # Query active enrolled course assignments to auto-detect farthest assignment deadline
            enroll_stmt = select(Enrollment.course_id).where(
                (Enrollment.user_id == student_id) & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
            )
            enroll_res = await db.execute(enroll_stmt)
            c_ids = enroll_res.scalars().all()
            if c_ids:
                max_assign_stmt = (
                    select(Assignment.due_at)
                    .where(
                        Assignment.course_id.in_(c_ids),
                        Assignment.status != "CLOSED",
                    )
                    .order_by(Assignment.due_at.desc())
                )
                max_assign_res = await db.execute(max_assign_stmt)
                max_due = max_assign_res.scalars().first()
                if max_due:
                    max_due_d = parse_date_val(max_due)
                    if max_due_d and max_due_d >= start_d:
                        end_d = min(max_due_d, start_d + timedelta(days=30))

        if end_d is None:
            end_d = start_d + timedelta(days=6)

        planning_period = PlanningPeriodDTO(
            week_start=start_d.strftime("%Y-%m-%d"),
            week_end=end_d.strftime("%Y-%m-%d"),
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

        # 3. Enrolled Courses, Upcoming Assignments & Course Materials
        enroll_stmt = select(Enrollment.course_id).where(Enrollment.user_id == student_id)
        enroll_res = await db.execute(enroll_stmt)
        course_ids = list(enroll_res.scalars().all())

        # Fallback: If user is not explicitly enrolled in a course yet, include all available system courses
        if not course_ids:
            all_c_res = await db.execute(select(Course.id))
            course_ids = list(all_c_res.scalars().all())

        assignment_dtos: list[AssignmentContextDTO] = []
        course_material_dtos: list[CourseMaterialContextDTO] = []

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

            # Query assignments that are not CLOSED (includes ACTIVE, DRAFT, PUBLISHED)
            assign_stmt = (
                select(Assignment)
                .options(
                    selectinload(Assignment.course),
                    selectinload(Assignment.checklists),
                )
                .where(
                    Assignment.course_id.in_(course_ids),
                    Assignment.status != "CLOSED",
                )
                .order_by(Assignment.due_at.asc().nulls_last())
            )
            assign_res = await db.execute(assign_stmt)
            active_assignments = list(assign_res.scalars().all())

            # Fallback: If no active assignments exist in explicit enrollments, fetch all non-closed system assignments
            if not active_assignments:
                fallback_assign_stmt = (
                    select(Assignment)
                    .options(       
                        selectinload(Assignment.course),
                        selectinload(Assignment.checklists),
                    )
                    .where(Assignment.status != "CLOSED")
                    .order_by(Assignment.due_at.asc().nulls_last())
                )
                fallback_res = await db.execute(fallback_assign_stmt)
                active_assignments = list(fallback_res.scalars().all())

            for a in active_assignments:
                if a.id in submitted_assignment_ids:
                    continue  # Exclude completed assignments
                course_title = a.course.name if a.course else None

                # Extract checklist information
                chk_dicts = []
                for c in (a.checklists or []):
                    chk_dicts.append({
                        "title": c.title,
                        "description": c.description,
                    })

                # Retrieve vector chunks only if this assignment is explicitly targeted for AI generation
                embedded_chunks = []
                if target_assignment_id and target_assignment_id == a.id:
                    try:
                        rag_res = RAGService.search_course_materials(
                            assignment_id=a.id, query=a.title, top_k=5
                        )
                        embedded_chunks = [r["content"] for r in rag_res if r.get("content")]
                    except Exception as rag_err:
                        logger.debug(f"Could not retrieve vector chunks for target assignment {a.id}: {rag_err}")

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
                        attachment_file_name=a.attachment_file_name,
                        questions=[],
                        checklists=chk_dicts,
                        embedded_chunks=embedded_chunks,
                    )
                )

            # Query available course materials for student's enrolled courses
            mat_stmt = (
                select(CourseMaterial)
                .options(selectinload(CourseMaterial.course))
                .where(CourseMaterial.course_id.in_(course_ids))
            )
            mat_res = await db.execute(mat_stmt)
            materials = mat_res.scalars().all()

            for m in materials:
                c_name = m.course.name if m.course else None
                course_material_dtos.append(
                    CourseMaterialContextDTO(
                        id=m.id,
                        course_id=m.course_id,
                        course_name=c_name,
                        title=m.title,
                        file_name=m.file_name,
                        material_type=m.type or "document",
                    )
                )

            # Query fixed course schedules for enrolled courses
            courses_stmt = (
                select(Course)
                .options(selectinload(Course.schedules))
                .where(Course.id.in_(course_ids))
            )
            courses_res = await db.execute(courses_stmt)
            enrolled_courses = courses_res.scalars().all()

            fixed_course_schedule_dtos: list[FixedCourseScheduleDTO] = []
            for c in enrolled_courses:
                for s in (c.schedules or []):
                    fixed_course_schedule_dtos.append(
                        FixedCourseScheduleDTO(
                            course_id=c.id,
                            course_code=c.code,
                            course_name=c.name,
                            day_of_week=s.day_of_week,
                            start_time=s.start_time,
                            end_time=s.end_time,
                            start_date=format_iso(c.start_date),
                            end_date=format_iso(c.end_date),
                        )
                    )
        else:
            fixed_course_schedule_dtos = []

        # 4. Current Weekly Plan for requested week
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
            if p_start == start_d:
                matched_plan = p
                break

        current_weekly_plan_dto: CurrentWeeklyPlanContextDTO | None = None
        if matched_plan:
            task_dtos = []
            for t in (matched_plan.tasks or []):
                meta = {}
                if t.description and t.description.startswith("{") and t.description.endswith("}"):
                    try:
                        meta = json.loads(t.description)
                    except Exception:
                        meta = {}

                task_dtos.append(
                    PlanTaskContextDTO(
                        id=t.id,
                        title=t.title,
                        description=meta.get("description") or (t.description if not meta else None),
                        topic=meta.get("topic"),
                        what_to_study=meta.get("what_to_study") or [],
                        what_to_do=meta.get("what_to_do") or [],
                        reason=meta.get("reason"),
                        material_id=meta.get("material_id"),
                        material_title=meta.get("material_title"),
                        course_id=meta.get("course_id"),
                        course_name=meta.get("course_name"),
                        goal_id=meta.get("goal_id"),
                        goal_title=meta.get("goal_title"),
                        status=t.status.value if hasattr(t.status, "value") else str(t.status),
                        priority=t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                        scheduled_date=format_iso(t.scheduled_date),
                        start_time=t.start_time,
                        end_time=t.end_time,
                        estimated_duration=t.estimated_minutes,
                        source_type=t.source_type or "MANUAL",
                        source_id=t.source_id,
                    )
                )

            plan_status = (
                matched_plan.status.value
                if hasattr(matched_plan.status, "value")
                else str(matched_plan.status)
            )

            current_weekly_plan_dto = CurrentWeeklyPlanContextDTO(
                id=matched_plan.id,
                title=matched_plan.title,
                description=matched_plan.description,
                week_start_date=format_iso(matched_plan.week_start_date) or start_d.strftime("%Y-%m-%d"),
                week_end_date=format_iso(matched_plan.week_end_date) or end_d.strftime("%Y-%m-%d"),
                status=plan_status,
                tasks=task_dtos,
            )

        # 5. Assemble PlannerContext
        return PlannerContext(
            student=StudentContextDTO(id=student_id),
            planning_period=planning_period,
            goals=goal_dtos,
            assignments=assignment_dtos,
            course_materials=course_material_dtos,
            fixed_course_schedules=fixed_course_schedule_dtos,
            current_weekly_plan=current_weekly_plan_dto,
        )
