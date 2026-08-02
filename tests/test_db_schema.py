from datetime import UTC, datetime

import pytest
import pytest_asyncio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import selectinload

from src.db.base import Base
from src.db.enums import (
    AgentRunStatusEnum,
    SubmissionStatusEnum,
    TaskStatusEnum,
)
from src.db.models import (
    AgentRun,
    Assignment,
    Course,
    PromptVersion,
    ReflectionSession,
    Submission,
    Task,
    User,
    WeeklyGoal,
)

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
async def test_all_tables_metadata():
    """Verify all 22 tables exist in Base.metadata."""
    table_names = list(Base.metadata.tables.keys())
    expected_tables = [
        "users",
        "roles",
        "user_roles",
        "anonymous_profiles",
        "courses",
        "enrollments",
        "assignments",
        "submissions",
        "weekly_goals",
        "tasks",
        "notifications",
        "reflection_sessions",
        "reflection_messages",
        "chat_sessions",
        "chat_messages",
        "agent_memories",
        "recommendations",
        "ai_logs",
        "academic_integrity_logs",
        "agent_runs",
        "prompt_versions",
        "documents",
        "document_chunks",
        "sync_logs",
    ]
    for expected in expected_tables:
        assert expected in table_names, f"Missing table: {expected}"


@pytest.mark.asyncio
async def test_identity_and_learning_flow(async_session: AsyncSession):
    """Test User, Course, Assignment, Submission with direct Canvas LMS IDs."""
    user = User(
        canvas_user_id="canvas_u_123",
        email="student@vinuni.edu.vn",
        full_name="Nguyen Van A",
    )
    course = Course(
        canvas_course_id="canvas_c_456",
        code="COMP3010",
        name="AI & Software Engineering",
    )
    async_session.add_all([user, course])
    await async_session.commit()

    assignment = Assignment(
        course_id=course.id,
        canvas_assignment_id="canvas_a_789",
        title="Project 1: DB Architecture",
        points_possible=100.0,
    )
    async_session.add(assignment)
    await async_session.commit()

    submission = Submission(
        assignment_id=assignment.id,
        student_id=user.id,
        canvas_submission_id="canvas_sub_999",
        score=95.0,
        status=SubmissionStatusEnum.GRADED,
    )
    async_session.add(submission)
    await async_session.commit()

    res = await async_session.execute(select(Submission).where(Submission.id == submission.id))
    retrieved_sub = res.scalar_one()
    assert retrieved_sub.canvas_submission_id == "canvas_sub_999"
    assert retrieved_sub.score == 95.0


@pytest.mark.asyncio
async def test_multi_session_reflections(async_session: AsyncSession):
    """Test WeeklyGoal (1) -> (*) ReflectionSession relationship."""
    user = User(email="reflect@vinuni.edu.vn", full_name="Reflective Student")
    async_session.add(user)
    await async_session.commit()

    goal = WeeklyGoal(
        student_id=user.id,
        title="Complete 3 AI Modules",
        week_start_date=datetime.now(UTC),
        generated_by_agent="planner_agent",
        version=1,
    )
    async_session.add(goal)
    await async_session.commit()

    ref1 = ReflectionSession(weekly_goal_id=goal.id, student_id=user.id)
    ref2 = ReflectionSession(weekly_goal_id=goal.id, student_id=user.id)
    async_session.add_all([ref1, ref2])
    await async_session.commit()

    res = await async_session.execute(
        select(WeeklyGoal)
        .options(selectinload(WeeklyGoal.reflection_sessions))
        .where(WeeklyGoal.id == goal.id)
    )
    db_goal = res.scalar_one()
    assert len(db_goal.reflection_sessions) == 2


@pytest.mark.asyncio
async def test_agent_run_and_prompt_version(async_session: AsyncSession):
    """Test AI Observability (AgentRun) and PromptVersion models."""
    run = AgentRun(
        request_id="req_abc123",
        agent_name="tutor_agent",
        status=AgentRunStatusEnum.SUCCESS,
        duration_ms=450,
    )
    prompt = PromptVersion(
        agent_name="tutor_agent",
        version=2,
        prompt_template="You are a helpful learning assistant for {course_name}",
        is_active=True,
    )
    async_session.add_all([run, prompt])
    await async_session.commit()

    assert run.id is not None
    assert prompt.version == 2


@pytest.mark.asyncio
async def test_dynamic_metrics_calculation(async_session: AsyncSession):
    """Verify metrics like completion_rate are computed dynamically via SQL aggregations."""
    user = User(email="metrics@vinuni.edu.vn", full_name="Metric Test Student")
    async_session.add(user)
    await async_session.commit()

    goal = WeeklyGoal(
        student_id=user.id,
        title="Weekly Practice",
        week_start_date=datetime.now(UTC),
    )
    async_session.add(goal)
    await async_session.commit()

    t1 = Task(weekly_goal_id=goal.id, title="Task 1", status=TaskStatusEnum.COMPLETED)
    t2 = Task(weekly_goal_id=goal.id, title="Task 2", status=TaskStatusEnum.COMPLETED)
    t3 = Task(weekly_goal_id=goal.id, title="Task 3", status=TaskStatusEnum.TODO)
    async_session.add_all([t1, t2, t3])
    await async_session.commit()

    # Dynamic SQL aggregation for completion rate
    total_q = await async_session.execute(
        select(func.count(Task.id)).where(Task.weekly_goal_id == goal.id)
    )
    completed_q = await async_session.execute(
        select(func.count(Task.id)).where(
            Task.weekly_goal_id == goal.id, Task.status == TaskStatusEnum.COMPLETED
        )
    )
    total_count = total_q.scalar()
    completed_count = completed_q.scalar()

    completion_rate = (completed_count / total_count) * 100.0
    assert total_count == 3
    assert completed_count == 2
    assert pytest.approx(completion_rate, 0.1) == 66.6
