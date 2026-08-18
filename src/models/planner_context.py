from typing import Any
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
    attachment_file_name: str | None = None
    questions: list[dict[str, Any]] = Field(default_factory=list)
    checklists: list[dict[str, Any]] = Field(default_factory=list)
    embedded_chunks: list[str] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class CourseMaterialContextDTO(BaseModel):
    id: str
    course_id: str
    course_name: str | None = None
    title: str
    file_name: str
    material_type: str = "document"

    model_config = ConfigDict(from_attributes=True)


class PlanTaskContextDTO(BaseModel):
    id: str
    title: str
    description: str | None = None
    topic: str | None = None
    what_to_study: list[str] = Field(default_factory=list)
    what_to_do: list[str] = Field(default_factory=list)
    reason: str | None = None
    material_id: str | None = None
    material_title: str | None = None
    course_id: str | None = None
    course_name: str | None = None
    goal_id: str | None = None
    goal_title: str | None = None
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


class FixedCourseScheduleDTO(BaseModel):
    course_id: str
    course_code: str
    course_name: str
    day_of_week: str
    start_time: str
    end_time: str
    start_date: str | None = None
    end_date: str | None = None

    model_config = ConfigDict(from_attributes=True)


class PlannerContext(BaseModel):
    student: StudentContextDTO
    planning_period: PlanningPeriodDTO
    goals: list[GoalContextDTO] = Field(default_factory=list)
    assignments: list[AssignmentContextDTO] = Field(default_factory=list)
    course_materials: list[CourseMaterialContextDTO] = Field(default_factory=list)
    fixed_course_schedules: list[FixedCourseScheduleDTO] = Field(default_factory=list)
    current_weekly_plan: CurrentWeeklyPlanContextDTO | None = None

    model_config = ConfigDict(from_attributes=True)

