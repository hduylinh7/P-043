from src.db.models.ai import (
    AcademicIntegrityLog,
    AgentMemory,
    AgentRun,
    AILog,
    PromptVersion,
    Recommendation,
)
from src.db.models.chat import ChatMessage, ChatSession
from src.db.models.identity import AnonymousProfile, Role, User, UserRole
from src.db.models.integration import SyncLog
from src.db.models.knowledge import Document, DocumentChunk
from src.db.models.learning import (
    Assignment,
    AssignmentChecklist,
    AssignmentQuestion,
    Course,
    CourseMaterial,
    CourseSchedule,
    Enrollment,
    QuestionOption,
    StudentAssignmentProgress,
    StudentChecklistProgress,
    Submission,
)
from src.db.models.planning import Goal, Notification, Task, WeeklyGoal
from src.db.models.reflection import ReflectionMessage, ReflectionSession

__all__ = [
    # Identity
    "User",
    "Role",
    "UserRole",
    "AnonymousProfile",
    # Learning
    "Course",
    "CourseMaterial",
    "CourseSchedule",
    "Enrollment",
    "Assignment",
    "AssignmentChecklist",
    "Submission",
    "StudentAssignmentProgress",
    "StudentChecklistProgress",



    # Planning
    "Goal",
    "WeeklyGoal",
    "Task",
    "Notification",
    # Reflection
    "ReflectionSession",
    "ReflectionMessage",
    # Chat
    "ChatSession",
    "ChatMessage",
    # AI
    "AgentMemory",
    "Recommendation",
    "AILog",
    "AcademicIntegrityLog",
    "AgentRun",
    "PromptVersion",
    # Knowledge
    "Document",
    "DocumentChunk",
    # Integration
    "SyncLog",
]
