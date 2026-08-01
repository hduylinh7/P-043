from __future__ import annotations

from typing import Annotated, TypedDict
from langgraph.graph.message import add_messages
from langchain_core.messages import BaseMessage


class AgentState(TypedDict, total=False):
    """State schema for LangGraph agent.

    Uses add_messages reducer to handle conversational chat history seamlessly.
    """

    messages: Annotated[list[BaseMessage], add_messages]
    query: str
    session_id: str
    user_id: str
    context: str
    analysis: str
    response: str
    error: str
    metadata: dict
