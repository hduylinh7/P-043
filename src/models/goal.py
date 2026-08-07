from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

GoalCategoryType = Literal["LEARNING", "CAREER", "PERSONAL", "HEALTH", "OTHER"]
GoalPriorityType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
GoalStatusType = Literal["ACTIVE", "COMPLETED", "ARCHIVED"]


class GoalCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Goal title")
    description: str | None = Field(default=None, description="Goal description")
    category: GoalCategoryType = Field(default="LEARNING", description="Goal category")
    priority: GoalPriorityType = Field(default="MEDIUM", description="Goal priority level")
    target_date: datetime | str | None = Field(default=None, description="Target completion date")


class GoalUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    category: GoalCategoryType | None = None
    priority: GoalPriorityType | None = None
    status: GoalStatusType | None = None
    target_date: datetime | str | None = None


class GoalStatusUpdateRequest(BaseModel):
    status: GoalStatusType = Field(..., description="New goal status")


class GoalResponse(BaseModel):
    id: str
    student_id: str
    title: str
    description: str | None = None
    category: str = "LEARNING"
    priority: str = "MEDIUM"
    status: str = "ACTIVE"
    target_date: datetime | str | None = None
    created_at: datetime | str
    updated_at: datetime | str

    model_config = ConfigDict(from_attributes=True)
