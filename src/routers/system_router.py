from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from src.config import get_settings
from src.services.llm import groq_key_manager
from src.services.redis_service import get_redis

router = APIRouter(tags=["System"])


class SwitchKeyRequest(BaseModel):
    key_name: str | None = None


@router.get("/status")
async def agent_status():
    """Check agent and service readiness."""
    settings = get_settings()
    redis_client = await get_redis()
    redis_online = False
    if redis_client:
        try:
            redis_online = await redis_client.ping()
        except Exception:
            redis_online = False

    llm_info = await groq_key_manager.get_status_info()

    return {
        "status": "ready",
        "agent": f"LangGraph Agent + {settings.model_name}",
        "redis_connected": redis_online,
        "llm_provider": settings.llm_provider,
        "active_llm_key": llm_info.get("active_key_name"),
    }


@router.get("/system/llm-status")
async def get_llm_status():
    """Return detailed information about current LLM configuration, active key, and remaining quota/rate-limits."""
    return await groq_key_manager.get_status_info()


@router.post("/system/llm-rotate")
async def rotate_llm_key(req: SwitchKeyRequest | None = None):
    """Manually rotate or switch to a specific Groq API key (useful for testing failover)."""
    if req and req.key_name:
        result = groq_key_manager.switch_key_by_name(req.key_name)
        if not result:
            raise HTTPException(
                status_code=400,
                detail=f"Key '{req.key_name}' không tồn tại trong danh sách cấu hình.",
            )
        idx, name, _ = result
        return {
            "message": f"Đã chuyển sang key {name}",
            "active_key_name": name,
            "active_key_index": idx,
        }

    # Rotate to next key
    curr_idx, _, _ = groq_key_manager.get_current_key()
    new_idx, new_name, _ = groq_key_manager.rotate_key(curr_idx, error_reason="Manual rotation via API")
    return {
        "message": f"Đã xoay vòng sang key {new_name}",
        "active_key_name": new_name,
        "active_key_index": new_idx,
    }
