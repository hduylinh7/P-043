import asyncio
import sys
from datetime import datetime, timedelta, timezone

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy import select

from src.db.database import AsyncSessionLocal, init_db
from src.db.models.identity.user import User
from src.db.models.planning.weekly_goal import WeeklyGoal
from src.db.models.planning.task import Task
from src.db.models.planning.notification import Notification
from src.services.reminder_service import ReminderService


async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        # 1. Fetch any active user or default user
        stmt = select(User).limit(10)
        res = await db.execute(stmt)
        users = res.scalars().all()

        if not users:
            print("No users found in DB. Creating test student...")
            user = User(
                id="demo_user_1",
                email="student@vinuni.edu.vn",
                full_name="Sinh Viên Demo",
                is_active=True,
                is_verified=True,
            )
            db.add(user)
            await db.commit()
            users = [user]

        print(f"Found {len(users)} users in database:")
        for u in users:
            print(f" - User ID: {u.id} | Email: {u.email} | Name: {u.full_name}")

        now = datetime.now(timezone.utc)
        # Schedule session start 10 minutes from now
        start_time_dt = now + timedelta(minutes=10)
        start_time_str = start_time_dt.strftime("%H:%M")

        for user in users:
            # Check or create WeeklyGoal
            goal_stmt = select(WeeklyGoal).where(WeeklyGoal.student_id == user.id)
            goal_res = await db.execute(goal_stmt)
            weekly_goal = goal_res.scalars().first()

            if not weekly_goal:
                weekly_goal = WeeklyGoal(
                    student_id=user.id,
                    title="Kế hoạch học tập tuần này",
                    week_start_date=now,
                    generated_by_agent="AI_Planner_Agent",
                )
                db.add(weekly_goal)
                await db.flush()

            # Create AI Study Session Task
            ai_task = Task(
                weekly_goal_id=weekly_goal.id,
                title="Lập trình Python & Machine Learning",
                description="Phiên học tự động tạo bởi AI Planner Agent",
                scheduled_date=now,
                start_time=start_time_str,
                source_type="AI",
                status="todo",
                estimated_minutes=45,
            )
            db.add(ai_task)
            await db.commit()
            await db.refresh(ai_task)
            print(f"Created AI Study Session task ID: {ai_task.id} scheduled at {start_time_str} for user {user.full_name} ({user.id})")

        # 2. Run ReminderService check immediately to produce the notifications in DB
        print("Running ReminderService checks to generate notifications...")
        await ReminderService.run_all_reminder_checks()

        # 3. Print generated notifications
        notif_stmt = select(Notification).order_by(Notification.created_at.desc()).limit(10)
        notif_res = await db.execute(notif_stmt)
        notifs = notif_res.scalars().all()

        print(f"\nSuccessfully generated {len(notifs)} notifications in database:")
        for n in notifs:
            print(f" - [{n.notification_type}] Student: {n.student_id} | Title: {n.payload.get('title')} | Message: {n.payload.get('message')} | Link: {n.payload.get('link')}")

if __name__ == "__main__":
    asyncio.run(main())
