from fastapi import APIRouter

from src.routers.assignment_router import router as assignment_router
from src.routers.auth_router import router as auth_router
from src.routers.chat_router import router as chat_router
from src.routers.course_router import router as course_router
from src.routers.personal_task_router import router as personal_task_router
from src.routers.session_router import router as session_router
from src.routers.system_router import router as system_router

router = APIRouter()

router.include_router(assignment_router)
router.include_router(auth_router)
router.include_router(chat_router)
router.include_router(course_router)
router.include_router(personal_task_router)
router.include_router(session_router)
router.include_router(system_router)

__all__ = [
    "router",
    "assignment_router",
    "auth_router",
    "chat_router",
    "course_router",
    "personal_task_router",
    "session_router",
    "system_router",
]
