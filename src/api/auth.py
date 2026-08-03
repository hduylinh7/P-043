from src.routers.auth_router import *  # noqa: F401, F403
from src.routers.auth_router import get_current_user, router  # noqa: F401

__all__ = ["router", "get_current_user"]
