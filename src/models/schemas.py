from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="User query message")
    session_id: str | None = Field(default=None, description="Optional existing chat session ID")
    course_id: str | None = Field(default=None, description="Optional course ID context")
    user_id: str = Field(default="default_user", description="User identifier")


class ChatResponse(BaseModel):
    session_id: str = Field(..., description="Chat session ID")
    response: str = Field(..., description="Agent AI response")
    analysis: str = Field(default="", description="Internal analysis trace")
    citations: list[dict] = Field(default_factory=list, description="Retrieved chunk citations")
    sources: list[str] = Field(default_factory=list, description="Source filenames used")



class SessionCreate(BaseModel):
    user_id: str = Field(default="default_user", description="User identifier")
    title: str = Field(default="New Chat", description="Session title")


class SessionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime
