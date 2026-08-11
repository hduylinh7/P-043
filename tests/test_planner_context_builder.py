from datetime import datetime, timezone, timedelta
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.base import Base
from src.db.enums import EnrollmentRoleEnum, SubmissionStatusEnum
from src.db.models import (
    Assignment,
    Course,
    Enrollment,
    Goal,
    PersonalTask,
    Submission,
    Task,
    User,
    WeeklyGoal,
)
from src.models.auth import UserResponse
from src.services.planner_context_builder import PlannerContextBuilder, parse_week_start

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


def make_user_response(user_id: str, email: str = "test@example.com", name: str = "Test User") -> UserResponse:
    return UserResponse(
        id=user_id,
        email=email,
        full_name=name,
        is_active=True,
        is_verified=True,
        roles=["student"],
    )


@pytest.mark.asyncio
async def test_student_with_all_data(async_session: AsyncSession):
    """1. Test student with active goals, upcoming assignments, active personal tasks, and current weekly plan."""
    student = User(id="s1", email="student1@test.com", full_name="Student One")
    course = Course(id="c1", code="CS101", name="Intro to CS")
    enrollment = Enrollment(id="e1", user_id="s1", course_id="c1", role=EnrollmentRoleEnum.STUDENT)

    goal = Goal(id="g1", student_id="s1", title="Learn Python", status="ACTIVE", priority="HIGH")
    assignment = Assignment(id="a1", course_id="c1", title="HW1", status="ACTIVE", due_at=datetime.now(timezone.utc) + timedelta(days=2))
    p_task = PersonalTask(id="pt1", student_id="s1", title="Study Math", status="NOT_STARTED", priority="MEDIUM")

    week_start = parse_week_start("2026-08-10")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    weekly_plan = WeeklyGoal(
        id="wp1", student_id="s1", title="Plan Aug 10-16", week_start_date=start_dt, status="ACTIVE"
    )
    plan_task = Task(id="t1", weekly_goal_id="wp1", title="Review CS", status="todo", priority="medium")

    async_session.add_all([student, course, enrollment, goal, assignment, p_task, weekly_plan, plan_task])
    await async_session.commit()

    student_user = make_user_response("s1", "student1@test.com", "Student One")

    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    assert ctx.student.id == "s1"
    assert ctx.planning_period.week_start == "2026-08-10"
    assert ctx.planning_period.week_end == "2026-08-16"

    assert len(ctx.goals) == 1
    assert ctx.goals[0].title == "Learn Python"

    assert len(ctx.assignments) == 1
    assert ctx.assignments[0].title == "HW1"
    assert ctx.assignments[0].course_name == "Intro to CS"

    assert len(ctx.personal_tasks) == 1
    assert ctx.personal_tasks[0].title == "Study Math"

    assert ctx.current_weekly_plan is not None
    assert ctx.current_weekly_plan.id == "wp1"
    assert len(ctx.current_weekly_plan.tasks) == 1
    assert ctx.current_weekly_plan.tasks[0].title == "Review CS"


@pytest.mark.asyncio
async def test_no_goals(async_session: AsyncSession):
    """2. Test student with no goals."""
    student = User(id="s2", email="s2@test.com", full_name="Student Two")
    async_session.add(student)
    await async_session.commit()

    student_user = make_user_response("s2")
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    assert ctx.goals == []


@pytest.mark.asyncio
async def test_no_assignments(async_session: AsyncSession):
    """3. Test student with no assignments."""
    student = User(id="s3", email="s3@test.com", full_name="Student Three")
    async_session.add(student)
    await async_session.commit()

    student_user = make_user_response("s3")
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    assert ctx.assignments == []


@pytest.mark.asyncio
async def test_no_personal_tasks(async_session: AsyncSession):
    """4. Test student with no personal tasks."""
    student = User(id="s4", email="s4@test.com", full_name="Student Four")
    async_session.add(student)
    await async_session.commit()

    student_user = make_user_response("s4")
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    assert ctx.personal_tasks == []


@pytest.mark.asyncio
async def test_with_weekly_plan(async_session: AsyncSession):
    """5. Test student with existing weekly plan."""
    student = User(id="s5", email="s5@test.com", full_name="Student Five")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    plan = WeeklyGoal(id="wp5", student_id="s5", title="Plan Week 33", week_start_date=start_dt, status="ACTIVE")
    task = Task(id="t5", weekly_goal_id="wp5", title="Lab Exercise", status="todo")

    async_session.add_all([student, plan, task])
    await async_session.commit()

    student_user = make_user_response("s5")
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    assert ctx.current_weekly_plan is not None
    assert ctx.current_weekly_plan.id == "wp5"
    assert len(ctx.current_weekly_plan.tasks) == 1
    assert ctx.current_weekly_plan.tasks[0].title == "Lab Exercise"


