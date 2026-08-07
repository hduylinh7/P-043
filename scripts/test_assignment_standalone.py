import sys
import os
sys.path.insert(0, os.path.abspath("."))
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.base import Base
from src.db.models import Assignment, Course, Enrollment, StudentAssignmentProgress, User
from src.models.assignment import (
    AssignmentCreateRequest,
    AssignmentProgressUpdateRequest,
    AssignmentUpdateRequest,
)
from src.models.course import CourseCreateRequest
from src.models.auth import UserResponse
from src.services.assignment_service import AssignmentService
from src.services.course_service import CourseService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


async def run_standalone_test():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        # 1. Users
        instructor = User(id="inst_1", email="instructor@test.com", full_name="Instructor One")
        student = User(id="stud_1", email="student@test.com", full_name="Student One")
        unauthorized_student = User(id="stud_2", email="student2@test.com", full_name="Student Two")

        session.add_all([instructor, student, unauthorized_student])
        await session.commit()

        instructor_user = UserResponse(
            id="inst_1",
            email="instructor@test.com",
            full_name="Instructor One",
            roles=["instructor"],
            is_active=True,
        )
        student_user = UserResponse(
            id="stud_1",
            email="student@test.com",
            full_name="Student One",
            roles=["student"],
            is_active=True,
        )
        unauthorized_student_user = UserResponse(
            id="stud_2",
            email="student2@test.com",
            full_name="Student Two",
            roles=["student"],
            is_active=True,
        )

        # 2. Course Creation
        course_resp = await CourseService.create_course(
            session,
            CourseCreateRequest(name="Software Engineering", code="CS301", description="SE Course"),
            instructor_user,
        )
        course_id = course_resp.id
        print("[OK] Course created:", course_id)

        # 3. Student joins course
        await CourseService.join_course(session, course_id, student_user)
        print("[OK] Student joined course CS301")

        # 4. Instructor creates assignment
        create_payload = AssignmentCreateRequest(
            title="Assignment 1: Architecture",
            description="Design system architecture",
            due_date=datetime.now(),
            estimated_hours=4.5,
            status="ACTIVE",
        )
        assignment = await AssignmentService.create_assignment(
            session, course_id, create_payload, instructor_user
        )
        print("[OK] Assignment created:", assignment.title, "ID:", assignment.id)
        assert assignment.title == "Assignment 1: Architecture"
        assert assignment.estimated_hours == 4.5
        assert assignment.status == "ACTIVE"

        # 5. Enrolled student views assignment
        student_assignments = await AssignmentService.get_course_assignments(
            session, course_id, student_user
        )
        print("[OK] Student fetched assignments count:", len(student_assignments))
        assert len(student_assignments) == 1
        assert student_assignments[0].progress_status == "NOT_STARTED"

        # 6. Student updates progress to IN_PROGRESS and COMPLETED
        p1 = await AssignmentService.update_student_progress(
            session,
            assignment.id,
            AssignmentProgressUpdateRequest(progress_status="IN_PROGRESS"),
            student_user,
        )
        print("[OK] Student updated progress to:", p1.progress_status)
        assert p1.progress_status == "IN_PROGRESS"

        p2 = await AssignmentService.update_student_progress(
            session,
            assignment.id,
            AssignmentProgressUpdateRequest(progress_status="COMPLETED"),
            student_user,
        )
        print("[OK] Student updated progress to:", p2.progress_status)
        assert p2.progress_status == "COMPLETED"

        # 7. Instructor updates assignment
        updated_assignment = await AssignmentService.update_assignment(
            session,
            assignment.id,
            AssignmentUpdateRequest(title="Assignment 1: Architecture (Updated)", estimated_hours=6.0),
            instructor_user,
        )
        print("[OK] Instructor updated assignment title to:", updated_assignment.title)
        assert updated_assignment.title == "Assignment 1: Architecture (Updated)"

        # 8. Instructor deletes assignment
        del_res = await AssignmentService.delete_assignment(session, assignment.id, instructor_user)
        print("[OK] Instructor deleted assignment successfully")

        # 9. Verify deletion
        remaining = await AssignmentService.get_course_assignments(session, course_id, instructor_user)
        assert len(remaining) == 0
        print("[OK] Verification completed: 0 remaining assignments.")

    await engine.dispose()
    print("ALL ASSIGNMENT PHASE 1 TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_standalone_test())
