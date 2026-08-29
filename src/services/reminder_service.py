import logging
from datetime import datetime, time, timedelta, timezone
from typing import Any, List, Optional

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import AsyncSessionLocal
from src.db.models.learning.assignment import Assignment
from src.db.models.learning.course import Course
from src.db.models.learning.course_schedule import CourseSchedule
from src.db.models.learning.enrollment import Enrollment
from src.db.models.learning.submission import Submission
from src.db.models.planning.notification import Notification
from src.db.models.planning.task import Task
from src.db.models.planning.weekly_goal import WeeklyGoal

logger = logging.getLogger(__name__)


def make_aware(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class ReminderService:

    @classmethod
    async def run_all_reminder_checks(cls) -> None:
        """Entrypoint for running all reminder checks within a database session."""
        async with AsyncSessionLocal() as db:
            try:
                await cls.check_fixed_class_reminders(db)
            except Exception as e:
                logger.error(f"[ReminderService] Error checking fixed class reminders: {e}", exc_info=True)

            try:
                await cls.check_study_session_reminders(db)
            except Exception as e:
                logger.error(f"[ReminderService] Error checking study session reminders: {e}", exc_info=True)

            try:
                await cls.check_assignment_deadline_reminders(db)
            except Exception as e:
                logger.error(f"[ReminderService] Error checking assignment deadline reminders: {e}", exc_info=True)

    @classmethod
    async def _is_duplicate_notification(cls, db: AsyncSession, student_id: str, notification_type: str, dedup_key: str) -> bool:
        """Check database to see if notification with matching dedup_key has already been created."""
        stmt = select(Notification).where(
            and_(
                Notification.student_id == student_id,
                Notification.notification_type == notification_type,
            )
        )
        res = await db.execute(stmt)
        notifications = res.scalars().all()
        for notif in notifications:
            if notif.payload and isinstance(notif.payload, dict):
                if notif.payload.get("dedup_key") == dedup_key:
                    return True
        return False

    @classmethod
    async def check_fixed_class_reminders(cls, db: AsyncSession) -> None:
        """Send reminder 15 minutes before a fixed university class starts."""
        now = datetime.now(timezone.utc)
        today_str = now.strftime("%Y-%m-%d")
        day_of_week_name = now.strftime("%A")  # e.g., 'Monday'

        # Query active courses
        courses_stmt = select(Course).where(
            and_(
                Course.start_date <= now,
                Course.end_date >= now,
            )
        )
        res = await db.execute(courses_stmt)
        courses = res.scalars().all()

        for course in courses:
            # Query schedules for this course matching today's day of week
            sched_stmt = select(CourseSchedule).where(CourseSchedule.course_id == course.id)
            sched_res = await db.execute(sched_stmt)
            schedules = sched_res.scalars().all()

            for schedule in schedules:
                if schedule.day_of_week.strip().lower() != day_of_week_name.lower():
                    continue

                # Parse schedule start_time (format expected: "HH:MM" or "HH:MM:SS")
                try:
                    time_parts = [int(p) for p in schedule.start_time.split(":")[:2]]
                    class_start_time = time(hour=time_parts[0], minute=time_parts[1])
                except Exception as parse_err:
                    logger.warning(f"Could not parse class start_time '{schedule.start_time}' for schedule {schedule.id}: {parse_err}")
                    continue

                class_start_dt = datetime.combine(now.date(), class_start_time).replace(tzinfo=timezone.utc)
                diff_seconds = (class_start_dt - now).total_seconds()

                # Check if class starts within 15 minutes (0 <= diff <= 900 seconds)
                if 0 <= diff_seconds <= 900:
                    # Fetch active enrolled students
                    enroll_stmt = select(Enrollment).where(
                        and_(
                            Enrollment.course_id == course.id,
                            Enrollment.status == "active",
                        )
                    )
                    enroll_res = await db.execute(enroll_stmt)
                    enrollments = enroll_res.scalars().all()

                    for enrollment in enrollments:
                        student_id = enrollment.user_id
                        dedup_key = f"{student_id}:FIXED_CLASS:{schedule.id}:{today_str}:15_MINUTES"
                        if await cls._is_duplicate_notification(db, student_id, "FIXED_CLASS", dedup_key):
                            continue

                        title = "Sắp đến giờ học"
                        message = f"{course.name} của bạn sẽ bắt đầu sau 15 phút."
                        link = f"/courses/{course.id}"

                        notif = Notification(
                            student_id=student_id,
                            notification_type="FIXED_CLASS",
                            scheduled_at=class_start_dt,
                            is_sent=True,
                            sent_at=now,
                            payload={
                                "title": title,
                                "message": message,
                                "link": link,
                                "dedup_key": dedup_key,
                                "entity_type": "FIXED_CLASS",
                                "entity_id": schedule.id,
                                "course_id": course.id,
                                "milestone": "15_MINUTES",
                                "is_read": False,
                            },
                        )
                        db.add(notif)
                        logger.info(f"[ReminderService] Created Fixed Class reminder for student {student_id}, course {course.id}")

        await db.commit()

    @classmethod
    async def check_study_session_reminders(cls, db: AsyncSession) -> None:
        """Send reminder 15 minutes before AI or Student-created Study Session starts."""
        now = datetime.now(timezone.utc)

        # Query active tasks with scheduled_date
        stmt = select(Task, WeeklyGoal).join(WeeklyGoal, Task.weekly_goal_id == WeeklyGoal.id).where(
            and_(
                Task.status.notin_(["completed", "skipped"]),
                Task.scheduled_date.isnot(None),
            )
        )
        res = await db.execute(stmt)
        rows = res.all()

        for task, weekly_goal in rows:
            scheduled_dt = make_aware(task.scheduled_date)
            if not scheduled_dt:
                continue

            # If task has start_time "HH:MM", combine with scheduled_date date (converting to local date UTC+7 if needed)
            if task.start_time:
                try:
                    t_parts = [int(p) for p in task.start_time.split(":")[:2]]
                    task_time = time(hour=t_parts[0], minute=t_parts[1])
                    # If scheduled_dt is in UTC and corresponds to 00:00 UTC+7 (17:00 prev day UTC), adjust to local date
                    local_dt = scheduled_dt + timedelta(hours=7) if scheduled_dt.tzinfo else scheduled_dt
                    session_start_local = datetime.combine(local_dt.date(), task_time)
                    # Convert local time (UTC+7) back to UTC for comparison with now (UTC)
                    session_start_dt = session_start_local.replace(tzinfo=timezone.utc) - timedelta(hours=7)
                except Exception:
                    session_start_dt = scheduled_dt
            else:
                session_start_dt = scheduled_dt

            diff_seconds = (session_start_dt - now).total_seconds()
            if 0 <= diff_seconds <= 900:
                student_id = weekly_goal.student_id
                if task.source_type and task.source_type.upper() == "MANUAL":
                    is_ai = False
                elif task.source_type and task.source_type.upper() in ["AI", "PLANNER", "AI_PLANNER", "AI_PLAN"]:
                    is_ai = True
                else:
                    is_ai = bool(weekly_goal.generated_by_agent)
                entity_type = "AI_STUDY_SESSION" if is_ai else "STUDENT_STUDY_SESSION"
                notif_type_db = "AI_STUDY_SESSION" if is_ai else "STUDENT_SESSION"
                title = "Study Session sắp bắt đầu" if is_ai else "Nhiệm vụ cá nhân sắp bắt đầu"
                message = (
                    f"Phiên học {task.title} của bạn sẽ bắt đầu sau 15 phút."
                    if is_ai
                    else f"{task.title} của bạn sẽ bắt đầu sau 15 phút."
                )
                link = f"/study-session/{task.id}" if is_ai else f"/calendar?task_id={task.id}"
                dedup_key = f"{student_id}:{entity_type}:{task.id}:15_MINUTES"

                if await cls._is_duplicate_notification(db, student_id, notif_type_db, dedup_key):
                    continue

                notif = Notification(
                    student_id=student_id,
                    task_id=task.id,
                    notification_type=notif_type_db,
                    scheduled_at=session_start_dt,
                    is_sent=True,
                    sent_at=now,
                    payload={
                        "title": title,
                        "message": message,
                        "link": link,
                        "dedup_key": dedup_key,
                        "entity_type": entity_type,
                        "entity_id": task.id,
                        "milestone": "15_MINUTES",
                        "is_read": False,
                    },
                )
                db.add(notif)
                logger.info(f"[ReminderService] Created {entity_type} reminder for student {student_id}, task {task.id}")

        await db.commit()

    @classmethod
    async def check_assignment_deadline_reminders(cls, db: AsyncSession) -> None:
        """Send reminder 1 day and 1 hour before Assignment deadline (if unsubmitted)."""
        now = datetime.now(timezone.utc)

        # Query assignments with due_at in the future
        stmt = select(Assignment).where(
            and_(
                Assignment.due_at.isnot(None),
                Assignment.due_at > now,
            )
        )
        res = await db.execute(stmt)
        assignments = res.scalars().all()

        for assignment in assignments:
            due_at = make_aware(assignment.due_at)
            if not due_at:
                continue

            diff_seconds = (due_at - now).total_seconds()
            milestone: Optional[str] = None
            message: Optional[str] = None

            # 1 day before (between 23h and 24h + 15m)
            if 23 * 3600 <= diff_seconds <= (24 * 3600 + 900):
                milestone = "1_DAY"
                message = f"{assignment.title} sẽ đến hạn trong 1 ngày."
            # 1 hour before (between 0 and 1h + 5m)
            elif 0 <= diff_seconds <= (3600 + 300):
                milestone = "1_HOUR"
                message = f"{assignment.title} sẽ đến hạn trong 1 giờ."

            if not milestone or not message:
                continue

            # Fetch enrolled students
            enroll_stmt = select(Enrollment).where(
                and_(
                    Enrollment.course_id == assignment.course_id,
                    Enrollment.status == "active",
                )
            )
            enroll_res = await db.execute(enroll_stmt)
            enrollments = enroll_res.scalars().all()

            for enrollment in enrollments:
                student_id = enrollment.user_id

                # Check if student has submitted
                sub_stmt = select(Submission).where(
                    and_(
                        Submission.assignment_id == assignment.id,
                        Submission.student_id == student_id,
                        or_(
                            Submission.submitted_at.isnot(None),
                            Submission.status.in_(["submitted", "graded", "SUBMITTED", "GRADED"]),
                        ),
                    )
                )
                sub_res = await db.execute(sub_stmt)
                has_submitted = sub_res.scalars().first() is not None
                if has_submitted:
                    continue

                dedup_key = f"{student_id}:ASSIGNMENT_DEADLINE:{assignment.id}:{milestone}"
                if await cls._is_duplicate_notification(db, student_id, "ASSIGNMENT_DUE", dedup_key):
                    continue

                title = "Assignment sắp đến hạn"
                link = f"/assignments/{assignment.id}"

                notif = Notification(
                    student_id=student_id,
                    notification_type="ASSIGNMENT_DUE",
                    scheduled_at=now,
                    is_sent=True,
                    sent_at=now,
                    payload={
                        "title": title,
                        "message": message,
                        "link": link,
                        "dedup_key": dedup_key,
                        "entity_type": "ASSIGNMENT_DEADLINE",
                        "entity_id": assignment.id,
                        "milestone": milestone,
                        "is_read": False,
                    },
                )
                db.add(notif)
                logger.info(f"[ReminderService] Created Assignment Deadline ({milestone}) reminder for student {student_id}, assignment {assignment.id}")

        await db.commit()
