from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models.assignment import (
    AssignmentAnalyticsResponse,
    AssignmentCreateRequest,
    AssignmentProgressUpdateRequest,
    AssignmentQuestionCreateRequest,
    AssignmentQuestionReorderRequest,
    AssignmentQuestionResponse,
    AssignmentQuestionUpdateRequest,
    AssignmentResponse,
    AssignmentSubmissionsOverviewResponse,
    AssignmentUpdateRequest,
    ChecklistCreateRequest,
    ChecklistReorderRequest,
    ChecklistResponse,
    ChecklistUpdateRequest,
    GradeSubmissionRequest,
    SubmissionResponse,
)
from src.models.auth import UserResponse
from src.routers.auth_router import get_current_user
from src.services.assignment_service import AssignmentService

router = APIRouter(tags=["Assignments"])


@router.get("/assignments", response_model=list[AssignmentResponse])
async def get_all_user_assignments(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch all assignments across all enrolled/managed courses for the current user."""
    return await AssignmentService.get_all_user_assignments(db, current_user)


@router.get("/courses/{course_id}/assignments", response_model=list[AssignmentResponse])
async def get_course_assignments(
    course_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch assignments for a specific course (Instructor or Enrolled Student)."""
    return await AssignmentService.get_course_assignments(db, course_id, current_user)


@router.post(
    "/courses/{course_id}/assignments",
    response_model=AssignmentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_assignment(
    course_id: str,
    payload: AssignmentCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Instructor creates a new assignment for a course."""
    return await AssignmentService.create_assignment(db, course_id, payload, current_user, background_tasks=background_tasks)


@router.post("/assignments/{assignment_id}/attachment", response_model=AssignmentResponse)
async def upload_assignment_attachment(
    assignment_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Instructor uploads problem specification / reference file for an assignment."""
    return await AssignmentService.upload_assignment_attachment(db, assignment_id, file, current_user, background_tasks=background_tasks)


@router.get("/assignments/{assignment_id}/download-attachment")
async def download_assignment_attachment(
    assignment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download reference file attached to an assignment."""
    return await AssignmentService.download_assignment_attachment(db, assignment_id, current_user)


@router.get("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def get_assignment_detail(
    assignment_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch assignment details including checklists and progress."""
    return await AssignmentService.get_assignment_detail(db, assignment_id, current_user)


@router.put("/assignments/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment(
    assignment_id: str,
    payload: AssignmentUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Instructor updates an assignment."""
    return await AssignmentService.update_assignment(db, assignment_id, payload, current_user, background_tasks=background_tasks)


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor deletes an assignment."""
    return await AssignmentService.delete_assignment(db, assignment_id, current_user)


@router.patch("/assignments/{assignment_id}/progress", response_model=AssignmentResponse)
async def update_student_progress(
    assignment_id: str,
    payload: AssignmentProgressUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Student updates their own assignment progress status."""
    return await AssignmentService.update_student_progress(db, assignment_id, payload, current_user)


# --- Question Management Endpoints ---

@router.post(
    "/assignments/{id}/questions",
    response_model=AssignmentQuestionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_assignment_question(
    id: str,
    payload: AssignmentQuestionCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor adds a question to an assignment."""
    return await AssignmentService.create_question(db, id, payload, current_user)


@router.put("/questions/{id}", response_model=AssignmentQuestionResponse)
async def update_assignment_question(
    id: str,
    payload: AssignmentQuestionUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor updates a question."""
    return await AssignmentService.update_question(db, id, payload, current_user)


@router.delete("/questions/{id}")
async def delete_assignment_question(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor deletes a question."""
    return await AssignmentService.delete_question(db, id, current_user)


@router.patch("/questions/reorder")
async def reorder_assignment_questions(
    payload: AssignmentQuestionReorderRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor reorders questions."""
    return await AssignmentService.reorder_questions(db, payload, current_user)


@router.post("/assignments/{id}/import-questions", response_model=list[AssignmentQuestionResponse])
async def import_assignment_questions(
    id: str,
    file: UploadFile = File(...),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Instructor imports questions from a CSV file into an assignment."""
    return await AssignmentService.import_questions_from_csv(db, id, file, current_user)


# --- Student Submissions Endpoints ---

@router.post("/assignments/{assignment_id}/submit", response_model=SubmissionResponse)
async def submit_assignment(
    assignment_id: str,
    file: UploadFile | None = File(default=None),
    submission_text: str | None = Form(default=None),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student submits a solution file and/or text notes for an assignment."""
    return await AssignmentService.submit_assignment(db, assignment_id, file, submission_text, current_user)


@router.get("/assignments/{assignment_id}/my-submission", response_model=SubmissionResponse | None)
async def get_my_submission(
    assignment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student gets their submission status and uploaded file info."""
    return await AssignmentService.get_my_submission(db, assignment_id, current_user)


@router.post("/assignments/{assignment_id}/undo-turn-in", response_model=SubmissionResponse)
async def undo_turn_in_assignment(
    assignment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Student unlocks their active submission (Undo Turn In) to allow editing."""
    return await AssignmentService.undo_turn_in_assignment(db, assignment_id, current_user)


@router.get("/assignments/{assignment_id}/submissions", response_model=AssignmentSubmissionsOverviewResponse)
async def get_assignment_submissions(
    assignment_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Instructor views overview statistics and complete student submission roster."""
    return await AssignmentService.get_assignment_submissions(db, assignment_id, current_user)


@router.put("/submissions/{submission_id}/grade", response_model=SubmissionResponse)
async def grade_submission(
    submission_id: str,
    payload: GradeSubmissionRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Instructor grades a student submission."""
    return await AssignmentService.grade_submission(db, submission_id, payload, current_user)


@router.get("/submissions/{submission_id}/download")
async def download_submission_file(
    submission_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a student's submitted solution file."""
    return await AssignmentService.download_submission_file(db, submission_id, current_user)


# --- Checklist & Analytics Endpoints ---

@router.get("/assignments/{id}/checklists", response_model=list[ChecklistResponse])
async def get_assignment_checklists(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Get all checklist items for an assignment."""
    return await AssignmentService.get_assignment_checklists(db, id, current_user)


@router.post("/assignments/{id}/checklists", response_model=ChecklistResponse, status_code=status.HTTP_201_CREATED)
async def create_checklist_item(
    id: str,
    payload: ChecklistCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor creates a checklist item for an assignment."""
    return await AssignmentService.create_checklist(db, id, payload, current_user)


@router.put("/checklists/{id}", response_model=ChecklistResponse)
async def update_checklist_item(
    id: str,
    payload: ChecklistUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor updates a checklist item."""
    return await AssignmentService.update_checklist(db, id, payload, current_user)


@router.delete("/checklists/{id}")
async def delete_checklist_item(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor deletes a checklist item."""
    return await AssignmentService.delete_checklist(db, id, current_user)


@router.patch("/checklists/reorder")
async def reorder_checklist_items(
    payload: ChecklistReorderRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor reorders checklist items."""
    return await AssignmentService.reorder_checklists(db, payload, current_user)


@router.patch("/checklists/{id}/complete", response_model=ChecklistResponse)
async def mark_checklist_complete(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Student marks a checklist item as completed."""
    return await AssignmentService.set_checklist_completion(db, id, True, current_user)


@router.patch("/checklists/{id}/uncomplete", response_model=ChecklistResponse)
async def mark_checklist_uncomplete(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Student marks a checklist item as uncompleted."""
    return await AssignmentService.set_checklist_completion(db, id, False, current_user)


@router.get("/assignments/{id}/analytics", response_model=AssignmentAnalyticsResponse)
async def get_assignment_analytics(
    id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor views aggregated completion analytics for an assignment."""
    return await AssignmentService.get_assignment_analytics(db, id, current_user)

