from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class StudentContextDTO(BaseModel):
    id: str = Field(..., description="Student User ID")

    model_config = ConfigDict(from_attributes=True)


class PlanningPeriodDTO(BaseModel):
    week_start: str = Field(..., description="Start of week (YYYY-MM-DD)")
    week_end: str = Field(..., description="End of week (YYYY-MM-DD)")

    model_config = ConfigDict(from_attributes=True)


class GoalContextDTO(BaseModel):
    id: str
    title: str
    description: str | None = None
    category: str = "LEARNING"
    priority: str = "MEDIUM"
    target_date: str | None = None
    status: str = "ACTIVE"

    model_config = ConfigDict(from_attributes=True)


class AssignmentContextDTO(BaseModel):
    id: str
    title: str
    description: str | None = None
    course_id: str
    course_name: str | None = None
    due_date: str | None = None
    priority: str = "MEDIUM"
    estimated_hours: float | None = None
    status: str = "ACTIVE"

    model_config = ConfigDict(from_attributes=True)


class PersonalTaskContextDTO(BaseModel):
    id: str
    title: str
    description: str | None = None
    category: str = "STUDY"
    priority: str = "MEDIUM"
    status: str = "NOT_STARTED"
    due_date: str | None = None
    estimated_hours: float | None = None

    model_config = ConfigDict(from_attributes=True)


class PlanTaskContextDTO(BaseModel):
    id: str
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "medium"
    scheduled_date: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    estimated_duration: int | None = None
    source_type: str = "MANUAL"
    source_id: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CurrentWeeklyPlanContextDTO(BaseModel):
    id: str
    title: str
    description: str | None = None
    week_start_date: str
    week_end_date: str | None = None
    status: str = "ACTIVE"
    tasks: list[PlanTaskContextDTO] = []

    model_config = ConfigDict(from_attributes=True)


class PlannerContext(BaseModel):
    student: StudentContextDTO
    planning_period: PlanningPeriodDTO
    goals: list[GoalContextDTO] = Field(default_factory=list)
    assignments: list[AssignmentContextDTO] = Field(default_factory=list)
    personal_tasks: list[PersonalTaskContextDTO] = Field(default_factory=list)
    current_weekly_plan: CurrentWeeklyPlanContextDTO | None = None

    model_config = ConfigDict(from_attributes=True)
