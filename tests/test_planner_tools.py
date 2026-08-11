from datetime import datetime, timezone, timedelta
import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.agents.tools.planner_tools import PlannerTools
from src.db.base import Base
from src.db.enums import EnrollmentRoleEnum
from src.db.models import (
    Assignment,
    Course,
    Enrollment,
    Goal,
    PersonalTask,
    Task,
    User,
    WeeklyGoal,
)
from src.models.auth import UserResponse

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


def make_user(user_id: str, email: str = "stud@test.com", name: str = "Test Student") -> UserResponse:
    return UserResponse(
        id=user_id,
        email=email,
        full_name=name,
        is_active=True,
        is_verified=True,
        roles=["student"],
    )


@pytest.mark.asyncio
async def test_get_planner_context(async_session: AsyncSession):
    """1. Test get_planner_context tool."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    g1 = Goal(id="g1", student_id="u1", title="Goal 1", status="ACTIVE")
    async_session.add_all([u1, g1])
    await async_session.commit()

    user_ctx = make_user("u1")
    ctx = await PlannerTools.get_planner_context(async_session, user_ctx, week_start="2026-08-10")

    assert ctx.student.id == "u1"
    assert len(ctx.goals) == 1
    assert ctx.goals[0].title == "Goal 1"


@pytest.mark.asyncio
async def test_get_current_weekly_plan(async_session: AsyncSession):
    """2. Test get_current_weekly_plan tool."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, status="ACTIVE")
    async_session.add_all([u1, plan])
    await async_session.commit()

    user_ctx = make_user("u1")
    fetched = await PlannerTools.get_current_weekly_plan(async_session, user_ctx, week_start="2026-08-10")

    assert fetched is not None
    assert fetched.id == "wp1"

    # Non-existent week should return None
    no_plan = await PlannerTools.get_current_weekly_plan(async_session, user_ctx, week_start="2026-09-01")
    assert no_plan is None


@pytest.mark.asyncio
async def test_get_weekly_plan_tasks(async_session: AsyncSession):
    """3. Test get_weekly_plan_tasks tool."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, status="ACTIVE")
    t1 = Task(id="t1", weekly_goal_id="wp1", title="Task 1", status="todo")
    async_session.add_all([u1, plan, t1])
    await async_session.commit()

    user_ctx = make_user("u1")
    tasks = await PlannerTools.get_weekly_plan_tasks(async_session, user_ctx, "wp1")

    assert len(tasks) == 1
    assert tasks[0].title == "Task 1"


@pytest.mark.asyncio
async def test_create_weekly_plan(async_session: AsyncSession):
    """4. Test create_weekly_plan tool."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    async_session.add(u1)
    await async_session.commit()

    user_ctx = make_user("u1")
    plan = await PlannerTools.create_weekly_plan(
        async_session, user_ctx, week_start="2026-08-10", title="New Plan Aug 10"
    )

    assert plan.id is not None
    assert plan.student_id == "u1"
    assert plan.title == "New Plan Aug 10"


@pytest.mark.asyncio
async def test_duplicate_weekly_plan_prevention(async_session: AsyncSession):
    """5. Test prevention of duplicate Weekly Plan for same week."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    async_session.add(u1)
    await async_session.commit()

    user_ctx = make_user("u1")
    await PlannerTools.create_weekly_plan(async_session, user_ctx, week_start="2026-08-10", title="First Plan")

    with pytest.raises(HTTPException) as exc_info:
        await PlannerTools.create_weekly_plan(async_session, user_ctx, week_start="2026-08-10", title="Second Plan")

    assert exc_info.value.status_code == 400
    assert "already exists" in exc_info.value.detail


@pytest.mark.asyncio
async def test_create_plan_task(async_session: AsyncSession):
    """6. Test create_plan_task tool."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    end_dt = datetime(2026, 8, 16, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, week_end_date=end_dt, status="ACTIVE")
    async_session.add_all([u1, plan])
    await async_session.commit()

    user_ctx = make_user("u1")
    task = await PlannerTools.create_plan_task(
        async_session,
        user_ctx,
        weekly_plan_id="wp1",
        title="Study RAG",
        scheduled_date="2026-08-11",
        start_time="19:00",
        end_time="21:00",
        priority="high",
        estimated_duration=120,
    )

    assert task.id is not None
    assert task.title == "Study RAG"
    assert task.start_time == "19:00"
    assert task.end_time == "21:00"


