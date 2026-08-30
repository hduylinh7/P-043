import asyncio
import sys
from datetime import datetime, timezone

if sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8')

from sqlalchemy import select
from src.db.database import AsyncSessionLocal, init_db
from src.db.models.planning.task import Task
from src.db.models.planning.notification import Notification
from src.services.reminder_service import ReminderService


async def main():
    await init_db()
    async with AsyncSessionLocal() as db:
        task_id = "7126d498-3035-42e0-a131-2a6c84e23a21"
        stmt = select(Task).where(Task.id == task_id)
        res = await db.execute(stmt)
        task = res.scalars().first()

        if not task:
            print(f"Task with ID {task_id} not found in DB.")
            return

        print(f"Found Task ID: {task.id}")
        print(f" - Title: {task.title}")
        print(f" - Scheduled Date: {task.scheduled_date}")
        print(f" - Start Time: {task.start_time}")
        print(f" - Source Type: {task.source_type}")
        print(f" - Status: {task.status}")

        print("\nRunning ReminderService check...")
        await ReminderService.run_all_reminder_checks()

        notif_stmt = select(Notification).where(Notification.task_id == task_id)
        notif_res = await db.execute(notif_stmt)
        notif = notif_res.scalars().first()

        if notif:
            print(f"\n[YES] Notification HAS BEEN CREATED!")
            print(f" - Type: {notif.notification_type}")
            print(f" - Title: {notif.payload.get('title')}")
            print(f" - Message: {notif.payload.get('message')}")
            print(f" - Link: {notif.payload.get('link')}")
        else:
            print("\n[NO] Notification not found yet.")

if __name__ == "__main__":
    asyncio.run(main())
