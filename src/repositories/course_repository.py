from datetime import datetime
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.enums import EnrollmentRoleEnum
from src.db.models.identity.user import User
from src.db.models.learning.course import Course
from src.db.models.learning.enrollment import Enrollment


class CourseRepository:
    @staticmethod
    async def create_course(
        db: AsyncSession,
        name: str,
        code: str,
        instructor_id: str,
        start_date: datetime,
        end_date: datetime,
        description: str | None = None,
        term: str | None = None,
    ) -> Course:
        """Create and persist a new Course instance."""
        course = Course(
            name=name.strip(),
            code=code.upper().strip(),
            description=description.strip() if description else None,
            term=term.strip() if term else None,
            start_date=start_date,
            end_date=end_date,
            instructor_id=instructor_id,
        )
        db.add(course)
        await db.commit()
        await db.refresh(course)
        return course

    @staticmethod
    async def update_course(
        db: AsyncSession,
        course_id: str,
        name: str | None = None,
        code: str | None = None,
        description: str | None = None,
        term: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> Course | None:
        """Update fields of an existing course."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            return None
        if name is not None:
            course.name = name.strip()
        if code is not None:
            course.code = code.upper().strip()
        if description is not None:
            course.description = description.strip() if description else None
        if term is not None:
            course.term = term.strip() if term else None
        if start_date is not None:
            course.start_date = start_date
        if end_date is not None:
            course.end_date = end_date

        await db.commit()
        await db.refresh(course)
        return course

    @staticmethod
    async def delete_course(db: AsyncSession, course_id: str) -> bool:
        """Delete course by ID."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            return False
        await db.delete(course)
        await db.commit()
        return True


    @staticmethod
    async def get_by_id(db: AsyncSession, course_id: str) -> Course | None:
        """Fetch course by ID with instructor relationship."""
        stmt = (
            select(Course)
            .options(selectinload(Course.instructor))
            .where(Course.id == course_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_courses_by_instructor(db: AsyncSession, instructor_id: str) -> list[dict]:
        """Fetch all courses created by an instructor along with student count."""
        stmt = (
            select(
                Course,
                func.count(Enrollment.id).label("student_count")
            )
            .outerjoin(Enrollment, (Enrollment.course_id == Course.id) & (Enrollment.role == EnrollmentRoleEnum.STUDENT))
            .where(Course.instructor_id == instructor_id)
            .group_by(Course.id)
            .order_by(Course.created_at.desc())
        )
        result = await db.execute(stmt)
        courses_data = []
        for course, student_count in result.all():
            courses_data.append({
                "course": course,
                "student_count": student_count or 0,
            })
        return courses_data

    @staticmethod
    async def get_available_courses(db: AsyncSession, student_id: str | None = None) -> list[dict]:
        """Fetch available courses for students with instructor details and enrollment status."""
        # Subquery for enrolled student count per course
        count_subq = (
            select(
                Enrollment.course_id,
                func.count(Enrollment.id).label("student_count")
            )
            .where(Enrollment.role == EnrollmentRoleEnum.STUDENT)
            .group_by(Enrollment.course_id)
            .subquery()
        )

        # Subquery for current student's enrollment check
        if student_id:
            user_enrollment_subq = (
                select(Enrollment.course_id)
                .where((Enrollment.user_id == student_id) & (Enrollment.role == EnrollmentRoleEnum.STUDENT))
                .subquery()
            )

        stmt = (
            select(
                Course,
                User,
                func.coalesce(count_subq.c.student_count, 0).label("student_count"),
            )
            .outerjoin(User, Course.instructor_id == User.id)
            .outerjoin(count_subq, Course.id == count_subq.c.course_id)
            .order_by(Course.created_at.desc())
        )

        result = await db.execute(stmt)
        rows = result.all()

        enrolled_course_ids = set()
        if student_id:
            enroll_stmt = select(Enrollment.course_id).where(
                (Enrollment.user_id == student_id) & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
            )
            enroll_res = await db.execute(enroll_stmt)
            enrolled_course_ids = set(enroll_res.scalars().all())

        items = []
        for course, instructor, student_count in rows:
            items.append({
                "course": course,
                "instructor_name": instructor.full_name if instructor else "Giảng viên",
                "student_count": student_count,
                "is_enrolled": course.id in enrolled_course_ids,
            })
        return items

    @staticmethod
    async def get_enrolled_courses(db: AsyncSession, student_id: str) -> list[dict]:
        """Fetch courses that a specific student is enrolled in."""
        stmt = (
            select(
                Course,
                User,
                Enrollment
            )
            .join(Enrollment, (Enrollment.course_id == Course.id) & (Enrollment.user_id == student_id))
            .outerjoin(User, Course.instructor_id == User.id)
            .where(Enrollment.role == EnrollmentRoleEnum.STUDENT)
            .order_by(Enrollment.created_at.desc())
        )
        result = await db.execute(stmt)
        rows = result.all()

        items = []
        for course, instructor, _ in rows:
            # Count enrolled students for each course
            count_stmt = select(func.count(Enrollment.id)).where(
                (Enrollment.course_id == course.id) & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
            )
            cnt_res = await db.execute(count_stmt)
            student_count = cnt_res.scalar() or 0

            items.append({
                "course": course,
                "instructor_name": instructor.full_name if instructor else "Giảng viên",
                "student_count": student_count,
                "is_enrolled": True,
            })
        return items

    @staticmethod
    async def check_enrollment_exists(db: AsyncSession, student_id: str, course_id: str) -> bool:
        """Check if student is already enrolled in course."""
        stmt = select(Enrollment).where(
            (Enrollment.user_id == student_id) & (Enrollment.course_id == course_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none() is not None

    @staticmethod
    async def join_course(db: AsyncSession, student_id: str, course_id: str) -> Enrollment:
        """Create an enrollment record for student joining course."""
        enrollment = Enrollment(
            user_id=student_id,
            course_id=course_id,
            role=EnrollmentRoleEnum.STUDENT,
            status="active",
        )
        db.add(enrollment)
        await db.commit()
        await db.refresh(enrollment)
        return enrollment

    @staticmethod
    async def get_enrolled_students(db: AsyncSession, course_id: str) -> list[dict]:
        """Fetch list of enrolled students for a course."""
        stmt = (
            select(User, Enrollment)
            .join(Enrollment, User.id == Enrollment.user_id)
            .where(
                (Enrollment.course_id == course_id) & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
            )
            .order_by(Enrollment.created_at.desc())
        )
        result = await db.execute(stmt)
        rows = result.all()

        students = []
        for user, enrollment in rows:
            students.append({
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "joined_at": enrollment.created_at,
                "status": enrollment.status,
            })
        return students
