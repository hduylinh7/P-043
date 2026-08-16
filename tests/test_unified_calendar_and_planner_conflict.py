from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient

from src.db.models import Course, CourseSchedule, Enrollment, User
from src.db.enums import EnrollmentRoleEnum
from src.main import app
from src.core.security import create_access_token
from tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_unified_calendar_and_fixed_class_conflict():
    """
    Test deterministic schedule conflict prevention against fixed university lectures,
    and verify unified calendar API output.
    """
    async with TestSessionLocal() as db:
        # 1. Create Instructor
        instructor = User(
            id="inst_user_99",
            email="prof@vinuni.edu.vn",
            full_name="Prof. John von Neumann",
            is_verified=True,
        )
        db.add(instructor)

        # 2. Create Student (test_user_1 matches conftest override)
        student = User(
            id="test_user_1",
            email="test@example.com",
            full_name="Test Student",
            is_verified=True,
        )
        db.add(student)

        # 3. Create Course with Monday 08:00 - 10:00 fixed schedule
        now = datetime.now(timezone.utc)
        course = Course(
            id="course_algo_500",
            code="CS500",
            name="Advanced Algorithms",
            credits=3,
            start_date=now - timedelta(days=10),
            end_date=now + timedelta(days=90),
            instructor_id=instructor.id,
        )
        db.add(course)

        sched = CourseSchedule(
            id="sched_algo_1",
            course_id=course.id,
            day_of_week="Monday",
            start_time="08:00",
            end_time="10:00",
            room="Room A1-101",
        )
        db.add(sched)

        # Enroll student in course
        enrollment = Enrollment(
            user_id=student.id,
            course_id=course.id,
            role=EnrollmentRoleEnum.STUDENT,
            status="active",
        )
        db.add(enrollment)
        await db.commit()

    token = create_access_token({"sub": "test_user_1", "email": "test@example.com", "roles": ["student"]})
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        # 1. Create a Weekly Plan
        monday_str = (now.date() - timedelta(days=now.date().weekday())).strftime("%Y-%m-%d")
        plan_resp = await client.post(
            "/api/v1/weekly-plans",
            json={
                "title": f"Kế hoạch tuần {monday_str}",
                "week_start_date": monday_str,
                "status": "ACTIVE",
            },
            headers=headers,
        )
        assert plan_resp.status_code == 201, plan_resp.text
        plan_id = plan_resp.json()["id"]

        # 2. Attempt to create a study session task on Monday 09:00 - 10:30 (OVERLAPS with Monday 08:00 - 10:00 Fixed Class)
        conf_task_resp = await client.post(
            f"/api/v1/weekly-plans/{plan_id}/tasks",
            json={
                "title": "Ôn tập Algorithms",
                "scheduled_date": monday_str,
                "start_time": "09:00",
                "end_time": "10:30",
                "priority": "medium",
                "source_type": "MANUAL",
            },
            headers=headers,
        )
        assert conf_task_resp.status_code == 400, conf_task_resp.text
        assert "Trùng lịch!" in conf_task_resp.json()["detail"]
        assert "Lịch học giảng đường cố định" in conf_task_resp.json()["detail"]

        # 3. Create a valid non-overlapping study session task on Monday 19:00 - 20:30
        ok_task_resp = await client.post(
            f"/api/v1/weekly-plans/{plan_id}/tasks",
            json={
                "title": "Ôn tập Algorithms Buổi Tối",
                "scheduled_date": monday_str,
                "start_time": "19:00",
                "end_time": "20:30",
                "priority": "medium",
                "source_type": "MANUAL",
            },
            headers=headers,
        )
        assert ok_task_resp.status_code == 201, ok_task_resp.text

        # 4. Fetch Unified Calendar -> Should contain both Fixed Class (08:00-10:00) and Student Study Session (19:00-20:30)
        cal_resp = await client.get(
            f"/api/v1/weekly-plans/unified-calendar?week_start={monday_str}",
            headers=headers,
        )
        assert cal_resp.status_code == 200, cal_resp.text
        events = cal_resp.json()
        assert len(events) >= 2

        fixed_ev = next((e for e in events if e["type"] == "FIXED_CLASS"), None)
        assert fixed_ev is not None
        assert fixed_ev["course_code"] == "CS500"
        assert fixed_ev["start_time"] == "08:00"
        assert fixed_ev["end_time"] == "10:00"

        study_ev = next((e for e in events if e["type"] == "STUDENT_STUDY"), None)
        assert study_ev is not None
        assert study_ev["title"] == "Ôn tập Algorithms Buổi Tối"
        assert study_ev["start_time"] == "19:00"
        assert study_ev["end_time"] == "20:30"
