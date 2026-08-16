from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient

from src.db.models import User
from src.repositories.user_repository import UserRepository
from src.main import app
from src.core.security import create_access_token
from tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_auto_course_schedule_allocation():
    """
    Test automatic allocation of conflict-free course schedules upon course creation and update.
    """
    async with TestSessionLocal() as db:
        # Create Instructor User
        instructor = User(
            id="prof_auto_sched_1",
            email="prof_auto@vinuni.edu.vn",
            full_name="Prof. Alan Turing",
            is_verified=True,
        )
        db.add(instructor)
        await db.commit()

        await UserRepository.assign_role(db, instructor.id, "instructor")

    token = create_access_token(
        {"sub": "prof_auto_sched_1", "email": "prof_auto@vinuni.edu.vn", "roles": ["instructor"]}
    )
    headers = {"Authorization": f"Bearer {token}"}

    now = datetime.now(timezone.utc)
    start_str = (now + timedelta(days=1)).strftime("%Y-%m-%dT00:00:00Z")
    end_str = (now + timedelta(days=90)).strftime("%Y-%m-%dT00:00:00Z")

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        # 1. Create First Course (COMP101, 3 credits) without specifying schedules or room
        c1_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Introduction to Computer Science",
                "code": "COMP101",
                "credits": 3,
                "start_date": start_str,
                "end_date": end_str,
                "term": "Fall 2026",
            },
            headers=headers,
        )
        assert c1_resp.status_code == 201, c1_resp.text
        c1_data = c1_resp.json()
        assert len(c1_data["schedules"]) == 2
        scheds_c1 = c1_data["schedules"]
        # Standard 3 credit allocation: Mon & Wed 08:00 - 10:00
        days_c1 = [s["day_of_week"] for s in scheds_c1]
        assert days_c1 == ["Monday", "Wednesday"]
        assert scheds_c1[0]["start_time"] == "08:00"
        assert scheds_c1[0]["end_time"] == "09:45"

        # 2. Create Second Course (COMP202, 3 credits) with same active date range
        c2_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Data Structures & Algorithms",
                "code": "COMP202",
                "credits": 3,
                "start_date": start_str,
                "end_date": end_str,
                "term": "Fall 2026",
            },
            headers=headers,
        )
        assert c2_resp.status_code == 201, c2_resp.text
        c2_data = c2_resp.json()
        assert len(c2_data["schedules"]) == 2
        scheds_c2 = c2_data["schedules"]
        days_c2 = [s["day_of_week"] for s in scheds_c2]
        # Should automatically select next conflict-free slot: Mon & Wed 10:00 - 12:00
        assert days_c2 == ["Monday", "Wednesday"]
        assert scheds_c2[0]["start_time"] == "10:00"
        assert scheds_c2[0]["end_time"] == "11:45"

        # 3. Update Course 1 credits from 3 to 1 -> Should auto-allocate 1 session
        up_resp = await client.put(
            f"/api/v1/courses/{c1_data['id']}",
            json={
                "credits": 1,
            },
            headers=headers,
        )
        assert up_resp.status_code == 200, up_resp.text
        up_data = up_resp.json()
        assert len(up_data["schedules"]) == 1

        # 4. Create Intensive Short Course (COMP303, 3 credits in 28 days / 4 weeks duration)
        short_start = (now + timedelta(days=100)).strftime("%Y-%m-%dT00:00:00Z")
        short_end = (now + timedelta(days=128)).strftime("%Y-%m-%dT00:00:00Z")
        c3_resp = await client.post(
            "/api/v1/courses",
            json={
                "name": "Intensive Machine Learning Bootcamp",
                "code": "COMP303",
                "credits": 3,
                "start_date": short_start,
                "end_date": short_end,
                "term": "Fall 2026",
            },
            headers=headers,
        )
        assert c3_resp.status_code == 201, c3_resp.text
        c3_data = c3_resp.json()
        # 3 credits over 4 weeks requires ~11.25 hours/week -> 4 sessions per week!
        assert len(c3_data["schedules"]) == 4
