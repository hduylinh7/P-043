from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.graph import agent
from src.api.auth import router as auth_router
from src.db.database import get_db
from src.models.schemas import (
    ChatRequest,
    ChatResponse,
    MessageResponse,
    SessionCreate,
    SessionResponse,
)
from src.services.db_service import (
    add_message,
    create_session,
    get_session,
    get_session_messages,
    list_sessions,
)
from src.services.redis_service import get_cache, get_redis, set_cache

router = APIRouter()
router.include_router(auth_router)


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    """Send a message to the AI agent and receive a response."""
    try:
        # 1. Resolve or create chat session
        session_id = request.session_id
        if not session_id:
            db_session = await create_session(db, user_id=request.user_id, title=request.message[:30])
            session_id = db_session.id
        else:
            db_session = await get_session(db, session_id)
            if not db_session:
                db_session = await create_session(db, user_id=request.user_id, title=request.message[:30])
                session_id = db_session.id

        # 2. Persist user message to DB
        await add_message(db, session_id=session_id, role="user", content=request.message)

        # 3. Check Redis Cache for exact query repeat within session
        cache_key = f"cache:chat:{session_id}:{hash(request.message)}"
        cached_response = await get_cache(cache_key)
        if cached_response:
            await add_message(db, session_id=session_id, role="assistant", content=cached_response)
            return ChatResponse(
                session_id=session_id,
                response=cached_response,
                analysis="Retrieved from Redis Cache",
            )

        # 4. Invoke LangGraph AI Agent
        result = await agent.ainvoke(
            {"query": request.message, "session_id": session_id, "user_id": request.user_id}
        )
        ai_response = result.get("response", "No response generated.")
        analysis = result.get("analysis", "")

        # 5. Persist assistant message to DB & set Redis cache
        await add_message(db, session_id=session_id, role="assistant", content=ai_response)
        await set_cache(cache_key, ai_response, expire_seconds=3600)

        return ChatResponse(
            session_id=session_id,
            response=ai_response,
            analysis=analysis,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sessions", response_model=SessionResponse)
async def create_new_session(
    payload: SessionCreate, db: AsyncSession = Depends(get_db)
):
    """Create a new chat session."""
    session = await create_session(db, user_id=payload.user_id, title=payload.title)
    return session


@router.get("/sessions", response_model=list[SessionResponse])
async def get_user_sessions(
    user_id: str = "default_user", db: AsyncSession = Depends(get_db)
):
    """List sessions for a user."""
    sessions = await list_sessions(db, user_id=user_id)
    return sessions


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def get_messages(session_id: str, db: AsyncSession = Depends(get_db)):
    """Get chat history for a session."""
    messages = await get_session_messages(db, session_id=session_id)
    return messages


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
