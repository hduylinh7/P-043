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
from src.services.weekly_plan_service import pack_task_description
from src.services.reminder_service import ReminderService


async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        stmt = select(User)
        res = await db.execute(stmt)
        users = res.scalars().all()

        if not users:
            print("No users in DB. Creating demo user...")
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

        now = datetime.now(timezone.utc)
        monday = now - timedelta(days=now.weekday())
        week_start = monday.replace(hour=0, minute=0, second=0, microsecond=0)
        week_end = week_start + timedelta(days=6, hours=23, minutes=59, seconds=59)

        start_time_dt = now + timedelta(minutes=10)
        end_time_dt = now + timedelta(minutes=55)
        start_time_str = start_time_dt.strftime("%H:%M")
        end_time_str = end_time_dt.strftime("%H:%M")

        print(f"Creating AI Calendar Study Sessions for {len(users)} users (Scheduled time: {start_time_str} - {end_time_str}):")

        created_tasks = []
        for user in users:
            # Query existing active WeeklyGoal for current week
            goal_stmt = select(WeeklyGoal).where(WeeklyGoal.student_id == user.id)
            goal_res = await db.execute(goal_stmt)
            weekly_goal = goal_res.scalars().first()

            if not weekly_goal:
                weekly_goal = WeeklyGoal(
                    student_id=user.id,
                    title=f"Kế hoạch tuần {week_start.strftime('%d/%m')}",
                    week_start_date=week_start,
                    week_end_date=week_end,
                    status="ACTIVE",
                    generated_by_agent="AI_Planner_Agent",
                )
                db.add(weekly_goal)
                await db.flush()

            # Description JSON with full metadata
            packed_desc = pack_task_description(
                description="Phiên học tự động được lập bởi AI Planner Agent cho môn Machine Learning.",
                topic="Khái niệm Supervised Learning & Python Basics",
                what_to_study=["Khái niệm supervised learning", "Cú pháp Python cơ bản"],
                what_to_do=["Xem lại slide bài giảng", "Giải 3 bài tập thực hành"],
                reason="Chuẩn bị bài tập số 1 sắp đến hạn",
                course_name="Machine Learning",
            )

            # Create AI Task for Personal Calendar
            ai_task = Task(
                weekly_goal_id=weekly_goal.id,
                title="🤖 Phiên học AI: Lập trình Python & Machine Learning",
                description=packed_desc,
                scheduled_date=now,
                start_time=start_time_str,
                end_time=end_time_str,
                source_type="AI",
                status="todo",
                priority="high",
                estimated_minutes=45,
            )
            db.add(ai_task)
            await db.flush()
            created_tasks.append((user, ai_task))

        await db.commit()

        for u, t in created_tasks:
            print(f" [+] User: {u.full_name} ({u.email}) | Created Task ID: {t.id} | Title: {t.title}")

        # Run ReminderService check so that notification is also automatically created for these calendar tasks
        print("\nTriggering ReminderService.run_all_reminder_checks()...")
        await ReminderService.run_all_reminder_checks()

        # Print result notifications
        notif_stmt = select(Notification).order_by(Notification.created_at.desc()).limit(len(users))
        notif_res = await db.execute(notif_stmt)
        notifs = notif_res.scalars().all()
        print(f"\nCreated {len(notifs)} Notifications from Calendar AI Tasks:")
        for n in notifs:
            print(f" [🔔] Student: {n.student_id} | Type: {n.notification_type} | Title: {n.payload.get('title')} | Message: {n.payload.get('message')}")

if __name__ == "__main__":
    asyncio.run(main())
