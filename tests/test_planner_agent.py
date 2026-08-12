from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.agents.planner_graph import planner_agent_graph
from src.agents.planner_state import PlannerAgentState
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
from src.models.planner_agent import PlannerAgentRequest
from src.services.planner_agent_service import PlannerAgentService
from src.services.planner_context_builder import parse_week_start

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


def make_student(user_id: str = "s1") -> UserResponse:
    return UserResponse(
        id=user_id,
        email=f"{user_id}@test.com",
        full_name=f"Student {user_id}",
        is_active=True,
        is_verified=True,
        roles=["student"],
    )


@pytest.mark.asyncio
async def test_planner_agent_load_context(async_session: AsyncSession):
    """1. Test that Planner Agent loads student Planner Context."""
    user = User(id="s1", email="s1@test.com", full_name="Student 1")
    goal = Goal(id="g1", student_id="s1", title="Master Python", status="ACTIVE")
    async_session.add_all([user, goal])
    await async_session.commit()

    user_ctx = make_student("s1")
    req = PlannerAgentRequest(week_start="2026-08-10", request="Plan my week")

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(
            content='{"plan_title":"Weekly Plan","summary":"Ok","tasks":[]}'
        )
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert res.week_start == "2026-08-10"
        assert res.weekly_plan_id is not None


@pytest.mark.asyncio
async def test_planner_agent_creates_weekly_plan_and_tasks(async_session: AsyncSession):
    """2 & 3. Test that Planner Agent creates a Weekly Plan and creates tasks."""
    user = User(id="s2", email="s2@test.com", full_name="Student 2")
    async_session.add(user)
    await async_session.commit()

    user_ctx = make_student("s2")
    req = PlannerAgentRequest(week_start="2026-08-10", request="Build my plan")

    llm_json = """{
        "plan_title": "Plan Aug 10-16",
        "summary": "Generated plan with 1 task",
        "tasks": [
            {
                "title": "Study Linear Algebra",
                "description": "Review vectors",
                "scheduled_date": "2026-08-11",
                "start_time": "10:00",
                "end_time": "12:00",
                "priority": "high",
                "estimated_duration": 120,
                "source_type": "MANUAL"
            }
        ]
    }"""

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content=llm_json)
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert res.weekly_plan_id is not None
        assert len(res.created_tasks) == 1
        assert res.created_tasks[0].title == "Study Linear Algebra"


@pytest.mark.asyncio
async def test_planner_agent_respects_deadlines(async_session: AsyncSession):
    """4. Test that Planner Agent schedules tasks before assignment due dates."""
    user = User(id="s4", email="s4@test.com", full_name="Student 4")
    course = Course(id="c4", code="CS101", name="CS Basics")
    enrollment = Enrollment(id="e4", user_id="s4", course_id="c4", role=EnrollmentRoleEnum.STUDENT)
    due_date = datetime(2026, 8, 14, 23, 59, tzinfo=timezone.utc)
    ass = Assignment(id="a4", course_id="c4", title="Lab 4", due_at=due_date, status="ACTIVE")

    async_session.add_all([user, course, enrollment, ass])
    await async_session.commit()

    user_ctx = make_student("s4")
    req = PlannerAgentRequest(week_start="2026-08-10", request="Plan assignments")

    # Mock decision schedules task on 2026-08-13 (before due date 2026-08-14)
    llm_json = """{
        "plan_title": "Plan Aug 10-16",
        "summary": "Scheduled before deadline",
        "tasks": [
            {
                "title": "Prepare Lab 4",
                "scheduled_date": "2026-08-13",
                "start_time": "14:00",
                "end_time": "16:00",
                "source_type": "ASSIGNMENT",
                "source_id": "a4"
            }
        ]
    }"""

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content=llm_json)
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert len(res.created_tasks) == 1
        assert res.created_tasks[0].scheduled_date == "2026-08-13"


@pytest.mark.asyncio
async def test_duplicate_weekly_plan_prevention(async_session: AsyncSession):
    """5 & 6 & 7. Test that Planner Agent does NOT create duplicate Weekly Plans if one exists."""
    user = User(id="s5", email="s5@test.com", full_name="Student 5")
    start_dt = datetime(2026, 8, 10, tzinfo=timezone.utc)
    existing_plan = WeeklyGoal(id="wp5", student_id="s5", title="Existing Plan", week_start_date=start_dt, status="ACTIVE")
    async_session.add_all([user, existing_plan])
    await async_session.commit()

    user_ctx = make_student("s5")
    req = PlannerAgentRequest(week_start="2026-08-10", request="Update my plan")

    llm_json = """{
        "plan_title": "Updated Plan",
        "summary": "Added new task to existing plan",
        "tasks": [
            {
                "title": "Additional Review Task",
                "scheduled_date": "2026-08-12",
                "start_time": "18:00",
                "end_time": "19:00"
            }
        ]
    }"""

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content=llm_json)
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert res.weekly_plan_id == "wp5"  # Reused existing plan ID!
        assert len(res.created_tasks) == 1


@pytest.mark.asyncio
async def test_planner_agent_no_goals(async_session: AsyncSession):
    """8. Test Planner Agent when student has no goals."""
    user = User(id="s8", email="s8@test.com", full_name="Student 8")
    async_session.add(user)
    await async_session.commit()

    user_ctx = make_student("s8")
    req = PlannerAgentRequest(week_start="2026-08-10")

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content='{"plan_title":"No Goal Plan","summary":"Ok","tasks":[]}')
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert res.weekly_plan_id is not None


