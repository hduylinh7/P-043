from fastapi import APIRouter

from src.services.redis_service import get_redis

router = APIRouter(tags=["System"])


@router.get("/status")
async def agent_status():
    """Check agent and service readiness."""
    redis_client = await get_redis()
    redis_online = False
    if redis_client:
        try:
            redis_online = await redis_client.ping()
        except Exception:
            redis_online = False

    return {
        "status": "ready",
        "agent": "LangGraph Agent + OpenAI gpt-4o-mini",
        "redis_connected": redis_online,
    }
