import asyncio
import logging
from typing import Optional

from src.services.reminder_service import ReminderService

logger = logging.getLogger(__name__)

_scheduler_task: Optional[asyncio.Task] = None
_stop_event: asyncio.Event = asyncio.Event()


async def _scheduler_loop(interval_seconds: int = 60) -> None:
    logger.info(f"[ReminderScheduler] Started reminder scheduler loop (interval: {interval_seconds}s)")
    while not _stop_event.is_set():
        try:
            logger.debug("[ReminderScheduler] Running scheduled reminder checks...")
            await ReminderService.run_all_reminder_checks()
        except asyncio.CancelledError:
            logger.info("[ReminderScheduler] Scheduler loop cancelled.")
            break
        except Exception as e:
            logger.error(f"[ReminderScheduler] Error running reminder checks: {e}", exc_info=True)

        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("[ReminderScheduler] Scheduler loop cancelled during sleep.")
            break


def start_reminder_scheduler(interval_seconds: int = 60) -> None:
    global _scheduler_task, _stop_event
    _stop_event.clear()
    if _scheduler_task is None or _scheduler_task.done():
        _scheduler_task = asyncio.create_task(_scheduler_loop(interval_seconds))
        logger.info("[ReminderScheduler] Background task created successfully.")


async def stop_reminder_scheduler() -> None:
    global _scheduler_task, _stop_event
    _stop_event.set()
    if _scheduler_task and not _scheduler_task.done():
        _scheduler_task.cancel()
        try:
            await _scheduler_task
        except asyncio.CancelledError:
            pass
        logger.info("[ReminderScheduler] Scheduler stopped.")
