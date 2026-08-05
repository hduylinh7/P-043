from fastapi import APIRouter

from src.routers.auth_router import router as auth_router
from src.routers.chat_router import router as chat_router
from src.routers.course_router import router as course_router
from src.routers.session_router import router as session_router
from src.routers.system_router import router as system_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(chat_router)
router.include_router(course_router)
router.include_router(session_router)
router.include_router(system_router)

__all__ = [
    "router",
    "auth_router",
    "chat_router",
    "course_router",
    "session_router",
    "system_router",
]

