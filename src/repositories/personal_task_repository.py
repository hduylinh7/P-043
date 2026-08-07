from datetime import datetime
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.planning.personal_task import PersonalTask


class PersonalTaskRepository:
    @staticmethod
    def parse_datetime(val: datetime | str | None) -> datetime | None:
        if val is None:
            return None
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            val_clean = val.rstrip("Z")
            try:
                return datetime.fromisoformat(val_clean)
            except ValueError:
                return None
        return None

    @classmethod
    async def create_task(
        cls,
        db: AsyncSession,
        student_id: str,
        title: str,
        description: str | None = None,
        category: str = "STUDY",
        priority: str = "MEDIUM",
        status: str = "NOT_STARTED",
        estimated_hours: float | None = None,
        due_date: datetime | str | None = None,
    ) -> PersonalTask:
        """Create a new personal task for a student."""
        due_dt = cls.parse_datetime(due_date)
        task = PersonalTask(
            student_id=student_id,
            title=title.strip(),
            description=description.strip() if description else None,
            category=category.strip().upper() if category else "STUDY",
            priority=priority.strip().upper() if priority else "MEDIUM",
            status=status.strip().upper() if status else "NOT_STARTED",
            estimated_hours=estimated_hours,
            due_at=due_dt,
        )
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def get_by_id(db: AsyncSession, task_id: str) -> PersonalTask | None:
        """Fetch a personal task by ID."""
        stmt = select(PersonalTask).where(PersonalTask.id == task_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_student_tasks(
        db: AsyncSession,
        student_id: str,
        status: str | None = None,
        priority: str | None = None,
        category: str | None = None,
        sort_by: str = "due_date",
    ) -> list[PersonalTask]:
        """Fetch student's personal tasks with optional filtering and sorting."""
        stmt = select(PersonalTask).where(PersonalTask.student_id == student_id)

        if status:
            stmt = stmt.where(PersonalTask.status == status.strip().upper())
        if priority:
            stmt = stmt.where(PersonalTask.priority == priority.strip().upper())
        if category:
            stmt = stmt.where(PersonalTask.category == category.strip().upper())

        # Sorting logic
        clean_sort = sort_by.strip().lower() if sort_by else "due_date"
        if clean_sort == "priority":
            priority_order = case(
                (PersonalTask.priority == "CRITICAL", 1),
                (PersonalTask.priority == "HIGH", 2),
                (PersonalTask.priority == "MEDIUM", 3),
                (PersonalTask.priority == "LOW", 4),
                else_=5,
            )
            stmt = stmt.order_by(priority_order.asc(), PersonalTask.due_at.asc().nulls_last())
        elif clean_sort in ("updated_at", "recently_updated"):
            stmt = stmt.order_by(PersonalTask.updated_at.desc())
        else:
            # Default: due_date asc (nulls last) then created_at desc
            stmt = stmt.order_by(PersonalTask.due_at.asc().nulls_last(), PersonalTask.created_at.desc())

        result = await db.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    async def update_task(
        cls,
        db: AsyncSession,
        task: PersonalTask,
        title: str | None = None,
        description: str | None = None,
        category: str | None = None,
        priority: str | None = None,
        status: str | None = None,
        estimated_hours: float | None = None,
        due_date: datetime | str | None = None,
    ) -> PersonalTask:
        """Update fields of a personal task."""
        if title is not None:
            task.title = title.strip()
        if description is not None:
            task.description = description.strip() if description else None
        if category is not None:
            task.category = category.strip().upper()
        if priority is not None:
            task.priority = priority.strip().upper()
        if status is not None:
            task.status = status.strip().upper()
        if estimated_hours is not None:
            task.estimated_hours = estimated_hours
        if due_date is not None:
            task.due_at = cls.parse_datetime(due_date)

        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def update_status(db: AsyncSession, task: PersonalTask, status: str) -> PersonalTask:
        """Update progress status of a task."""
        task.status = status.strip().upper()
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return task

    @staticmethod
    async def delete_task(db: AsyncSession, task: PersonalTask) -> None:
        """Delete a personal task."""
        await db.delete(task)
        await db.commit()
