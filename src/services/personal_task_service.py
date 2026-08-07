from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth import UserResponse
from src.models.personal_task import (
    PersonalTaskCreateRequest,
    PersonalTaskResponse,
    PersonalTaskStatusUpdateRequest,
    PersonalTaskUpdateRequest,
)
from src.repositories.personal_task_repository import PersonalTaskRepository


class PersonalTaskService:
    @staticmethod
    def _ensure_student(current_user: UserResponse) -> None:
        """Enforce that only students can access Personal Tasks module."""
        if "student" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chức năng Nhiệm vụ cá nhân chỉ dành riêng cho Sinh viên.",
            )

    @staticmethod
    async def create_personal_task(
        db: AsyncSession,
        payload: PersonalTaskCreateRequest,
        current_user: UserResponse,
    ) -> PersonalTaskResponse:
        """Create a personal task for the current student."""
        PersonalTaskService._ensure_student(current_user)

        task = await PersonalTaskRepository.create_task(
            db=db,
            student_id=current_user.id,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            status=payload.status,
            estimated_hours=payload.estimated_hours,
            due_date=payload.due_date,
        )

        return PersonalTaskResponse(
            id=task.id,
            student_id=task.student_id,
            title=task.title,
            description=task.description,
            category=task.category,
            priority=task.priority,
            status=task.status,
            estimated_hours=task.estimated_hours,
            due_date=task.due_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    @staticmethod
    async def get_personal_tasks(
        db: AsyncSession,
        current_user: UserResponse,
        status_filter: str | None = None,
        priority_filter: str | None = None,
        category_filter: str | None = None,
        sort_by: str = "due_date",
    ) -> list[PersonalTaskResponse]:
        """Fetch current student's personal tasks with optional filtering and sorting."""
        PersonalTaskService._ensure_student(current_user)

        tasks = await PersonalTaskRepository.get_student_tasks(
            db=db,
            student_id=current_user.id,
            status=status_filter,
            priority=priority_filter,
            category=category_filter,
            sort_by=sort_by,
        )

        return [
            PersonalTaskResponse(
                id=t.id,
                student_id=t.student_id,
                title=t.title,
                description=t.description,
                category=t.category,
                priority=t.priority,
                status=t.status,
                estimated_hours=t.estimated_hours,
                due_date=t.due_at,
                created_at=t.created_at,
                updated_at=t.updated_at,
            )
            for t in tasks
        ]

    @staticmethod
    async def get_personal_task_detail(
        db: AsyncSession,
        task_id: str,
        current_user: UserResponse,
    ) -> PersonalTaskResponse:
        """Fetch detail of a single personal task owned by current student."""
        PersonalTaskService._ensure_student(current_user)

        task = await PersonalTaskRepository.get_by_id(db, task_id)
        if not task or task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy nhiệm vụ cá nhân.",
            )

        return PersonalTaskResponse(
            id=task.id,
            student_id=task.student_id,
            title=task.title,
            description=task.description,
            category=task.category,
            priority=task.priority,
            status=task.status,
            estimated_hours=task.estimated_hours,
            due_date=task.due_at,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    @staticmethod
    async def update_personal_task(
        db: AsyncSession,
        task_id: str,
        payload: PersonalTaskUpdateRequest,
        current_user: UserResponse,
    ) -> PersonalTaskResponse:
        """Update a personal task owned by current student."""
        PersonalTaskService._ensure_student(current_user)

        task = await PersonalTaskRepository.get_by_id(db, task_id)
        if not task or task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy nhiệm vụ cá nhân.",
            )

        updated_task = await PersonalTaskRepository.update_task(
            db=db,
            task=task,
            title=payload.title,
            description=payload.description,
            category=payload.category,
            priority=payload.priority,
            status=payload.status,
            estimated_hours=payload.estimated_hours,
            due_date=payload.due_date,
        )

        return PersonalTaskResponse(
            id=updated_task.id,
            student_id=updated_task.student_id,
            title=updated_task.title,
            description=updated_task.description,
            category=updated_task.category,
            priority=updated_task.priority,
            status=updated_task.status,
            estimated_hours=updated_task.estimated_hours,
            due_date=updated_task.due_at,
            created_at=updated_task.created_at,
            updated_at=updated_task.updated_at,
        )

    @staticmethod
    async def update_personal_task_status(
        db: AsyncSession,
        task_id: str,
        payload: PersonalTaskStatusUpdateRequest,
        current_user: UserResponse,
    ) -> PersonalTaskResponse:
        """Update progress status of a personal task owned by current student."""
        PersonalTaskService._ensure_student(current_user)

        task = await PersonalTaskRepository.get_by_id(db, task_id)
        if not task or task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy nhiệm vụ cá nhân.",
            )

        updated_task = await PersonalTaskRepository.update_status(
            db=db,
            task=task,
            status=payload.status,
        )

        return PersonalTaskResponse(
            id=updated_task.id,
            student_id=updated_task.student_id,
            title=updated_task.title,
            description=updated_task.description,
            category=updated_task.category,
            priority=updated_task.priority,
            status=updated_task.status,
            estimated_hours=updated_task.estimated_hours,
            due_date=updated_task.due_at,
            created_at=updated_task.created_at,
            updated_at=updated_task.updated_at,
        )

    @staticmethod
    async def delete_personal_task(
        db: AsyncSession,
        task_id: str,
        current_user: UserResponse,
    ) -> dict:
        """Delete a personal task owned by current student."""
        PersonalTaskService._ensure_student(current_user)

        task = await PersonalTaskRepository.get_by_id(db, task_id)
        if not task or task.student_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy nhiệm vụ cá nhân.",
            )

        await PersonalTaskRepository.delete_task(db, task)
        return {"message": "Xóa nhiệm vụ cá nhân thành công."}