@pytest.mark.asyncio
async def test_without_weekly_plan(async_session: AsyncSession):
    """6. Test student without a weekly plan."""
    student = User(id="s6", email="s6@test.com", full_name="Student Six")
    async_session.add(student)
    await async_session.commit()

    student_user = make_user_response("s6")
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    assert ctx.current_weekly_plan is None


@pytest.mark.asyncio
async def test_completed_tasks_and_assignments_excluded(async_session: AsyncSession):
    """7. Test completed personal tasks and submitted assignments are excluded."""
    student = User(id="s7", email="s7@test.com", full_name="Student Seven")
    course = Course(id="c7", code="CS102", name="Data Structures")
    enrollment = Enrollment(id="e7", user_id="s7", course_id="c7", role=EnrollmentRoleEnum.STUDENT)

    # Personal tasks: 1 completed, 1 active
    pt_done = PersonalTask(id="pt_done", student_id="s7", title="Done Task", status="COMPLETED")
    pt_active = PersonalTask(id="pt_act", student_id="s7", title="Active Task", status="IN_PROGRESS")

    # Assignment with submission
    assign1 = Assignment(id="a_submitted", course_id="c7", title="Submitted HW", status="ACTIVE")
    submission = Submission(id="sub1", assignment_id="a_submitted", student_id="s7", status=SubmissionStatusEnum.SUBMITTED)

    assign2 = Assignment(id="a_pending", course_id="c7", title="Pending HW", status="ACTIVE")

    async_session.add_all([student, course, enrollment, pt_done, pt_active, assign1, submission, assign2])
    await async_session.commit()

    student_user = make_user_response("s7")
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    # Personal tasks: only active included
    assert len(ctx.personal_tasks) == 1
    assert ctx.personal_tasks[0].id == "pt_act"

    # Assignments: only pending included
    assert len(ctx.assignments) == 1
    assert ctx.assignments[0].id == "a_pending"


@pytest.mark.asyncio
async def test_completed_or_archived_goals_excluded(async_session: AsyncSession):
    """8. Test completed/archived goals are excluded."""
    student = User(id="s8", email="s8@test.com", full_name="Student Eight")
    g_active = Goal(id="g_act", student_id="s8", title="Active Goal", status="ACTIVE")
    g_completed = Goal(id="g_comp", student_id="s8", title="Completed Goal", status="COMPLETED")
    g_archived = Goal(id="g_arch", student_id="s8", title="Archived Goal", status="ARCHIVED")

    async_session.add_all([student, g_active, g_completed, g_archived])
    await async_session.commit()

    student_user = make_user_response("s8")
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-10")

    assert len(ctx.goals) == 1
    assert ctx.goals[0].id == "g_act"


@pytest.mark.asyncio
async def test_another_student_data_not_returned(async_session: AsyncSession):
    """9. Test security isolation: student A cannot see student B's data."""
    studentA = User(id="sa", email="sa@test.com", full_name="Student A")
    studentB = User(id="sb", email="sb@test.com", full_name="Student B")

    goalB = Goal(id="gb", student_id="sb", title="Student B Goal", status="ACTIVE")
    ptaskB = PersonalTask(id="ptb", student_id="sb", title="Student B Task", status="NOT_STARTED")

    async_session.add_all([studentA, studentB, goalB, ptaskB])
    await async_session.commit()

    studentA_user = make_user_response("sa")
    ctx = await PlannerContextBuilder.build_context(async_session, studentA_user, week_start="2026-08-10")

    assert ctx.student.id == "sa"
    assert ctx.goals == []
    assert ctx.personal_tasks == []


@pytest.mark.asyncio
async def test_correct_planning_week_used(async_session: AsyncSession):
    """10. Test explicit week_start calculation (e.g. Wednesday 2026-08-12 yields Monday 2026-08-10 to Sunday 2026-08-16)."""
    student = User(id="s10", email="s10@test.com", full_name="Student Ten")
    async_session.add(student)
    await async_session.commit()

    student_user = make_user_response("s10")

    # Pass mid-week date 2026-08-12 (Wednesday)
    ctx = await PlannerContextBuilder.build_context(async_session, student_user, week_start="2026-08-12")

    assert ctx.planning_period.week_start == "2026-08-10"
    assert ctx.planning_period.week_end == "2026-08-16"
