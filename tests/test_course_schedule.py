from datetime import datetime, timedelta, timezone
import pytest
from httpx import ASGITransport, AsyncClient

from src.db.models import Course, CourseSchedule, Enrollment, User
from src.db.enums import EnrollmentRoleEnum
from src.main import app
from src.core.security import create_access_token
from tests.conftest import TestSessionLocal


@pytest.mark.asyncio
async def test_course_schedule_and_conflict_flow():
    """Test Course schedule creation, validation, timetable retrieval, and schedule conflict detection."""
    async with TestSessionLocal() as db:
        # 1. Create Instructor User
        instructor = User(
            id="inst_user_1",
            email="instructor@vinuni.edu.vn",
            full_name="Dr. Alan Turing",
            is_verified=True,
        )
        db.add(instructor)

        # 2. Create Student User (matching default test override id test_user_1)
        student = User(
            id="test_user_1",
            email="test@example.com",
            full_name="Test User",
            is_verified=True,
        )
        db.add(student)

        # Create Course 1: Machine Learning with Monday & Wednesday 08:00 - 10:00 schedule
        now = datetime.now(timezone.utc)
        c1 = Course(
            id="course_ml_101",
            code="CS301",
            name="Machine Learning",
            credits=3,
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=90),
            instructor_id=instructor.id,
        )
        db.add(c1)

        s1 = CourseSchedule(
            id="sched_ml_1",
            course_id=c1.id,
            day_of_week="Monday",
            start_time="08:00",
            end_time="10:00",
            room="Room A1-301",
        )
        s2 = CourseSchedule(
            id="sched_ml_2",
            course_id=c1.id,
            day_of_week="Wednesday",
            start_time="08:00",
            end_time="10:00",
            room="Room A1-301",
        )
        db.add_all([s1, s2])

        # Create Course 2: Deep Learning with Monday 09:00 - 11:00 schedule (OVERLAPS with Machine Learning on Mon 09:00-10:00)
        c2 = Course(
            id="course_dl_202",
            code="CS401",
            name="Deep Learning",
            credits=4,
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=90),
            instructor_id=instructor.id,
        )
        db.add(c2)

        s3 = CourseSchedule(
            id="sched_dl_1",
            course_id=c2.id,
            day_of_week="Monday",
            start_time="09:00",
            end_time="11:00",
            room="Room B2-102",
        )
        db.add(s3)

        # Create Course 3: Database Systems with Tuesday 13:00 - 15:00 schedule (NO CONFLICT)
        c3 = Course(
            id="course_db_303",
            code="CS202",
            name="Database Systems",
            credits=3,
            start_date=now - timedelta(days=5),
            end_date=now + timedelta(days=90),
            instructor_id=instructor.id,
        )
        db.add(c3)

        s4 = CourseSchedule(
            id="sched_db_1",
            course_id=c3.id,
            day_of_week="Tuesday",
            start_time="13:00",
            end_time="15:00",
            room="Room C3-201",
        )
        db.add(s4)

        await db.commit()

        # Enroll student in Machine Learning
        enrollment_1 = Enrollment(
            user_id=student.id,
            course_id=c1.id,
            role=EnrollmentRoleEnum.STUDENT,
            status="active",
        )
        db.add(enrollment_1)
        await db.commit()

    # Setup HTTP AsyncClient for API testing
    token = create_access_token({"sub": "test_user_1", "email": "test@example.com", "roles": ["student"]})
    headers = {"Authorization": f"Bearer {token}"}

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as client:
        # 1. Fetch Student Timetable -> Should contain Machine Learning 2 schedule entries
        resp = await client.get("/api/v1/courses/student/timetable", headers=headers)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert len(data) == 2
        days = [entry["day_of_week"] for entry in data]
        assert "Monday" in days and "Wednesday" in days

        # 2. Attempt to Join Conflicting Course (Deep Learning Mon 09:00-11:00 vs Machine Learning Mon 08:00-10:00)
        conf_resp = await client.post("/api/v1/courses/course_dl_202/join", headers=headers)
        assert conf_resp.status_code == 409, conf_resp.text
        conf_data = conf_resp.json()["detail"]
        assert "conflict" in conf_data
        assert conf_data["conflict"]["conflicting_course_code"] == "CS301"
        assert conf_data["conflict"]["day_of_week"] == "Monday"
        assert conf_data["conflict"]["overlap_start_time"] == "09:00"
        assert conf_data["conflict"]["overlap_end_time"] == "10:00"

        # 3. Attempt to Join Non-Conflicting Course (Database Systems Tue 13:00-15:00) -> Should Succeed
        ok_resp = await client.post("/api/v1/courses/course_db_303/join", headers=headers)
        assert ok_resp.status_code == 200, ok_resp.text

        # 4. Fetch Student Timetable -> Now should contain 3 schedule entries (2 ML + 1 DB)
        t_resp = await client.get("/api/v1/courses/student/timetable", headers=headers)
        assert t_resp.status_code == 200
        assert len(t_resp.json()) == 3

        # 5. Student Drops Machine Learning Course
        leave_resp = await client.delete("/api/v1/courses/course_ml_101/leave", headers=headers)
        assert leave_resp.status_code == 200

        # 6. Fetch Student Timetable -> Now contains only Database Systems entry (1 entry)
        t2_resp = await client.get("/api/v1/courses/student/timetable", headers=headers)
        assert t2_resp.status_code == 200
        assert len(t2_resp.json()) == 1

        # 7. Now student should be able to join Deep Learning (Mon 09:00-11:00) without conflict
        retry_dl_resp = await client.post("/api/v1/courses/course_dl_202/join", headers=headers)
        assert retry_dl_resp.status_code == 200
