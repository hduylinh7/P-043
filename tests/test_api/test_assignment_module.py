from datetime import datetime
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.base import Base
from src.db.models import Assignment, Course, Enrollment, StudentAssignmentProgress, User
from src.models.assignment import (
    AssignmentCreateRequest,
    AssignmentProgressUpdateRequest,
    AssignmentUpdateRequest,
)
from src.models.auth import UserResponse
from src.models.course import CourseCreateRequest
from src.services.assignment_service import AssignmentService
from src.services.course_service import CourseService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(loop_scope="function")
async def async_session():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_assignment_lifecycle_and_permissions(async_session: AsyncSession):
    # 1. Create Instructor and Student users in DB
    instructor = User(id="inst_1", email="instructor@test.com", full_name="Instructor One")
    student = User(id="stud_1", email="student@test.com", full_name="Student One")
    unauthorized_student = User(id="stud_2", email="student2@test.com", full_name="Student Two")

    async_session.add_all([instructor, student, unauthorized_student])
    await async_session.commit()

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

    # 2. Instructor creates a course
    course_resp = await CourseService.create_course(
        async_session,
        CourseCreateRequest(name="Software Engineering", code="CS301", description="SE Course"),
        instructor_user,
    )
    course_id = course_resp.id

    # 3. Student joins course
    await CourseService.join_course(async_session, course_id, student_user)

    # 4. Instructor creates an assignment
    create_payload = AssignmentCreateRequest(
        title="Assignment 1: Architecture",
        description="Design system architecture",
        due_date=datetime.now(),
        estimated_hours=4.5,
        status="ACTIVE",
    )
    assignment = await AssignmentService.create_assignment(
        async_session, course_id, create_payload, instructor_user
    )
    assert assignment.title == "Assignment 1: Architecture"
    assert assignment.estimated_hours == 4.5
    assert assignment.status == "ACTIVE"

    # 5. Non-owner / unauthorized student cannot create assignment
    with pytest.raises(Exception):
        await AssignmentService.create_assignment(
            async_session, course_id, create_payload, student_user
        )

    # 6. Enrolled student views assignments
    student_assignments = await AssignmentService.get_course_assignments(
        async_session, course_id, student_user
    )
    assert len(student_assignments) == 1
    assert student_assignments[0].progress_status == "NOT_STARTED"

    # 7. Non-enrolled student cannot view course assignments
    with pytest.raises(Exception):
        await AssignmentService.get_course_assignments(
            async_session, course_id, unauthorized_student_user
        )

    # 8. Student updates progress to IN_PROGRESS
    progress_resp = await AssignmentService.update_student_progress(
        async_session,
        assignment.id,
        AssignmentProgressUpdateRequest(progress_status="IN_PROGRESS"),
        student_user,
    )
    assert progress_resp.progress_status == "IN_PROGRESS"

    # 9. Student updates progress to COMPLETED
    progress_resp2 = await AssignmentService.update_student_progress(
        async_session,
        assignment.id,
        AssignmentProgressUpdateRequest(progress_status="COMPLETED"),
        student_user,
    )
    assert progress_resp2.progress_status == "COMPLETED"

    # 10. Instructor updates assignment
    update_payload = AssignmentUpdateRequest(
        title="Assignment 1: Architecture (Updated)",
        estimated_hours=6.0,
    )
    updated_assignment = await AssignmentService.update_assignment(
        async_session, assignment.id, update_payload, instructor_user
    )
    assert updated_assignment.title == "Assignment 1: Architecture (Updated)"
    assert updated_assignment.estimated_hours == 6.0

    # 11. Instructor deletes assignment
    delete_res = await AssignmentService.delete_assignment(
        async_session, assignment.id, instructor_user
    )
    assert delete_res["message"] == "Xóa bài tập thành công."

    # 12. Verify assignment is gone
    remaining = await AssignmentService.get_course_assignments(
        async_session, course_id, instructor_user
    )
    assert len(remaining) == 0
