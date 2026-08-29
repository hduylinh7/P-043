import logging
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models.learning.assignment import Assignment
from src.db.models.learning.course import Course
from src.db.models.learning.course_material import CourseMaterial
from src.db.models.learning.enrollment import Enrollment
from src.db.models.learning.submission import Submission
from src.models.auth import UserResponse
from src.services.student_context_service import (
    format_iso_date,
    format_iso_datetime,
    truncate_str,
)

def make_aware(dt: Any) -> Any:
    if dt is None:
        return None
    if hasattr(dt, "tzinfo"):
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    return dt


class InstructorLearningContextService:
    """
    Service to assemble teaching & course management context
    for the Instructor AI Teaching Companion chatbot.
    """

    @classmethod
    async def build_instructor_context(
        cls,
        db: AsyncSession,
        current_user: UserResponse,
    ) -> dict[str, Any]:
        """
        Build teaching & course management context for an instructor/teacher.
        """
        instructor_id = current_user.id
        instructor_info = {
            "instructor_id": instructor_id,
            "full_name": current_user.full_name,
            "email": current_user.email,
            "role": "instructor",
        }

        # 1. Fetch courses taught by instructor or where user is enrolled
        courses_stmt = (
            select(Course)
            .where(
                (Course.instructor_id == instructor_id)
                | (
                    Course.id.in_(
                        select(Enrollment.course_id).where(Enrollment.user_id == instructor_id)
                    )
                )
            )
            .distinct()
        )
        courses_res = await db.execute(courses_stmt)
        taught_courses = courses_res.scalars().all()

        courses_list = []
        course_ids = [c.id for c in taught_courses]

        for c in taught_courses:
            # Count enrolled students
            count_stmt = select(func.count(Enrollment.id)).where(
                Enrollment.course_id == c.id,
                Enrollment.status == "active",
                func.lower(Enrollment.role) == "student",
            )
            count_res = await db.execute(count_stmt)
            student_count = count_res.scalar() or 0

            # Course materials metadata
            mat_stmt = (
                select(CourseMaterial)
                .where(CourseMaterial.course_id == c.id)
                .order_by(CourseMaterial.created_at.desc())
            )
            materials = (await db.execute(mat_stmt)).scalars().all()
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
                "enrolled_students_count": student_count,
                "materials": materials_metadata,
            })

        # 2. Fetch assignments created/managed in those courses
        managed_assignments = []
        if course_ids:
            assign_stmt = (
                select(Assignment)
                .options(selectinload(Assignment.course))
                .where(Assignment.course_id.in_(course_ids))
                .order_by(Assignment.due_at.asc().nulls_last())
            )
            assignments = (await db.execute(assign_stmt)).scalars().all()

            for a in assignments:
                # Submissions stats for this assignment
                sub_stmt = select(Submission).where(Submission.assignment_id == a.id)
                subs = (await db.execute(sub_stmt)).scalars().all()

                submitted_subs = [
                    s
                    for s in subs
                    if (
                        s.submitted_at
                        or (s.status.value if hasattr(s.status, "value") else str(s.status))
                        in ["submitted", "graded", "SUBMITTED", "GRADED"]
                    )
                ]
                graded_subs = [s for s in subs if s.score is not None]
                scores = [s.score for s in graded_subs if s.score is not None]
                avg_score = round(sum(scores) / len(scores), 2) if scores else None

                due_dt = make_aware(a.due_at)
                late_count = 0
                if due_dt:
                    for s in submitted_subs:
                        s_dt = make_aware(s.submitted_at)
                        if s_dt and s_dt > due_dt:
                            late_count += 1

                managed_assignments.append({
                    "id": a.id,
                    "title": a.title,
                    "description": truncate_str(a.description, 150),
                    "course_id": a.course_id,
                    "course_name": a.course.name if a.course else None,
                    "course_code": a.course.code if a.course else None,
                    "due_date": format_iso_datetime(a.due_at),
                    "due_date_short": format_iso_date(a.due_at),
                    "status": a.status,
                    "submissions_stats": {
                        "total_submissions_count": len(submitted_subs),
                        "graded_count": len(graded_subs),
                        "late_submissions_count": late_count,
                        "average_score": avg_score,
                    },
                })

        return {
            "instructor_info": instructor_info,
            "taught_courses": courses_list,
            "managed_assignments": managed_assignments,
            "teaching_summary": {
                "total_courses_taught": len(courses_list),
                "total_managed_assignments": len(managed_assignments),
            },
        }
