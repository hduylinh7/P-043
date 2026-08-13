from __future__ import annotations

from typing import Annotated, TypedDict

from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class AgentState(TypedDict, total=False):
    """State schema for LangGraph RAG Agent.

    Uses add_messages reducer to handle conversational chat history seamlessly.
    """

    messages: Annotated[list[BaseMessage], add_messages]
    query: str
    session_id: str
    course_id: str | None
    material_id: str | None
    user_id: str
    recent_messages: list[BaseMessage]
    retrieved_docs: list[dict]
    context_text: str
    citations: list[dict]
    analysis: str
    response: str
    error: str | None
    metadata: dict

