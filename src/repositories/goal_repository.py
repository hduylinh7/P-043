from datetime import datetime
from sqlalchemy import case, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.planning.goal import Goal


class GoalRepository:
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
    async def create_goal(
        cls,
        db: AsyncSession,
        student_id: str,
        title: str,
        description: str | None = None,
        category: str = "LEARNING",
        priority: str = "MEDIUM",
        status: str = "ACTIVE",
        target_date: datetime | str | None = None,
    ) -> Goal:
        """Create a new personal goal for a student."""
        target_dt = cls.parse_datetime(target_date)
        goal = Goal(
            student_id=student_id,
            title=title.strip(),
            description=description.strip() if description else None,
            category=category.strip().upper() if category else "LEARNING",
            priority=priority.strip().upper() if priority else "MEDIUM",
            status=status.strip().upper() if status else "ACTIVE",
            target_date=target_dt,
        )
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def get_by_id(db: AsyncSession, goal_id: str) -> Goal | None:
        """Fetch a goal by ID."""
        stmt = select(Goal).where(Goal.id == goal_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_student_goals(
        db: AsyncSession,
        student_id: str,
        status: str | None = None,
        priority: str | None = None,
        category: str | None = None,
        sort_by: str = "target_date",
    ) -> list[Goal]:
        """Fetch student's goals with optional filtering and sorting."""
        stmt = select(Goal).where(Goal.student_id == student_id)

        if status:
            stmt = stmt.where(Goal.status == status.strip().upper())
        if priority:
            stmt = stmt.where(Goal.priority == priority.strip().upper())
        if category:
            stmt = stmt.where(Goal.category == category.strip().upper())

        # Sorting logic
        clean_sort = sort_by.strip().lower() if sort_by else "target_date"
        if clean_sort == "priority":
            priority_order = case(
                (Goal.priority == "CRITICAL", 1),
                (Goal.priority == "HIGH", 2),
                (Goal.priority == "MEDIUM", 3),
                (Goal.priority == "LOW", 4),
                else_=5,
            )
            stmt = stmt.order_by(priority_order.asc(), Goal.target_date.asc().nulls_last())
        elif clean_sort in ("updated_at", "recently_updated"):
            stmt = stmt.order_by(Goal.updated_at.desc())
        else:
            # Default: target_date asc (nulls last) then created_at desc
            stmt = stmt.order_by(Goal.target_date.asc().nulls_last(), Goal.created_at.desc())

        result = await db.execute(stmt)
        return list(result.scalars().all())

    @classmethod
    async def update_goal(
        cls,
        db: AsyncSession,
        goal: Goal,
        title: str | None = None,
        description: str | None = None,
        category: str | None = None,
        priority: str | None = None,
        status: str | None = None,
        target_date: datetime | str | None = None,
    ) -> Goal:
        """Update fields of a goal."""
        if title is not None:
            goal.title = title.strip()
        if description is not None:
            goal.description = description.strip() if description else None
        if category is not None:
            goal.category = category.strip().upper()
        if priority is not None:
            goal.priority = priority.strip().upper()
        if status is not None:
            goal.status = status.strip().upper()
        if target_date is not None:
            goal.target_date = cls.parse_datetime(target_date)

        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def update_status(db: AsyncSession, goal: Goal, status: str) -> Goal:
        """Update progress status of a goal."""
        goal.status = status.strip().upper()
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
        return goal

    @staticmethod
    async def delete_goal(db: AsyncSession, goal: Goal) -> None:
        """Delete a goal."""
        await db.delete(goal)
        await db.commit()
