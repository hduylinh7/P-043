from datetime import datetime, timezone, timedelta
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.base import Base
from src.db.enums import EnrollmentRoleEnum, SubmissionStatusEnum
from src.db.models import (
    Assignment,
    Course,
    CourseMaterial,
    Enrollment,
    Goal,
    Submission,
    Task,
    User,
    WeeklyGoal,
)
from src.models.auth import UserResponse
from src.services.student_context_service import StudentLearningContextService
from src.agents.companion_agent import PersonalLearningCompanionAgent

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


def make_student_user(user_id: str = "student_1", email: str = "student1@vinuni.edu.vn", name: str = "Alice Student") -> UserResponse:
    return UserResponse(
        id=user_id,
        email=email,
        full_name=name,
        is_active=True,
        is_verified=True,
        roles=["student"],
    )


@pytest.mark.asyncio
async def test_build_student_context_all_data(async_session: AsyncSession):
    """Test building complete learning context for a student with courses, assignments, goals, and weekly plan."""
    # 1. Setup DB entities
    student = User(id="student_1", email="student1@vinuni.edu.vn", full_name="Alice Student")
    course = Course(id="course_ml", code="CS301", name="Machine Learning", description="Intro to ML algorithms")
    enrollment = Enrollment(id="enroll_1", user_id="student_1", course_id="course_ml", role=EnrollmentRoleEnum.STUDENT)
    material = CourseMaterial(id="mat_1", course_id="course_ml", title="ML Lecture 1", type="lecture_slide", file_name="ml_lec1.pdf", file_url="http://example.com/file.pdf")

    goal = Goal(id="goal_1", student_id="student_1", title="Master Classification Models", status="ACTIVE", priority="HIGH")

    due_dt = datetime.now(timezone.utc) + timedelta(days=3)
    assign1 = Assignment(id="ass_1", course_id="course_ml", title="Classification Assignment", status="ACTIVE", due_at=due_dt, priority="HIGH")
    assign2 = Assignment(id="ass_2", course_id="course_ml", title="Regression Assignment", status="ACTIVE", due_at=due_dt, priority="MEDIUM")

    sub2 = Submission(
        id="sub_2",
        assignment_id="ass_2",
        student_id="student_1",
        status=SubmissionStatusEnum.GRADED,
        submitted_at=datetime.now(timezone.utc) - timedelta(days=1),
        score=9.5,
        grade="GRADED",
        feedback="Excellent regression analysis!",
    )

    async_session.add_all([student, course, enrollment, material, goal, assign1, assign2, sub2])
    await async_session.commit()

    student_user = make_student_user("student_1")
    context = await StudentLearningContextService.build_student_context(async_session, student_user)

    # 2. Assertions
    assert context["student_info"]["student_id"] == "student_1"
    assert len(context["goals"]) == 1
    assert context["goals"][0]["title"] == "Master Classification Models"

    assert len(context["courses"]) == 1
    assert context["courses"][0]["course_code"] == "CS301"
    assert len(context["courses"][0]["materials"]) == 1

    assert len(context["assignments"]) == 2
    ass1_ctx = next(a for a in context["assignments"] if a["id"] == "ass_1")
    assert ass1_ctx["is_submitted"] is False
    assert ass1_ctx["submission_status"] == "NOT_SUBMITTED"

    ass2_ctx = next(a for a in context["assignments"] if a["id"] == "ass_2")
    assert ass2_ctx["is_submitted"] is True
    assert ass2_ctx["score"] == 9.5
    assert ass2_ctx["feedback"] == "Excellent regression analysis!"

    # Progress stats
    progress = context["learning_progress"]
    assert progress["enrolled_courses_count"] == 1
    assert progress["total_assignments_count"] == 2
    assert progress["submitted_assignments_count"] == 1
    assert progress["unsubmitted_assignments_count"] == 1
    assert progress["graded_assignments_count"] == 1
    assert progress["average_score"] == 9.5


@pytest.mark.asyncio
async def test_build_student_context_security_isolation(async_session: AsyncSession):
    """Test security scoping: Student A cannot retrieve Student B's courses or goals."""
    student_a = User(id="student_a", email="a@vinuni.edu.vn", full_name="Student A")
    student_b = User(id="student_b", email="b@vinuni.edu.vn", full_name="Student B")

    goal_b = Goal(id="goal_b", student_id="student_b", title="Secret Goal B", status="ACTIVE")

    async_session.add_all([student_a, student_b, goal_b])
    await async_session.commit()

    user_a = make_student_user("student_a")
    context_a = await StudentLearningContextService.build_student_context(async_session, user_a)

    assert context_a["student_info"]["student_id"] == "student_a"
    assert len(context_a["goals"]) == 0
    assert "personal_tasks" not in context_a  # No personal tasks feature


@pytest.mark.asyncio
async def test_companion_agent_execution(async_session: AsyncSession):
    """Test PersonalLearningCompanionAgent runs successfully with mock DB context."""
    student = User(id="student_test", email="test@vinuni.edu.vn", full_name="Test Student")
    course = Course(id="c_test", code="AI201", name="Artificial Intelligence")
    enrollment = Enrollment(id="e_test", user_id="student_test", course_id="c_test", role=EnrollmentRoleEnum.STUDENT)
    assignment = Assignment(id="a_test", course_id="c_test", title="Neural Network Lab", status="ACTIVE")

    async_session.add_all([student, course, enrollment, assignment])
    await async_session.commit()

    student_user = make_student_user("student_test")
    res = await PersonalLearningCompanionAgent.run(
        db=async_session,
        current_user=student_user,
        query="Tôi đang học những môn nào?",
    )

    assert "response" in res
    assert res["response"] is not None
    assert len(res["response"]) > 0
