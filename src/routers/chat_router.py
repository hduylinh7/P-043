from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.graph import agent
from src.db.database import get_db
from src.models.schemas import ChatRequest, ChatResponse
from src.services.db_service import add_message, create_session, get_session
from src.services.redis_service import get_cache, set_cache

router = APIRouter(tags=["Chat"])


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
