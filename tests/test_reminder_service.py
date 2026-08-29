from datetime import datetime, timedelta, timezone
import pytest
from sqlalchemy import select

from src.db.models.identity.user import User
from src.db.models.learning.assignment import Assignment
from src.db.models.learning.course import Course
from src.db.models.learning.course_schedule import CourseSchedule
from src.db.models.learning.enrollment import Enrollment
from src.db.models.learning.submission import Submission
from src.db.models.planning.notification import Notification
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal
from src.services.reminder_service import ReminderService


@pytest.mark.asyncio
async def test_fixed_class_reminder(prepare_database):
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as db:
        now = datetime.now(timezone.utc)
        today_name = now.strftime("%A")

        # 1. Create student
        student = User(id="student_1", email="student1@test.com", full_name="Student One")
        db.add(student)

        # 2. Create Course (active)
        course = Course(
            id="course_1",
            code="CS101",
            name="Intro to CS",
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
        )
        db.add(course)

        # 3. Create CourseSchedule 10 minutes from now
        class_time_str = (now + timedelta(minutes=10)).strftime("%H:%M")
        schedule = CourseSchedule(
            id="sched_1",
            course_id="course_1",
            day_of_week=today_name,
            start_time=class_time_str,
            end_time="23:59",
        )
        db.add(schedule)

        # 4. Enroll student
        enrollment = Enrollment(id="e1", user_id="student_1", course_id="course_1", role="student", status="active")
        db.add(enrollment)
        await db.commit()

        # Run check
        await ReminderService.check_fixed_class_reminders(db)

        # Verify notification created
        res = await db.execute(select(Notification).where(Notification.student_id == "student_1"))
        notifs = res.scalars().all()
        assert len(notifs) == 1
        assert notifs[0].notification_type == "FIXED_CLASS"
        assert notifs[0].payload["title"] == "Sắp đến giờ học"
        assert notifs[0].payload["link"] == "/courses/course_1"

        # Run check again -> Deduplication check
        await ReminderService.check_fixed_class_reminders(db)
        res_after = await db.execute(select(Notification).where(Notification.student_id == "student_1"))
        assert len(res_after.scalars().all()) == 1


@pytest.mark.asyncio
async def test_study_session_reminders(prepare_database):
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as db:
        now = datetime.now(timezone.utc)

        # Create student and weekly goal
        student = User(id="student_2", email="student2@test.com", full_name="Student Two")
        db.add(student)
        goal = WeeklyGoal(id="goal_1", student_id="student_2", title="Week 1 Goal", week_start_date=now)
        db.add(goal)

        # Create AI Study Session Task starting in 10 minutes
        session_time_str = (now + timedelta(minutes=10)).strftime("%H:%M")
        ai_task = Task(
            id="task_ai",
            weekly_goal_id="goal_1",
            title="Machine Learning AI Session",
            scheduled_date=now,
            start_time=session_time_str,
            source_type="AI",
            status="todo",
        )
        # Create Student Study Session Task starting in 10 minutes
        student_task = Task(
            id="task_student",
            weekly_goal_id="goal_1",
            title="Python Self Study",
            scheduled_date=now,
            start_time=session_time_str,
            source_type="MANUAL",
            status="todo",
        )
        db.add_all([ai_task, student_task])
        await db.commit()

        # Run check
        await ReminderService.check_study_session_reminders(db)

        res = await db.execute(select(Notification).where(Notification.student_id == "student_2"))
        notifs = res.scalars().all()
        assert len(notifs) == 2

        types = {n.notification_type for n in notifs}
        assert "AI_STUDY_SESSION" in types
        assert "STUDENT_STUDY_SESSION" in types


@pytest.mark.asyncio
async def test_assignment_deadline_reminder(prepare_database):
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as db:
        now = datetime.now(timezone.utc)

        student1 = User(id="student_sub", email="sub@test.com", full_name="Submitted Student")
        student2 = User(id="student_unsub", email="unsub@test.com", full_name="Unsubmitted Student")
        db.add_all([student1, student2])

        course = Course(id="c2", code="CS202", name="Data Structures", start_date=now - timedelta(days=5), end_date=now + timedelta(days=30))
        db.add(course)

        # Assignment due in 23.8 hours (1_DAY milestone)
        assignment = Assignment(id="asg_1", course_id="c2", title="Homework 1", due_at=now + timedelta(hours=23, minutes=50))
        db.add(assignment)

        # Enrollments
        db.add(Enrollment(id="e_sub", user_id="student_sub", course_id="c2", role="student", status="active"))
        db.add(Enrollment(id="e_unsub", user_id="student_unsub", course_id="c2", role="student", status="active"))

        # student_sub has submitted
        submission = Submission(id="sub_1", assignment_id="asg_1", student_id="student_sub", submitted_at=now, status="submitted")
        db.add(submission)
        await db.commit()

        # Run check
        await ReminderService.check_assignment_deadline_reminders(db)

        # student_sub should get 0 reminders
        res_sub = await db.execute(select(Notification).where(Notification.student_id == "student_sub"))
        assert len(res_sub.scalars().all()) == 0

        # student_unsub should get 1_DAY reminder
        res_unsub = await db.execute(select(Notification).where(Notification.student_id == "student_unsub"))
        notifs = res_unsub.scalars().all()
        assert len(notifs) == 1
        assert notifs[0].notification_type == "ASSIGNMENT_DEADLINE"
        assert notifs[0].payload["milestone"] == "1_DAY"
        assert notifs[0].payload["link"] == "/assignments/asg_1"


@pytest.mark.asyncio
async def test_instructor_does_not_receive_reminders(prepare_database):
    from tests.conftest import TestSessionLocal

    async with TestSessionLocal() as db:
        now = datetime.now(timezone.utc)
        today_name = now.strftime("%A")

        # Create instructor user
        instructor = User(id="instructor_1", email="teacher@test.com", full_name="Teacher One")
        db.add(instructor)

        course = Course(
            id="c_inst",
            code="CS999",
            name="Advanced AI",
            start_date=now - timedelta(days=1),
            end_date=now + timedelta(days=30),
        )
        db.add(course)

        # Schedule starting in 10 minutes
        class_time_str = (now + timedelta(minutes=10)).strftime("%H:%M")
        schedule = CourseSchedule(
            id="sched_inst",
            course_id="c_inst",
            day_of_week=today_name,
            start_time=class_time_str,
            end_time="23:59",
        )
        db.add(schedule)

        # Assignment due in 23.8 hours
        assignment = Assignment(
            id="asg_inst",
            course_id="c_inst",
            title="Final Project",
            due_at=now + timedelta(hours=23, minutes=50),
        )
        db.add(assignment)

        # Instructor enrolled as 'instructor'
        enrollment = Enrollment(
            id="e_inst",
            user_id="instructor_1",
            course_id="c_inst",
            role="instructor",
            status="active",
        )
        db.add(enrollment)
        await db.commit()

        # Run checks
        await ReminderService.check_fixed_class_reminders(db)
        await ReminderService.check_assignment_deadline_reminders(db)

        # Verify instructor received NO notifications
        res = await db.execute(select(Notification).where(Notification.student_id == "instructor_1"))
        notifs = res.scalars().all()
        assert len(notifs) == 0