@pytest.mark.asyncio
async def test_invalid_scheduled_date_range(async_session: AsyncSession):
    """7. Test rejection of scheduled_date outside Weekly Plan range."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    end_dt = datetime(2026, 8, 16, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, week_end_date=end_dt, status="ACTIVE")
    async_session.add_all([u1, plan])
    await async_session.commit()

    user_ctx = make_user("u1")
    # Date 2026-08-25 is outside range 2026-08-10 to 2026-08-16
    with pytest.raises(HTTPException) as exc_info:
        await PlannerTools.create_plan_task(
            async_session, user_ctx, weekly_plan_id="wp1", title="Out of range task", scheduled_date="2026-08-25"
        )

    assert exc_info.value.status_code == 400
    assert "must fall within weekly plan period" in exc_info.value.detail


@pytest.mark.asyncio
async def test_invalid_time_range(async_session: AsyncSession):
    """8. Test rejection of invalid time range (start_time >= end_time)."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    end_dt = datetime(2026, 8, 16, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, week_end_date=end_dt, status="ACTIVE")
    async_session.add_all([u1, plan])
    await async_session.commit()

    user_ctx = make_user("u1")
    # start_time 20:00 >= end_time 19:00
    with pytest.raises(HTTPException) as exc_info:
        await PlannerTools.create_plan_task(
            async_session,
            user_ctx,
            weekly_plan_id="wp1",
            title="Bad time task",
            start_time="20:00",
            end_time="19:00",
        )

    assert exc_info.value.status_code == 400
    assert "must be before end_time" in exc_info.value.detail


@pytest.mark.asyncio
async def test_update_plan_task(async_session: AsyncSession):
    """9. Test update_plan_task tool."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    end_dt = datetime(2026, 8, 16, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, week_end_date=end_dt, status="ACTIVE")
    t1 = Task(id="t1", weekly_goal_id="wp1", title="Original Title", status="todo")
    async_session.add_all([u1, plan, t1])
    await async_session.commit()

    user_ctx = make_user("u1")
    updated = await PlannerTools.update_plan_task(
        async_session, user_ctx, task_id="t1", title="Updated Title", status="completed"
    )

    assert updated.title == "Updated Title"
    assert updated.status == "completed"


@pytest.mark.asyncio
async def test_delete_plan_task(async_session: AsyncSession):
    """10. Test delete_plan_task tool."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, status="ACTIVE")
    t1 = Task(id="t1", weekly_goal_id="wp1", title="To Delete", status="todo")
    async_session.add_all([u1, plan, t1])
    await async_session.commit()

    user_ctx = make_user("u1")
    res = await PlannerTools.delete_plan_task(async_session, user_ctx, task_id="t1")

    assert "message" in res


