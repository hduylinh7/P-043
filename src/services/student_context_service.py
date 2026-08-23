import logging
from datetime import datetime, date, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.enums import EnrollmentRoleEnum, SubmissionStatusEnum
from src.db.models.learning.assignment import Assignment
from src.db.models.learning.course import Course
from src.db.models.learning.enrollment import Enrollment
from src.db.models.learning.course_material import CourseMaterial
from src.db.models.learning.submission import Submission
from src.db.models.planning.goal import Goal
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal
from src.models.auth import UserResponse

logger = logging.getLogger(__name__)


def format_iso_date(dt: datetime | date | str | None) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, (datetime, date)):
        return dt.strftime("%Y-%m-%d")
    return str(dt).split("T")[0]


def format_iso_datetime(dt: datetime | str | None) -> str | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)


def get_current_week_start() -> date:
    today = datetime.now(timezone.utc).date()
    return today - timedelta(days=today.weekday())


def truncate_str(text: Any, max_len: int = 150) -> Any:
    if text is None:
        return None
    if not isinstance(text, str):
        return text
    if len(text) <= max_len:
        return text
    return text[:max_len] + "..."


class StudentLearningContextService:
    """
    Service to assemble the authenticated student's personal learning context
    for the Personal Learning Companion chatbot.

    Scoped strictly to the authenticated student's data.
    Does NOT include or reference Personal Tasks.
    """

    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        if "student" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Personal Learning Companion context is available for students only.",
            )

    @classmethod
    async def get_assignments_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
    ) -> dict[str, Any]:
        """
        Build a lightweight context containing ONLY student assignments and deadlines.
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        student_info = {
            "student_id": student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
        }

        enroll_stmt = (
            select(Enrollment)
            .options(selectinload(Enrollment.course))
            .where(
                (Enrollment.user_id == student_id)
                & (func.lower(Enrollment.role) == "student")
            )
        )
        enroll_res = await db.execute(enroll_stmt)
        enrollments = enroll_res.scalars().all()
        course_ids = [en.course.id for en in enrollments if en.course]

        assignments_list = []
        if course_ids:
            sub_stmt = select(Submission).where(Submission.student_id == student_id)
            sub_res = await db.execute(sub_stmt)
            submissions = sub_res.scalars().all()
            submissions_dict = {s.assignment_id: s for s in submissions}

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
            assignments = assign_res.scalars().all()

            for a in assignments:
                sub = submissions_dict.get(a.id)

                is_submitted = False
                submission_status = "NOT_SUBMITTED"
                submitted_at_str = None
                score = None
                grade = None
                feedback = None

                if sub:
                    sub_status_val = sub.status.value if hasattr(sub.status, "value") else str(sub.status)
                    if sub_status_val in ["submitted", "graded", "SUBMITTED", "GRADED"] or sub.submitted_at:
                        is_submitted = True
                        due_dt = a.due_at
                        if due_dt and sub.submitted_at and sub.submitted_at > due_dt:
                            submission_status = "LATE"
                        elif sub.score is not None or sub.grade == "GRADED":
                            submission_status = "GRADED"
                        else:
                            submission_status = "SUBMITTED"
                    else:
                        submission_status = "NOT_SUBMITTED"

                    submitted_at_str = format_iso_datetime(sub.submitted_at)
                    score = sub.score
                    grade = sub.grade
                    feedback = truncate_str(sub.feedback, 100)

                assignments_list.append({
                    "id": a.id,
                    "title": a.title,
                    "description": truncate_str(a.description, 100),
                    "course_id": a.course_id,
                    "course_name": a.course.name if a.course else None,
                    "course_code": a.course.code if a.course else None,
                    "due_date": format_iso_datetime(a.due_at),
                    "due_date_short": format_iso_date(a.due_at),
                    "priority": a.priority,
                    "is_submitted": is_submitted,
                    "submission_status": submission_status,
                    "submitted_at": submitted_at_str,
                    "score": score,
                    "grade": grade,
                    "feedback": feedback,
                })

        total_assignments = len(assignments_list)
        submitted_assignments = [a for a in assignments_list if a["is_submitted"]]
        unsubmitted_assignments = [a for a in assignments_list if not a["is_submitted"]]
        graded_assignments = [a for a in assignments_list if a["score"] is not None]

        scores = [a["score"] for a in graded_assignments if a["score"] is not None]
        avg_score = round(sum(scores) / len(scores), 2) if scores else None

        upcoming_deadlines = [
            a for a in unsubmitted_assignments if a["due_date"] is not None
        ]
        upcoming_deadlines.sort(key=lambda x: x["due_date"])

        return {
            "student_info": student_info,
            "assignments": assignments_list,
            "learning_progress": {
                "total_assignments_count": total_assignments,
                "submitted_assignments_count": len(submitted_assignments),
                "unsubmitted_assignments_count": len(unsubmitted_assignments),
                "graded_assignments_count": len(graded_assignments),
                "average_score": avg_score,
                "upcoming_unsubmitted_deadlines": upcoming_deadlines[:5],
            },
        }

    @classmethod
    async def get_courses_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
    ) -> dict[str, Any]:
        """
        Build a lightweight context containing ONLY student enrolled courses and materials.
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        student_info = {
            "student_id": student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
        }

        enroll_stmt = (
            select(Enrollment)
            .options(selectinload(Enrollment.course))
            .where(
                (Enrollment.user_id == student_id)
                & (func.lower(Enrollment.role) == "student")
            )
        )
        enroll_res = await db.execute(enroll_stmt)
        enrollments = enroll_res.scalars().all()

        courses_list = []
        for en in enrollments:
            c = en.course
            if not c:
                continue

            mat_stmt = (
                select(CourseMaterial)
                .where(CourseMaterial.course_id == c.id)
                .order_by(CourseMaterial.created_at.desc())
            )
            mat_res = await db.execute(mat_stmt)
            materials = mat_res.scalars().all()

            materials_metadata = [
                {
                    "id": m.id,
                    "title": m.title,
                    "type": m.type,
                    "file_name": m.file_name,
                }
                for m in materials
            ]

            courses_list.append({
                "course_id": c.id,
                "course_code": c.code,
                "course_name": c.name,
                "description": truncate_str(c.description, 100),
                "instructor_id": c.instructor_id,
                "materials": materials_metadata,
            })

        return {
            "student_info": student_info,
            "courses": courses_list,
        }

    @classmethod
    async def get_goals_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
    ) -> dict[str, Any]:
        """
        Build a lightweight context containing ONLY student personal goals.
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        student_info = {
            "student_id": student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
        }

        goals_stmt = (
            select(Goal)
            .where(Goal.student_id == student_id)
            .where(Goal.status == "ACTIVE")
            .order_by(Goal.target_date.asc().nulls_last())
        )
        goals_res = await db.execute(goals_stmt)
        active_goals = goals_res.scalars().all()

        goals_list = [
            {
                "id": g.id,
                "title": g.title,
                "description": truncate_str(g.description, 150),
                "category": g.category,
                "priority": g.priority,
                "target_date": format_iso_date(g.target_date),
                "status": g.status,
            }
            for g in active_goals
        ]

        return {
            "student_info": student_info,
            "goals": goals_list,
        }

    @classmethod
    async def get_scores_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
    ) -> dict[str, Any]:
        """
        Build a lightweight context containing ONLY student grades, assignment scores, and feedback.
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        student_info = {
            "student_id": student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
        }

        sub_stmt = (
            select(Submission)
            .options(selectinload(Submission.assignment).selectinload(Assignment.course))
            .where(Submission.student_id == student_id)
            .order_by(Submission.submitted_at.desc().nulls_last())
        )
        sub_res = await db.execute(sub_stmt)
        submissions = sub_res.scalars().all()

        scores_list = []
        scores_values = []

        for sub in submissions:
            assign = sub.assignment
            c_name = assign.course.name if assign and assign.course else None
            c_code = assign.course.code if assign and assign.course else None

            if sub.score is not None:
                scores_values.append(sub.score)

            scores_list.append({
                "assignment_id": sub.assignment_id,
                "assignment_title": assign.title if assign else None,
                "course_name": c_name,
                "course_code": c_code,
                "score": sub.score,
                "grade": sub.grade,
                "status": sub.status.value if hasattr(sub.status, "value") else str(sub.status),
                "submitted_at": format_iso_datetime(sub.submitted_at),
                "feedback": truncate_str(sub.feedback, 150),
            })

        avg_score = round(sum(scores_values) / len(scores_values), 2) if scores_values else None

        return {
            "student_info": student_info,
            "scores_summary": {
                "total_graded_assignments": len(scores_values),
                "average_score": avg_score,
            },
            "submissions_and_scores": scores_list,
        }

    @classmethod
    async def get_schedule_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
        target_date: date | None = None,
    ) -> dict[str, Any]:
        """
        Build a targeted context containing schedule, daily/weekly tasks, and near-term assignment deadlines.
        Defaults to near-term window (today through +2 days).
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        today = target_date or datetime.now(timezone.utc).date()
        window_end = today + timedelta(days=2)

        student_info = {
            "student_id": student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "current_date": today.isoformat(),
        }

        # 1. Near-term unsubmitted assignments
        enroll_stmt = (
            select(Enrollment.course_id)
            .where(
                (Enrollment.user_id == student_id)
                & (func.lower(Enrollment.role) == "student")
            )
        )
        enroll_res = await db.execute(enroll_stmt)
        course_ids = enroll_res.scalars().all()

        near_term_assignments = []
        if course_ids:
            sub_stmt = select(Submission.assignment_id).where(Submission.student_id == student_id)
            sub_res = await db.execute(sub_stmt)
            submitted_ids = set(sub_res.scalars().all())

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
                if a.id in submitted_ids:
                    continue
                a_due_date = a.due_at.date() if isinstance(a.due_at, datetime) else None
                # Include if due within near-term window or due date is null
                if a_due_date is None or (today <= a_due_date <= window_end):
                    near_term_assignments.append({
                        "id": a.id,
                        "title": a.title,
                        "description": truncate_str(a.description, 100),
                        "course_id": a.course_id,
                        "course_name": a.course.name if a.course else None,
                        "due_date": format_iso_datetime(a.due_at),
                        "due_date_short": format_iso_date(a.due_at),
                        "priority": a.priority,
                    })

        # 2. Current Weekly Plan & Scheduled Tasks for near-term window
        week_start_date = get_current_week_start()
        plan_stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.student_id == student_id)
        )
        plan_res = await db.execute(plan_stmt)
        user_plans = plan_res.scalars().all()

        near_term_tasks = []
        for p in user_plans:
            p_start = p.week_start_date.date() if isinstance(p.week_start_date, datetime) else p.week_start_date
            if p_start == week_start_date:
                for t in (p.tasks or []):
                    t_date = t.scheduled_date.date() if isinstance(t.scheduled_date, datetime) else t.scheduled_date
                    if t_date is None or (today <= t_date <= window_end):
                        near_term_tasks.append({
                            "id": t.id,
                            "title": t.title,
                            "description": truncate_str(t.description, 100),
                            "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                            "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                            "scheduled_date": format_iso_date(t.scheduled_date),
                            "start_time": t.start_time,
                            "end_time": t.end_time,
                            "estimated_duration": t.estimated_minutes,
                        })
                break

        return {
            "student_info": student_info,
            "schedule_window": {
                "start_date": today.isoformat(),
                "end_date": window_end.isoformat(),
            },
            "near_term_assignments": near_term_assignments,
            "scheduled_tasks": near_term_tasks,
        }

    @classmethod
    async def build_student_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
    ) -> dict[str, Any]:
        """
        Build the student's personal learning context dictionary.
        """
        cls._ensure_student(current_user)
        student_id = current_user.id

        # 1. Student Personal Information
        student_info = {
            "student_id": student_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
        }

        # 2. Personal Goals
        goals_stmt = (
            select(Goal)
            .where(Goal.student_id == student_id)
            .where(Goal.status == "ACTIVE")
            .order_by(Goal.target_date.asc().nulls_last())
        )
        goals_res = await db.execute(goals_stmt)
        active_goals = goals_res.scalars().all()

        goals_list = [
            {
                "id": g.id,
                "title": g.title,
                "description": truncate_str(g.description, 150),
                "category": g.category,
                "priority": g.priority,
                "target_date": format_iso_date(g.target_date),
                "status": g.status,
            }
            for g in active_goals
        ]

        # 3. Enrolled Courses & Course Materials Metadata
        enroll_stmt = (
            select(Enrollment)
            .options(selectinload(Enrollment.course))
            .where(
                (Enrollment.user_id == student_id)
                & (func.lower(Enrollment.role) == "student")
            )
        )
        enroll_res = await db.execute(enroll_stmt)
        enrollments = enroll_res.scalars().all()

        courses_list = []
        course_ids = []

        for en in enrollments:
            c = en.course
            if not c:
                continue
            course_ids.append(c.id)

            # Materials metadata for course
            mat_stmt = (
                select(CourseMaterial)
                .where(CourseMaterial.course_id == c.id)
                .order_by(CourseMaterial.created_at.desc())
            )
            mat_res = await db.execute(mat_stmt)
            materials = mat_res.scalars().all()

            materials_metadata = [
                {
                    "id": m.id,
                    "title": m.title,
                    "type": m.type,
                    "file_name": m.file_name,
                }
                for m in materials
            ]

            courses_list.append({
                "course_id": c.id,
                "course_code": c.code,
                "course_name": c.name,
                "description": truncate_str(c.description, 150),
                "instructor_id": c.instructor_id,
                "materials": materials_metadata,
            })

        # 4. Assignments, Deadlines, Submissions, Scores & Grades
        assignments_list = []
        submissions_dict: dict[str, Submission] = {}

        if course_ids:
            # Query all student submissions for enrolled courses
            sub_stmt = select(Submission).where(Submission.student_id == student_id)
            sub_res = await db.execute(sub_stmt)
            submissions = sub_res.scalars().all()
            submissions_dict = {s.assignment_id: s for s in submissions}

            # Query all active/published assignments for enrolled courses
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
            assignments = assign_res.scalars().all()

            for a in assignments:
                sub = submissions_dict.get(a.id)

                is_submitted = False
                submission_status = "NOT_SUBMITTED"
                submitted_at_str = None
                score = None
                grade = None
                feedback = None

                if sub:
                    sub_status_val = sub.status.value if hasattr(sub.status, "value") else str(sub.status)
                    if sub_status_val in ["submitted", "graded", "SUBMITTED", "GRADED"] or sub.submitted_at:
                        is_submitted = True
                        due_dt = a.due_at
                        if due_dt and sub.submitted_at and sub.submitted_at > due_dt:
                            submission_status = "LATE"
                        elif sub.score is not None or sub.grade == "GRADED":
                            submission_status = "GRADED"
                        else:
                            submission_status = "SUBMITTED"
                    else:
                        submission_status = "NOT_SUBMITTED"

                    submitted_at_str = format_iso_datetime(sub.submitted_at)
                    score = sub.score
                    grade = sub.grade
                    feedback = truncate_str(sub.feedback, 150)

                assignments_list.append({
                    "id": a.id,
                    "title": a.title,
                    "description": truncate_str(a.description, 150),
                    "course_id": a.course_id,
                    "course_name": a.course.name if a.course else None,
                    "course_code": a.course.code if a.course else None,
                    "available_from": format_iso_datetime(a.available_from),
                    "due_date": format_iso_datetime(a.due_at),
                    "due_date_short": format_iso_date(a.due_at),
                    "priority": a.priority,
                    "estimated_hours": a.estimated_hours,
                    "status": a.status,
                    "is_submitted": is_submitted,
                    "submission_status": submission_status,
                    "submitted_at": submitted_at_str,
                    "score": score,
                    "grade": grade,
                    "feedback": feedback,
                })

        # 5. Current Weekly Plan & Scheduled Tasks
        week_start_date = get_current_week_start()
        plan_stmt = (
            select(WeeklyGoal)
            .options(selectinload(WeeklyGoal.tasks))
            .where(WeeklyGoal.student_id == student_id)
        )
        plan_res = await db.execute(plan_stmt)
        user_plans = plan_res.scalars().all()

        current_weekly_plan = None
        for p in user_plans:
            p_start = p.week_start_date.date() if isinstance(p.week_start_date, datetime) else p.week_start_date
            if p_start == week_start_date:
                task_dtos = [
                    {
                        "id": t.id,
                        "title": t.title,
                        "description": truncate_str(t.description, 150),
                        "status": t.status.value if hasattr(t.status, "value") else str(t.status),
                        "priority": t.priority.value if hasattr(t.priority, "value") else str(t.priority),
                        "scheduled_date": format_iso_date(t.scheduled_date),
                        "start_time": t.start_time,
                        "end_time": t.end_time,
                        "estimated_duration": t.estimated_minutes,
                        "source_type": t.source_type or "MANUAL",
                        "source_id": t.source_id,
                    }
                    for t in (p.tasks or [])
                ]
                current_weekly_plan = {
                    "id": p.id,
                    "title": p.title,
                    "description": truncate_str(p.description, 150),
                    "week_start_date": format_iso_date(p.week_start_date),
                    "week_end_date": format_iso_date(p.week_end_date),
                    "status": p.status.value if hasattr(p.status, "value") else str(p.status),
                    "tasks": task_dtos,
                }
                break

        # 6. Extract Recent Study Session Reflections for Future Planning
        recent_reflections = []
        for p in user_plans:
            for t in (p.tasks or []):
                if t.description and t.description.startswith("{") and t.description.endswith("}"):
                    try:
                        import json
                        meta = json.loads(t.description)
                        ref_data = meta.get("reflection_data")
                        if ref_data:
                            recent_reflections.append({
                                "task_id": t.id,
                                "topic": meta.get("topic") or t.title,
                                "course_name": meta.get("course_name"),
                                "what_learned": truncate_str(ref_data.get("what_learned"), 100),
                                "understood_well": truncate_str(ref_data.get("understood_well"), 100),
                                "struggling_with": truncate_str(ref_data.get("struggling_with"), 100),
                                "understanding_level": ref_data.get("understanding_level"),
                                "achieved_goal": ref_data.get("achieved_goal"),
                                "ai_insight": truncate_str(meta.get("ai_insight"), 100),
                                "suggested_next_focus": truncate_str(meta.get("suggested_next_focus"), 100),
                                "completed_at": meta.get("completed_at"),
                            })
                    except Exception:
                        pass

        # Sort by completed_at desc
        recent_reflections.sort(key=lambda x: x.get("completed_at") or "", reverse=True)

        # 7. Progress & Academic Summary Metrics
        total_assignments = len(assignments_list)
        submitted_assignments = [a for a in assignments_list if a["is_submitted"]]
        unsubmitted_assignments = [a for a in assignments_list if not a["is_submitted"]]
        graded_assignments = [a for a in assignments_list if a["score"] is not None]

        scores = [a["score"] for a in graded_assignments if a["score"] is not None]
        avg_score = round(sum(scores) / len(scores), 2) if scores else None

        # Upcoming unsubmitted assignment deadlines
        upcoming_deadlines = [
            a for a in unsubmitted_assignments if a["due_date"] is not None
        ]
        upcoming_deadlines.sort(key=lambda x: x["due_date"])

        learning_progress = {
            "enrolled_courses_count": len(courses_list),
            "total_assignments_count": total_assignments,
            "submitted_assignments_count": len(submitted_assignments),
            "unsubmitted_assignments_count": len(unsubmitted_assignments),
            "graded_assignments_count": len(graded_assignments),
            "average_score": avg_score,
            "upcoming_unsubmitted_deadlines": upcoming_deadlines[:5],
        }

        return {
            "student_info": student_info,
            "goals": goals_list,
            "courses": courses_list,
            "assignments": assignments_list,
            "weekly_plan": current_weekly_plan,
            "recent_reflections": recent_reflections[:5],
            "learning_progress": learning_progress,
        }

