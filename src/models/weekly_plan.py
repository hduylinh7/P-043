from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

WeeklyPlanStatusType = Literal["DRAFT", "ACTIVE", "COMPLETED", "ARCHIVED"]
TaskSourceType = Literal["ASSIGNMENT", "PERSONAL_TASK", "GOAL", "MANUAL"]


class PlanTaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None)
    priority: str = Field(default="medium")
    status: str = Field(default="todo")
    scheduled_date: datetime | str | None = Field(default=None)
    start_time: str | None = Field(default=None, description="e.g. 19:00")
    end_time: str | None = Field(default=None, description="e.g. 21:00")
    estimated_duration: int | None = Field(default=None, description="Duration in minutes")
    source_type: str = Field(default="MANUAL")
    source_id: str | None = Field(default=None)
    assignment_id: str | None = Field(default=None)


class PlanTaskUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: str | None = None
    status: str | None = None
    scheduled_date: datetime | str | None = None
    start_time: str | None = None
    end_time: str | None = None
    estimated_duration: int | None = None
    source_type: str | None = None
    source_id: str | None = None
    assignment_id: str | None = None


class PlanTaskStatusUpdateRequest(BaseModel):
    status: str = Field(..., description="New task status: todo, in_progress, completed, skipped")


class PlanTaskResponse(BaseModel):
    id: str
    weekly_goal_id: str
    assignment_id: str | None = None
    title: str
    description: str | None = None
    priority: str = "medium"
    status: str = "todo"
    scheduled_date: datetime | str | None = None
    start_time: str | None = None
    end_time: str | None = None
    estimated_duration: int | None = None
    estimated_minutes: int | None = None
    source_type: str = "MANUAL"
    source_id: str | None = None
    created_at: datetime | str
    updated_at: datetime | str

    model_config = ConfigDict(from_attributes=True)


class WeeklyPlanCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = Field(default=None)
    week_start_date: datetime | str = Field(..., description="Start of weekly plan period")
    week_end_date: datetime | str | None = Field(default=None, description="End of weekly plan period")
    status: WeeklyPlanStatusType = Field(default="ACTIVE")


class WeeklyPlanUpdateRequest(BaseModel):
    title: str | None = None
    description: str | None = None
    week_start_date: datetime | str | None = None
    week_end_date: datetime | str | None = None
    status: WeeklyPlanStatusType | None = None


class WeeklyPlanResponse(BaseModel):
    id: str
    student_id: str
    title: str
    description: str | None = None
    week_start_date: datetime | str
    week_end_date: datetime | str | None = None
    status: str = "ACTIVE"
    generated_by_agent: str | None = None
    version: int = 1
    generated_at: datetime | str | None = None
    created_at: datetime | str
    updated_at: datetime | str
    tasks: list[PlanTaskResponse] = []

    model_config = ConfigDict(from_attributes=True)
