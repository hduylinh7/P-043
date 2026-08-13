from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, model_validator


class CourseCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Course title/name")
    code: str = Field(..., min_length=2, max_length=50, description="Course code (e.g. COMP1010)")
    description: str | None = Field(default=None, description="Detailed course description")
    term: str | None = Field(default=None, description="Academic term (e.g. Fall 2026)")
    start_date: datetime = Field(..., description="Course start date")
    end_date: datetime = Field(..., description="Course end date")

    @model_validator(mode="after")
    def validate_dates(self):
        if self.end_date <= self.start_date:
            raise ValueError("End date must be after start date.")
        return self


class CourseUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = None
    term: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None

    @model_validator(mode="after")
    def validate_dates(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("End date must be after start date.")
        return self


class InstructorBrief(BaseModel):
    id: str
    full_name: str
    email: str

    model_config = ConfigDict(from_attributes=True)


class CourseResponse(BaseModel):
    id: str
    code: str
    name: str
    description: str | None = None
    term: str | None = None
    start_date: datetime | str | None = None
    end_date: datetime | str | None = None
    status: str = "ACTIVE"
    instructor_id: str | None = None
    instructor_name: str | None = None
    created_at: datetime | str
    student_count: int = 0
    is_enrolled: bool = False

    model_config = ConfigDict(from_attributes=True)


class EnrolledStudentResponse(BaseModel):
    id: str
    full_name: str
    email: str
    joined_at: datetime | str
    status: str = "active"

    model_config = ConfigDict(from_attributes=True)


class CourseDetailResponse(BaseModel):
    course: CourseResponse
    students: list[EnrolledStudentResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