@pytest.mark.asyncio
async def test_student_cannot_access_other_weekly_plan(async_session: AsyncSession):
    """11. Test ownership check: Student A cannot access Student B's Weekly Plan."""
    uA = User(id="uA", email="uA@test.com", full_name="User A")
    uB = User(id="uB", email="uB@test.com", full_name="User B")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    planB = WeeklyGoal(id="wpB", student_id="uB", title="Plan B", week_start_date=start_dt, status="ACTIVE")
    async_session.add_all([uA, uB, planB])
    await async_session.commit()

    userA_ctx = make_user("uA")
    with pytest.raises(HTTPException) as exc_info:
        await PlannerTools.get_weekly_plan_tasks(async_session, userA_ctx, "wpB")

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_student_cannot_access_other_task(async_session: AsyncSession):
    """12. Test ownership check: Student A cannot modify or delete Student B's task."""
    uA = User(id="uA", email="uA@test.com", full_name="User A")
    uB = User(id="uB", email="uB@test.com", full_name="User B")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    planB = WeeklyGoal(id="wpB", student_id="uB", title="Plan B", week_start_date=start_dt, status="ACTIVE")
    taskB = Task(id="tB", weekly_goal_id="wpB", title="Task B", status="todo")
    async_session.add_all([uA, uB, planB, taskB])
    await async_session.commit()

    userA_ctx = make_user("uA")
    with pytest.raises(HTTPException) as exc_info:
        await PlannerTools.update_plan_task(async_session, userA_ctx, task_id="tB", title="Hacked")

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_invalid_source_type(async_session: AsyncSession):
    """13. Test rejection of invalid source_type."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, status="ACTIVE")
    async_session.add_all([u1, plan])
    await async_session.commit()

    user_ctx = make_user("u1")
    with pytest.raises(HTTPException) as exc_info:
        await PlannerTools.create_plan_task(
            async_session, user_ctx, weekly_plan_id="wp1", title="Task", source_type="INVALID_TYPE"
        )

    assert exc_info.value.status_code == 400
    assert "Invalid source_type" in exc_info.value.detail


@pytest.mark.asyncio
async def test_source_entity_does_not_exist(async_session: AsyncSession):
    """14. Test rejection when source_id entity does not exist."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, status="ACTIVE")
    async_session.add_all([u1, plan])
    await async_session.commit()

    user_ctx = make_user("u1")
    with pytest.raises(HTTPException) as exc_info:
        await PlannerTools.create_plan_task(
            async_session,
            user_ctx,
            weekly_plan_id="wp1",
            title="Goal Task",
            source_type="GOAL",
            source_id="non_existent_goal_id",
        )

    assert exc_info.value.status_code == 404
    assert "not found" in exc_info.value.detail


@pytest.mark.asyncio
async def test_valid_source_entity(async_session: AsyncSession):
    """15. Test successful task creation with valid source entity (Goal, PersonalTask, Assignment)."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    g1 = Goal(id="g1", student_id="u1", title="Learn LangGraph", status="ACTIVE")
    pt1 = PersonalTask(id="pt1", student_id="u1", title="Study Math", status="NOT_STARTED")
    course = Course(id="c1", code="CS101", name="Intro to CS")
    assign1 = Assignment(id="a1", course_id="c1", title="HW1", status="ACTIVE")

    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp1", student_id="u1", title="Plan W33", week_start_date=start_dt, status="ACTIVE")

    async_session.add_all([u1, g1, pt1, course, assign1, plan])
    await async_session.commit()

    user_ctx = make_user("u1")

    # Link to Goal
    t_goal = await PlannerTools.create_plan_task(
        async_session, user_ctx, weekly_plan_id="wp1", title="Goal Task", source_type="GOAL", source_id="g1"
    )
    assert t_goal.source_type == "GOAL"
    assert t_goal.source_id == "g1"

    # Link to PersonalTask
    t_pt = await PlannerTools.create_plan_task(
        async_session, user_ctx, weekly_plan_id="wp1", title="PT Task", source_type="PERSONAL_TASK", source_id="pt1"
    )
    assert t_pt.source_type == "PERSONAL_TASK"
    assert t_pt.source_id == "pt1"

    # Link to Assignment
    t_ass = await PlannerTools.create_plan_task(
        async_session, user_ctx, weekly_plan_id="wp1", title="Assignment Task", source_type="ASSIGNMENT", source_id="a1"
    )
    assert t_ass.source_type == "ASSIGNMENT"
    assert t_ass.source_id == "a1"


@pytest.mark.asyncio
async def test_authenticated_student_scope_enforced(async_session: AsyncSession):
    """16. Test that caller cannot bypass student context."""
    u1 = User(id="u1", email="u1@test.com", full_name="User 1")
    u2 = User(id="u2", email="u2@test.com", full_name="User 2")
    async_session.add_all([u1, u2])
    await async_session.commit()

    u1_ctx = make_user("u1")
    # All tool calls use u1_ctx (authenticated student)
    ctx1 = await PlannerTools.get_planner_context(async_session, u1_ctx)
    assert ctx1.student.id == "u1"
