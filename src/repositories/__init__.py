"""Repositories package."""

from src.repositories.assignment_repository import AssignmentRepository
from src.repositories.chat_repository import ChatRepository
from src.repositories.course_repository import CourseRepository
from src.repositories.material_repository import MaterialRepository
from src.repositories.user_repository import UserRepository

__all__ = [
    "AssignmentRepository",
    "ChatRepository",
    "CourseRepository",
    "MaterialRepository",
    "UserRepository",
]


