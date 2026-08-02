import enum


class UserRoleEnum(str, enum.Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    TA = "ta"
    ADMIN = "admin"


class EnrollmentRoleEnum(str, enum.Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    TA = "ta"


class SubmissionStatusEnum(str, enum.Enum):
    UNSUBMITTED = "unsubmitted"
    SUBMITTED = "submitted"
    GRADED = "graded"
    LATE = "late"
    MISSING = "missing"


class GoalStatusEnum(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class TaskPriorityEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatusEnum(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class NotificationTypeEnum(str, enum.Enum):
    DUE_DATE_REMINDER = "due_date_reminder"
    GOAL_CHECK_IN = "goal_check_in"
    STREAK_WARNING = "streak_warning"
    CUSTOM = "custom"


class ReflectionSessionStatusEnum(str, enum.Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class AgentRunStatusEnum(str, enum.Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


class SyncStatusEnum(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    SUCCESS = "success"
    FAILED = "failed"


class DocumentSourceTypeEnum(str, enum.Enum):
    CANVAS_SYLLABUS = "canvas_syllabus"
    CANVAS_FILE = "canvas_file"
    LECTURE_SLIDE = "lecture_slide"
    TEXTBOOK = "textbook"
    USER_UPLOAD = "user_upload"


class MemoryTypeEnum(str, enum.Enum):
    PREFERENCE = "preference"
    GOAL = "goal"
    WEAKNESS = "weakness"
    STRENGTH = "strength"
    FACT = "fact"
