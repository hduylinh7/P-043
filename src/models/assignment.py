from datetime import datetime
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field

PriorityType = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class ChecklistCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Checklist item title")
    description: str | None = Field(default=None, description="Checklist item description")
    display_order: int = Field(default=0, ge=0, description="Display order sequence")


class ChecklistUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    display_order: int | None = Field(default=None, ge=0)


class ChecklistReorderItem(BaseModel):
    id: str = Field(..., description="Checklist item ID")
    display_order: int = Field(..., ge=0, description="New display order")


class ChecklistReorderRequest(BaseModel):
    items: list[ChecklistReorderItem] = Field(..., description="List of checklist items with updated display_order")


class ChecklistResponse(BaseModel):
    id: str
    assignment_id: str
    title: str
    description: str | None = None
    display_order: int = 0
    created_at: datetime | str
    completed: bool = False
    completed_at: datetime | str | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Assignment title")
    description: str | None = Field(default=None, description="Detailed instructions or description")
    due_date: datetime | str | None = Field(default=None, description="Due date and time")
    estimated_hours: float | None = Field(default=None, ge=0, description="Estimated completion time in hours")
    status: str = Field(default="ACTIVE", description="Status (e.g. ACTIVE, ARCHIVED)")
    priority: PriorityType = Field(default="MEDIUM", description="Priority level: LOW, MEDIUM, HIGH, CRITICAL")


class AssignmentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    due_date: datetime | str | None = None
    estimated_hours: float | None = Field(default=None, ge=0)
    status: str | None = None
    priority: PriorityType | None = None


class AssignmentProgressUpdateRequest(BaseModel):
    progress_status: Literal["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] = Field(
        ..., description="Progress status: NOT_STARTED, IN_PROGRESS, or COMPLETED"
    )


class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: str | None = None
    due_date: datetime | str | None = None
    estimated_hours: float | None = None
    status: str = "ACTIVE"
    priority: str = "MEDIUM"
    attachment_file_name: str | None = None
    attachment_file_url: str | None = None
    created_by: str | None = None
    created_at: datetime | str
    updated_at: datetime | str
    progress_status: str | None = None
    checklist_count: int = 0
    completed_checklist_count: int = 0
    progress_percentage: int = 0
    checklists: list[ChecklistResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SubmissionResponse(BaseModel):
    id: str
    assignment_id: str
    student_id: str
    student_name: str | None = None
    student_email: str | None = None
    file_name: str | None = None
    file_url: str | None = None
    has_file: bool = False
    submission_text: str | None = None
    submitted_at: datetime | str | None = None
    status: str = "unsubmitted"
    score: float | None = None
    grade: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignmentAnalyticsResponse(BaseModel):
    assignment_id: str
    total_enrolled_students: int = 0
    average_completion_percentage: float = 0.0
    completed_students_count: int = 0
    in_progress_students_count: int = 0
    not_started_students_count: int = 0
