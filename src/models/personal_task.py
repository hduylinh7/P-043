from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

CategoryType = Literal["STUDY", "CAREER", "PERSONAL", "HEALTH", "MEETING", "OTHER"]
PriorityType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
StatusType = Literal["NOT_STARTED", "IN_PROGRESS", "COMPLETED"]


class PersonalTaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: str | None = Field(default=None, description="Task description")
    category: CategoryType = Field(default="STUDY", description="Task category")
    priority: PriorityType = Field(default="MEDIUM", description="Task priority level")
    status: StatusType = Field(default="NOT_STARTED", description="Task progress status")
    estimated_hours: float | None = Field(default=None, ge=0, description="Estimated hours to complete")
    due_date: datetime | str | None = Field(default=None, description="Due date and time")


class PersonalTaskUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    category: CategoryType | None = None
    priority: PriorityType | None = None
    status: StatusType | None = None
    estimated_hours: float | None = Field(default=None, ge=0)
    due_date: datetime | str | None = None


class PersonalTaskStatusUpdateRequest(BaseModel):
    status: StatusType = Field(..., description="New task progress status")


class PersonalTaskResponse(BaseModel):
    id: str
    student_id: str
    title: str
    description: str | None = None
    category: str = "STUDY"
    priority: str = "MEDIUM"
    status: str = "NOT_STARTED"
    estimated_hours: float | None = None
    due_date: datetime | str | None = None
    created_at: datetime | str
    updated_at: datetime | str

    model_config = ConfigDict(from_attributes=True)
