from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

VALID_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class CourseScheduleCreate(BaseModel):
    day_of_week: str = Field(..., description="Day of week e.g. Monday")
    start_time: str = Field(..., description="Start time in HH:MM format e.g. 08:00")
    end_time: str = Field(..., description="End time in HH:MM format e.g. 10:00")
    room: str | None = Field(default=None, description="Classroom/Room e.g. Room A1-301")

    @field_validator("day_of_week")
    @classmethod
    def validate_day(cls, v: str) -> str:
        clean = v.strip().capitalize()
        matching = [d for d in VALID_DAYS if d.lower() == clean.lower()]
        if not matching:
            raise ValueError(f"Ngày trong tuần không hợp lệ: {v}. Phải là một trong {', '.join(VALID_DAYS)}")
        return matching[0]

    @model_validator(mode="after")
    def validate_times(self):
        if not self.start_time or not self.end_time:
            raise ValueError("Giờ bắt đầu và giờ kết thúc không được để trống.")
        # Validate format HH:MM
        try:
            sh, sm = map(int, self.start_time.strip().split(":"))
            eh, em = map(int, self.end_time.strip().split(":"))
            start_mins = sh * 60 + sm
            end_mins = eh * 60 + em
        except Exception:
            raise ValueError("Định dạng giờ không hợp lệ. Vui lòng dùng định dạng HH:MM (ví dụ 08:00).")

        if end_mins <= start_mins:
            raise ValueError(f"Giờ kết thúc ({self.end_time}) phải sau giờ bắt đầu ({self.start_time}).")
        return self


class CourseScheduleResponse(BaseModel):
    id: str
    course_id: str
    day_of_week: str
    start_time: str
    end_time: str
    room: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CourseCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255, description="Course title/name")
    code: str = Field(..., min_length=2, max_length=50, description="Course code (e.g. COMP1010)")
    description: str | None = Field(default=None, description="Detailed course description")
    term: str | None = Field(default=None, description="Academic term (e.g. Fall 2026)")
    credits: int = Field(default=3, ge=1, le=30, description="Course credit units")
    start_date: datetime = Field(..., description="Course start date")
    end_date: datetime = Field(..., description="Course end date")
    schedules: list[CourseScheduleCreate] | None = Field(default=None, description="Official recurring weekly class schedules (Optional - Auto allocated if omitted)")

    @model_validator(mode="after")
    def validate_course_request(self):
        if self.end_date <= self.start_date:
            raise ValueError("End date must be after start date.")

        if self.schedules:
            for i in range(len(self.schedules)):
                for j in range(i + 1, len(self.schedules)):
                    s1 = self.schedules[i]
                    s2 = self.schedules[j]
                    if s1.day_of_week.lower() == s2.day_of_week.lower():
                        sh1, sm1 = map(int, s1.start_time.split(":"))
                        eh1, em1 = map(int, s1.end_time.split(":"))
                        sh2, sm2 = map(int, s2.start_time.split(":"))
                        eh2, em2 = map(int, s2.end_time.split(":"))
                        start1, end1 = sh1 * 60 + sm1, eh1 * 60 + em1
                        start2, end2 = sh2 * 60 + sm2, eh2 * 60 + em2
                        if start1 < end2 and start2 < end1:
                            raise ValueError(
                                f"Lịch học bị trùng lắp trong cùng một khóa học vào {s1.day_of_week}: "
                                f"{s1.start_time}–{s1.end_time} trùng với {s2.start_time}–{s2.end_time}"
                            )
        return self


class CourseUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=255)
    code: str | None = Field(default=None, min_length=2, max_length=50)
    description: str | None = None
    term: str | None = None
    credits: int | None = Field(default=None, ge=1, le=30)
    start_date: datetime | None = None
    end_date: datetime | None = None
    schedules: list[CourseScheduleCreate] | None = None

    @model_validator(mode="after")
    def validate_course_update(self):
        if self.start_date and self.end_date and self.end_date <= self.start_date:
            raise ValueError("End date must be after start date.")

        if self.schedules is not None:
            for i in range(len(self.schedules)):
                for j in range(i + 1, len(self.schedules)):
                    s1 = self.schedules[i]
                    s2 = self.schedules[j]
                    if s1.day_of_week.lower() == s2.day_of_week.lower():
                        sh1, sm1 = map(int, s1.start_time.split(":"))
                        eh1, em1 = map(int, s1.end_time.split(":"))
                        sh2, sm2 = map(int, s2.start_time.split(":"))
                        eh2, em2 = map(int, s2.end_time.split(":"))
                        start1, end1 = sh1 * 60 + sm1, eh1 * 60 + em1
                        start2, end2 = sh2 * 60 + sm2, eh2 * 60 + em2
                        if start1 < end2 and start2 < end1:
                            raise ValueError(
                                f"Lịch học bị trùng lắp trong cùng một khóa học vào {s1.day_of_week}: "
                                f"{s1.start_time}–{s1.end_time} trùng với {s2.start_time}–{s2.end_time}"
                            )
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
    credits: int = 3
    start_date: datetime | str | None = None
    end_date: datetime | str | None = None
    status: str = "ACTIVE"
    instructor_id: str | None = None
    instructor_name: str | None = None
    created_at: datetime | str
    student_count: int = 0
    is_enrolled: bool = False
    schedules: list[CourseScheduleResponse] = Field(default_factory=list)

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


class ScheduleConflictDetail(BaseModel):
    conflicting_course_id: str
    conflicting_course_code: str
    conflicting_course_name: str
    day_of_week: str
    existing_start_time: str
    existing_end_time: str
    new_start_time: str
    new_end_time: str
    overlap_start_time: str
    overlap_end_time: str


class TimetableEntryResponse(BaseModel):
    course_id: str
    course_code: str
    course_name: str
    credits: int
    instructor_name: str | None = None
    start_date: datetime | str
    end_date: datetime | str
    day_of_week: str
    start_time: str
    end_time: str
    room: str | None = None