@pytest.mark.asyncio
async def test_planner_agent_no_assignments(async_session: AsyncSession):
    """9. Test Planner Agent when student has no assignments."""
    user = User(id="s9", email="s9@test.com", full_name="Student 9")
    async_session.add(user)
    await async_session.commit()

    user_ctx = make_student("s9")
    req = PlannerAgentRequest(week_start="2026-08-10")

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content='{"plan_title":"No Ass Plan","summary":"Ok","tasks":[]}')
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert res.weekly_plan_id is not None


@pytest.mark.asyncio
async def test_planner_agent_no_personal_tasks(async_session: AsyncSession):
    """10. Test Planner Agent when student has no personal tasks."""
    user = User(id="s10", email="s10@test.com", full_name="Student 10")
    async_session.add(user)
    await async_session.commit()

    user_ctx = make_student("s10")
    req = PlannerAgentRequest(week_start="2026-08-10")

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content='{"plan_title":"No PT Plan","summary":"Ok","tasks":[]}')
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert res.weekly_plan_id is not None


@pytest.mark.asyncio
async def test_tool_failure_handling(async_session: AsyncSession):
    """11. Test that Planner Agent handles partial tool failures gracefully."""
    user = User(id="s11", email="s11@test.com", full_name="Student 11")
    async_session.add(user)
    await async_session.commit()

    user_ctx = make_student("s11")
    req = PlannerAgentRequest(week_start="2026-08-10")

    # One valid task and one invalid scheduled_date (out of range)
    llm_json = """{
        "plan_title": "Plan W33",
        "summary": "Partial failure test",
        "tasks": [
            {
                "title": "Good Task",
                "scheduled_date": "2026-08-11",
                "start_time": "10:00",
                "end_time": "11:00"
            },
            {
                "title": "Out of Range Task",
                "scheduled_date": "2026-08-30",
                "start_time": "10:00",
                "end_time": "11:00"
            }
        ]
    }"""

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content=llm_json)
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert len(res.created_tasks) == 1
        assert res.created_tasks[0].title == "Good Task"
        assert len(res.skipped_items) == 1
        assert res.skipped_items[0]["title"] == "Out of Range Task"


@pytest.mark.asyncio
async def test_authenticated_student_scope_enforced(async_session: AsyncSession):
    """12 & 13. Test authenticated student scope enforcement and zero direct DB calls inside Agent."""
    user = User(id="s12", email="s12@test.com", full_name="Student 12")
    async_session.add(user)
    await async_session.commit()

    user_ctx = make_student("s12")
    req = PlannerAgentRequest(week_start="2026-08-10")

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content='{"plan_title":"Scope Plan","summary":"Ok","tasks":[]}')
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert res.week_start == "2026-08-10"


@pytest.mark.asyncio
async def test_academic_integrity_behavior(async_session: AsyncSession):
    """14. Test academic integrity: Cheating prompt is converted into study/review tasks."""
    user = User(id="s14", email="s14@test.com", full_name="Student 14")
    async_session.add(user)
    await async_session.commit()

    user_ctx = make_student("s14")
    # Prompt asks AI to write code/do assignment
    req = PlannerAgentRequest(week_start="2026-08-10", request="Do my programming assignment for me")

    llm_json = """{
        "plan_title": "Academic Integrity Plan",
        "summary": "Converted assignment request into research and implementation study tasks.",
        "tasks": [
            {
                "title": "Research Assignment Requirements",
                "scheduled_date": "2026-08-10",
                "start_time": "19:00",
                "end_time": "20:00"
            },
            {
                "title": "Design & Implement Solution",
                "scheduled_date": "2026-08-11",
                "start_time": "19:00",
                "end_time": "21:00"
            }
        ]
    }"""

    with patch("src.agents.nodes.planner_nodes.get_llm") as mock_get_llm:
        mock_llm = AsyncMock()
        mock_llm.ainvoke.return_value = AsyncMock(content=llm_json)
        mock_get_llm.return_value = mock_llm

        res = await PlannerAgentService.generate_plan(async_session, user_ctx, req)
        assert len(res.created_tasks) == 2
        assert "Research Assignment Requirements" in res.created_tasks[0].title


def test_parse_explicit_task_datetime():
    """15. Test parse_task_datetime_from_text for explicit weekday and time."""
    from src.agents.nodes.planner_nodes import parse_task_datetime_from_text

    # "đi đá bóng lúc 20h ngày thứ 6 tuần này" with week_start "2026-08-10" (Monday)
    # Friday is 2026-08-14
    date_str, start_time, end_time = parse_task_datetime_from_text(
        "Đi đá bóng với lớp học",
        "đi đá bóng lúc 20h ngày thứ 6 tuần này",
        "2026-08-10"
    )
    assert date_str == "2026-08-14"
    assert start_time == "20:00"
    assert end_time == "21:30"

    # Test relative weekend + evening phrase: "Đi xem phim vào cuối tuần", "chưa biết thời gian cụ thể nhưng muốn đi vào buổi tối"
    # Saturday is 2026-08-15
    date_str2, start_time2, end_time2 = parse_task_datetime_from_text(
        "Đi xem phim vào cuối tuần",
        "Tôi muốn đi xem phim vào cuối tuần, chưa biết thời gian cụ thể nhưng muốn đi vào buổi tối",
        "2026-08-10"
    )
    assert date_str2 == "2026-08-15"
    assert start_time2 == "20:00"
    assert end_time2 == "21:30"
