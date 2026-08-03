import enum


class UserRoleEnum(enum.StrEnum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    TA = "ta"
    ADMIN = "admin"


class EnrollmentRoleEnum(enum.StrEnum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    TA = "ta"


class SubmissionStatusEnum(enum.StrEnum):
    UNSUBMITTED = "unsubmitted"
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"
    MISSING = "missing"


class GoalStatusEnum(enum.StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TaskPriorityEnum(enum.StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatusEnum(enum.StrEnum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class NotificationTypeEnum(enum.StrEnum):
    DUE_DATE_REMINDER = "due_date_reminder"
    GOAL_CHECK_IN = "goal_check_in"
    STREAK_WARNING = "streak_warning"
    CUSTOM = "custom"


class ReflectionSessionStatusEnum(enum.StrEnum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AgentRunStatusEnum(enum.StrEnum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class SyncStatusEnum(enum.StrEnum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


class DocumentSourceTypeEnum(enum.StrEnum):
    CANVAS_SYLLABUS = "canvas_syllabus"
    CANVAS_FILE = "canvas_file"
    LECTURE_SLIDE = "lecture_slide"
    TEXTBOOK = "textbook"
    USER_UPLOAD = "user_upload"


class MemoryTypeEnum(enum.StrEnum):
    PREFERENCE = "preference"
    GOAL = "goal"
    WEAKNESS = "weakness"
    STRENGTH = "strength"
    FACT = "fact"
