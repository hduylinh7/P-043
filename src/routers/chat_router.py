import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_core.messages import AIMessage, HumanMessage
from sqlalchemy.ext.asyncio import AsyncSession

from src.agents.graph import agent
from src.config import get_settings
from src.db.database import get_db
from src.models.schemas import ChatRequest, ChatResponse
from src.services.db_service import (
    add_message,
    create_session,
    get_recent_messages,
    get_session,
)
from src.services.redis_service import get_cache, set_cache

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest, db: AsyncSession = Depends(get_db)
) -> ChatResponse:
    """Send a message to the RAG AI agent and receive a grounded response with citations."""
    try:
        settings = get_settings()

        # 1. Resolve or create chat session
        session_id = request.session_id
        course_id = request.course_id

        if not session_id:
            db_session = await create_session(
                db,
                user_id=request.user_id,
                course_id=course_id,
                title=request.message[:30],
            )
            session_id = db_session.id
        else:
            db_session = await get_session(db, session_id)
            if not db_session:
                db_session = await create_session(
                    db,
                    user_id=request.user_id,
                    course_id=course_id,
                    title=request.message[:30],
                )
                session_id = db_session.id
            elif course_id and not db_session.course_id:
                # Update course context if not previously set
                db_session.course_id = course_id
                await db.commit()

        # Effective course_id from session if not in request
        effective_course_id = course_id or getattr(db_session, "course_id", None)

        # 2. Fetch recent conversation history BEFORE adding current message
        recent_db_msgs = await get_recent_messages(
            db, session_id=session_id, limit=settings.chat_history_limit
        )

        history_langchain_msgs = []
        for msg in recent_db_msgs:
            if msg.role == "user":
                history_langchain_msgs.append(HumanMessage(content=msg.content))
            elif msg.role == "assistant":
                history_langchain_msgs.append(AIMessage(content=msg.content))

        # 3. Persist current user message to DB
        await add_message(db, session_id=session_id, role="user", content=request.message)

        # 4. Check Redis Cache for exact query repeat within session
        cache_key = f"cache:chat:{session_id}:{hash(request.message)}"
        cached_response = await get_cache(cache_key)
        if cached_response:
            await add_message(
                db,
                session_id=session_id,
                role="assistant",
                content=cached_response,
                metadata_json={"cached": True},
            )
            return ChatResponse(
                session_id=session_id,
                response=cached_response,
                analysis="Retrieved from Redis Cache",
            )

        # 5. Invoke LangGraph RAG AI Agent
        result = await agent.ainvoke({
            "query": request.message,
            "session_id": session_id,
            "course_id": effective_course_id,
            "user_id": request.user_id,
            "recent_messages": history_langchain_msgs,
        })

        ai_response = result.get("response", "No response generated.")
        analysis = result.get("analysis", "")
        citations = result.get("citations", [])
        sources = list({c.get("file_name") for c in citations if c.get("file_name")})

        # 6. Persist assistant response to DB & set Redis cache
        metadata_json = {
            "citations": citations,
            "sources": sources,
            "course_id": effective_course_id,
        }
        await add_message(
            db,
            session_id=session_id,
            role="assistant",
            content=ai_response,
            metadata_json=metadata_json,
        )
        await set_cache(cache_key, ai_response, expire_seconds=3600)

        return ChatResponse(
            session_id=session_id,
            response=ai_response,
            analysis=analysis,
            citations=citations,
            sources=sources,
        )
    except Exception as e:
        logger.error(f"Error handling chat request: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing the chat request: {e}",
        )


@router.post("/courses/{course_id}/chat", response_model=ChatResponse)
async def course_chat(
    course_id: str,
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """Course-scoped chat endpoint."""
    request.course_id = course_id
    return await chat(request=request, db=db)

