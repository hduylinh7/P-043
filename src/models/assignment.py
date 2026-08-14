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


# --- Assignment Question Schemas ---

class QuestionOptionCreateRequest(BaseModel):
    option_text: str = Field(..., min_length=1, description="Option text")
    is_correct: bool = Field(default=False, description="Whether option is correct")
    display_order: int = Field(default=0, ge=0)


class QuestionOptionResponse(BaseModel):
    id: str
    question_id: str
    option_text: str
    is_correct: bool = False
    display_order: int = 0

    model_config = ConfigDict(from_attributes=True)


class AssignmentQuestionCreateRequest(BaseModel):
    question_type: Literal["MULTIPLE_CHOICE", "ESSAY", "SHORT_ANSWER"] = Field(..., description="Type of question")
    question_text: str = Field(..., min_length=1, description="Question text")
    points: float = Field(default=1.0, ge=0.0, description="Question score points")
    display_order: int = Field(default=0, ge=0)
    expected_answer: str | None = Field(default=None, description="Expected answer or grading rubric")
    options: list[QuestionOptionCreateRequest] = Field(default_factory=list, description="Options for Multiple Choice")


class AssignmentQuestionUpdateRequest(BaseModel):
    question_type: Literal["MULTIPLE_CHOICE", "ESSAY", "SHORT_ANSWER"] | None = None
    question_text: str | None = Field(default=None, min_length=1)
    points: float | None = Field(default=None, ge=0.0)
    display_order: int | None = Field(default=None, ge=0)
    expected_answer: str | None = None
    options: list[QuestionOptionCreateRequest] | None = None


class AssignmentQuestionResponse(BaseModel):
    id: str
    assignment_id: str
    question_type: str
    question_text: str
    points: float = 1.0
    display_order: int = 0
    expected_answer: str | None = None
    options: list[QuestionOptionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class AssignmentQuestionReorderItem(BaseModel):
    id: str
    display_order: int = Field(..., ge=0)


class AssignmentQuestionReorderRequest(BaseModel):
    items: list[AssignmentQuestionReorderItem]


# --- Assignment Schemas ---

class AssignmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=255, description="Assignment title")
    description: str | None = Field(default=None, description="Detailed instructions or description")
    available_from: datetime | str | None = Field(default=None, description="Available from start date")
    due_date: datetime | str | None = Field(default=None, description="Due date and time")
    estimated_hours: float | None = Field(default=None, ge=0, description="Estimated completion time in hours")
    status: str = Field(default="DRAFT", description="Status (e.g. DRAFT, ACTIVE, CLOSED)")
    priority: PriorityType = Field(default="MEDIUM", description="Priority level: LOW, MEDIUM, HIGH, CRITICAL")
    questions: list[AssignmentQuestionCreateRequest] = Field(default_factory=list, description="List of questions")


class AssignmentUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    available_from: datetime | str | None = None
    due_date: datetime | str | None = None
    estimated_hours: float | None = Field(default=None, ge=0)
    status: str | None = None
    priority: PriorityType | None = None
    questions: list[AssignmentQuestionCreateRequest] | None = None


class AssignmentProgressUpdateRequest(BaseModel):
    progress_status: Literal["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] = Field(
        ..., description="Progress status: NOT_STARTED, IN_PROGRESS, or COMPLETED"
    )


class AssignmentResponse(BaseModel):
    id: str
    course_id: str
    title: str
    description: str | None = None
    available_from: datetime | str | None = None
    due_date: datetime | str | None = None
    estimated_hours: float | None = None
    status: str = "DRAFT"
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
    question_count: int = 0
    total_points: float = 0.0
    checklists: list[ChecklistResponse] = Field(default_factory=list)
    questions: list[AssignmentQuestionResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)



class GradeSubmissionRequest(BaseModel):
    score: float = Field(..., ge=0.0, description="Total score assigned by instructor")
    grade: str = Field(default="GRADED", description="Grading status, e.g., GRADED or PENDING")
    feedback: str | None = Field(default=None, description="General feedback and question-level breakdown JSON")


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
    student_status: str = "Not Submitted"  # "Submitted", "Late", "Not Submitted"
    grading_status: str = "-"              # "Graded", "Pending", "-"
    is_late: bool = False
    score: float | None = None
    grade: str | None = None
    feedback: str | None = None

    model_config = ConfigDict(from_attributes=True)


class AssignmentSubmissionsOverviewResponse(BaseModel):
    assignment_id: str
    assignment_title: str
    course_title: str
    available_from: datetime | str | None = None
    due_date: datetime | str | None = None
    question_count: int = 0
    total_points: float = 0.0
    total_students: int = 0
    submitted_count: int = 0
    not_submitted_count: int = 0
    late_count: int = 0
    graded_count: int = 0
    pending_count: int = 0
    submissions: list[SubmissionResponse] = Field(default_factory=list)


class AssignmentAnalyticsResponse(BaseModel):
    assignment_id: str
    total_enrolled_students: int = 0
    average_completion_percentage: float = 0.0
    completed_students_count: int = 0
    in_progress_students_count: int = 0
    not_started_students_count: int = 0

