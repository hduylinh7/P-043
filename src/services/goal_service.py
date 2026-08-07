from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth import UserResponse
from src.models.goal import (
    GoalCreateRequest,
    GoalResponse,
    GoalStatusUpdateRequest,
    GoalUpdateRequest,
)
from src.repositories.goal_repository import GoalRepository


class GoalService:
    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        """Enforce that only students can access Goal Management module."""
        if "student" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chức năng Quản lý Mục tiêu chỉ dành riêng cho Sinh viên.",
            )

    @staticmethod
    async def create_goal(
        db: AsyncSession,
        payload: GoalCreateRequest,
        current_user: UserResponse,
    ) -> GoalResponse:
        """Create a goal for the current student."""
        GoalService._ensure_student(current_user)

        goal = await GoalRepository.create_goal(
            db=db,
            student_id=current_user.id,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            target_date=payload.target_date,
        )

        return GoalResponse(
            id=goal.id,
            student_id=goal.student_id,
            title=goal.title,
            description=goal.description,
            category=goal.category,
            priority=goal.priority,
            status=goal.status,
            target_date=goal.target_date,
            created_at=goal.created_at,
            updated_at=goal.updated_at,
        )

    @staticmethod
    async def get_goals(
        db: AsyncSession,
        current_user: UserResponse,
        status_filter: str | None = None,
        priority_filter: str | None = None,
        category_filter: str | None = None,
        sort_by: str = "target_date",
    ) -> list[GoalResponse]:
        """Fetch current student's goals with optional filtering and sorting."""
        GoalService._ensure_student(current_user)

        goals = await GoalRepository.get_student_goals(
            db=db,
            student_id=current_user.id,
            status=status_filter,
            priority=priority_filter,
            category=category_filter,
            sort_by=sort_by,
        )

        return [
            GoalResponse(
                id=g.id,
                student_id=g.student_id,
                title=g.title,
                description=g.description,
                category=g.category,
                priority=g.priority,
                status=g.status,
                target_date=g.target_date,
                created_at=g.created_at,
                updated_at=g.updated_at,
            )
            for g in goals
        ]

    @staticmethod
    async def get_goal_detail(
        db: AsyncSession,
        goal_id: str,
        current_user: UserResponse,
    ) -> GoalResponse:
        """Fetch detail of a single goal owned by current student."""
        GoalService._ensure_student(current_user)

        goal = await GoalRepository.get_by_id(db, goal_id)
        if not goal or goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục tiêu.",
            )

        return GoalResponse(
            id=goal.id,
            student_id=goal.student_id,
            title=goal.title,
            description=goal.description,
            category=goal.category,
            priority=goal.priority,
            status=goal.status,
            target_date=goal.target_date,
            created_at=goal.created_at,
            updated_at=goal.updated_at,
        )

    @staticmethod
    async def update_goal(
        db: AsyncSession,
        goal_id: str,
        payload: GoalUpdateRequest,
        current_user: UserResponse,
    ) -> GoalResponse:
        """Update a goal owned by current student."""
        GoalService._ensure_student(current_user)

        goal = await GoalRepository.get_by_id(db, goal_id)
        if not goal or goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục tiêu.",
            )

        updated_goal = await GoalRepository.update_goal(
            db=db,
            goal=goal,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            status=payload.status,
            target_date=payload.target_date,
        )

        return GoalResponse(
            id=updated_goal.id,
            student_id=updated_goal.student_id,
            title=updated_goal.title,
            description=updated_goal.description,
            category=updated_goal.category,
            priority=updated_goal.priority,
            status=updated_goal.status,
            target_date=updated_goal.target_date,
            created_at=updated_goal.created_at,
            updated_at=updated_goal.updated_at,
        )

    @staticmethod
    async def update_goal_status(
        db: AsyncSession,
        goal_id: str,
        payload: GoalStatusUpdateRequest,
        current_user: UserResponse,
    ) -> GoalResponse:
        """Update status of a goal owned by current student."""
        GoalService._ensure_student(current_user)

        goal = await GoalRepository.get_by_id(db, goal_id)
        if not goal or goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục tiêu.",
            )

        updated_goal = await GoalRepository.update_status(
            db=db,
            goal=goal,
            status=payload.status,
        )

        return GoalResponse(
            id=updated_goal.id,
            student_id=updated_goal.student_id,
            title=updated_goal.title,
            description=updated_goal.description,
            category=updated_goal.category,
            priority=updated_goal.priority,
            status=updated_goal.status,
            target_date=updated_goal.target_date,
            created_at=updated_goal.created_at,
            updated_at=updated_goal.updated_at,
        )

    @staticmethod
    async def delete_goal(
        db: AsyncSession,
        goal_id: str,
        current_user: UserResponse,
    ) -> dict:
        """Delete a goal owned by current student."""
        GoalService._ensure_student(current_user)

        goal = await GoalRepository.get_by_id(db, goal_id)
        if not goal or goal.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục tiêu.",
            )

        await GoalRepository.delete_goal(db, goal)
        return {"message": "Xóa mục tiêu thành công."}
