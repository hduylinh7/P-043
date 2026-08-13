import logging
import mimetypes
import uuid
from io import BytesIO
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
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
    QuestionOptionResponse,
    SubmissionResponse,
)
from src.models.auth import UserResponse
from src.repositories.assignment_repository import AssignmentRepository
from src.repositories.course_repository import CourseRepository
from src.services.storage.factory import get_storage_service

logger = logging.getLogger(__name__)


class AssignmentService:
    @staticmethod
    def _is_instructor_or_admin(current_user: UserResponse) -> bool:
        return "instructor" in current_user.roles or "admin" in current_user.roles

    @staticmethod
    def _build_assignment_response(assignment, progress_data: dict | None = None) -> AssignmentResponse:
        questions = getattr(assignment, "questions", []) or []
        question_list = []
        total_pts = 0.0
        for q in questions:
            total_pts += q.points
            opts = getattr(q, "options", []) or []
            question_list.append(
                AssignmentQuestionResponse(
                    id=q.id,
                    assignment_id=q.assignment_id,
                    question_type=q.question_type,
                    question_text=q.question_text,
                    points=q.points,
                    display_order=q.display_order,
                    expected_answer=q.expected_answer,
                    options=[
                        QuestionOptionResponse(
                            id=opt.id,
                            question_id=opt.question_id,
                            option_text=opt.option_text,
                            is_correct=opt.is_correct,
                            display_order=opt.display_order,
                        )
                        for opt in opts
                    ],
                )
            )

        checklists = getattr(assignment, "checklists", []) or []
        checklist_responses = []
        if isinstance(checklists, list) and checklists and isinstance(checklists[0], dict):
            checklist_responses = [
                ChecklistResponse(
                    id=c["id"],
                    assignment_id=c["assignment_id"],
                    title=c["title"],
                    description=c.get("description"),
                    display_order=c.get("display_order", 0),
                    created_at=c["created_at"],
                    completed=c.get("completed", False),
                    completed_at=c.get("completed_at"),
                )
                for c in checklists
            ]
        else:
            checklist_responses = [
                ChecklistResponse(
                    id=c.id,
                    assignment_id=c.assignment_id,
                    title=c.title,
                    description=c.description,
                    display_order=c.display_order,
                    created_at=c.created_at,
                    completed=getattr(c, "completed", False),
                    completed_at=getattr(c, "completed_at", None),
                )
                for c in checklists
            ]

        progress_status = progress_data.get("progress_status") if progress_data else None
        checklist_count = progress_data.get("checklist_count", len(checklist_responses)) if progress_data else len(checklist_responses)
        completed_checklist_count = progress_data.get("completed_checklist_count", 0) if progress_data else 0
        progress_percentage = progress_data.get("progress_percentage", 0) if progress_data else 0

        return AssignmentResponse(
            id=assignment.id,
            course_id=assignment.course_id,
            title=assignment.title,
            description=assignment.description,
            available_from=assignment.available_from,
            due_date=assignment.due_at,
            estimated_hours=assignment.estimated_hours,
            status=assignment.status,
            priority=assignment.priority,
            attachment_file_name=assignment.attachment_file_name,
            attachment_file_url=assignment.attachment_file_url,
            created_by=assignment.created_by,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
            progress_status=progress_status,
            checklist_count=checklist_count,
            completed_checklist_count=completed_checklist_count,
            progress_percentage=progress_percentage,
            question_count=len(question_list),
            total_points=total_pts,
            checklists=checklist_responses,
            questions=question_list,
        )

    @staticmethod
    async def create_assignment(
        db: AsyncSession,
        course_id: str,
        payload: AssignmentCreateRequest,
        current_user: UserResponse,
    ) -> AssignmentResponse:
        """Instructor creates a new assignment for an owned course."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học này mới có quyền tạo bài tập.",
            )

        assignment = await AssignmentRepository.create_assignment(
            db=db,
            course_id=course_id,
            title=payload.title,
            description=payload.description,
            available_from=payload.available_from,
            due_date=payload.due_date,
            estimated_hours=payload.estimated_hours,
            status=payload.status,
            priority=payload.priority,
            created_by=current_user.id,
        )

        # Create questions if provided in payload
        if payload.questions:
            for idx, q_req in enumerate(payload.questions):
                opts = [opt.model_dump() for opt in q_req.options] if q_req.options else None
                await AssignmentRepository.create_question(
                    db=db,
                    assignment_id=assignment.id,
                    question_type=q_req.question_type,
                    question_text=q_req.question_text,
                    points=q_req.points,
                    display_order=q_req.display_order or idx,
                    expected_answer=q_req.expected_answer,
                    options=opts,
                )

        full_assignment = await AssignmentRepository.get_by_id(db, assignment.id)
        return AssignmentService._build_assignment_response(full_assignment or assignment)


    @staticmethod
    async def upload_assignment_attachment(
        db: AsyncSession,
        assignment_id: str,
        file: UploadFile,
        current_user: UserResponse,
    ) -> AssignmentResponse:
        """Instructor uploads a problem specification or reference file for an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền tải lên tài liệu bài tập.",
            )

        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tập tin không hợp lệ.",
            )

        settings = get_settings()
        contents = await file.read()
        max_bytes = settings.max_upload_size_mb * 1024 * 1024
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dung lượng tập tin vượt quá giới hạn ({settings.max_upload_size_mb} MB).",
            )

        storage = get_storage_service()
        unique_prefix = uuid.uuid4().hex
        clean_filename = file.filename.replace(" ", "_")
        object_key = f"course/{assignment.course_id}/assignments/{assignment.id}/attachment/{unique_prefix}_{clean_filename}"
        content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"

        try:
            await storage.upload_file(file_data=contents, object_key=object_key, content_type=content_type)
        except Exception as e:
            logger.error(f"Failed to upload attachment {object_key}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi khi tải tệp đính kèm lên lưu trữ.",
            )

        file_url = f"/api/v1/assignments/{assignment.id}/download-attachment"
        updated_assignment = await AssignmentRepository.update_assignment(
            db=db,
            assignment=assignment,
            attachment_file_name=file.filename,
            attachment_file_url=file_url,
            attachment_object_key=object_key,
        )

        return AssignmentResponse(
            id=updated_assignment.id,
            course_id=updated_assignment.course_id,
            title=updated_assignment.title,
            description=updated_assignment.description,
            due_date=updated_assignment.due_at,
            estimated_hours=updated_assignment.estimated_hours,
            status=updated_assignment.status,
            priority=updated_assignment.priority,
            attachment_file_name=updated_assignment.attachment_file_name,
            attachment_file_url=updated_assignment.attachment_file_url,
            created_by=updated_assignment.created_by,
            created_at=updated_assignment.created_at,
            updated_at=updated_assignment.updated_at,
        )

    @staticmethod
    async def download_assignment_attachment(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ):
        """Download reference file attached to an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment or not assignment.attachment_object_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tệp đính kèm bài tập.",
            )

        storage = get_storage_service()
        try:
            file_bytes = await storage.download_file(assignment.attachment_object_key)
            return StreamingResponse(
                BytesIO(file_bytes),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{assignment.attachment_file_name or "attachment"}"'
                },
            )
        except Exception as e:
            logger.error(f"Download assignment attachment error: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không thể tải xuống tệp đính kèm: {e}",
            )

    @staticmethod
    async def get_course_assignments(
        db: AsyncSession,
        course_id: str,
        current_user: UserResponse,
    ) -> list[AssignmentResponse]:
        """Fetch all assignments for a course (Student or Instructor)."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        is_owner = (
            AssignmentService._is_instructor_or_admin(current_user)
            and course.instructor_id == current_user.id
        )
        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=course_id
        )

        if not is_owner and not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa tham gia khóa học này hoặc không có quyền truy cập bài tập.",
            )

        if is_owner and not is_enrolled:
            assignments = await AssignmentRepository.get_assignments_by_course(db, course_id, include_drafts=True)
            return [AssignmentService._build_assignment_response(a) for a in assignments]
        else:
            items = await AssignmentRepository.get_assignments_by_course_with_student_progress(
                db, course_id=course_id, student_id=current_user.id
            )
            results = []
            for item in items:
                a = item["assignment"]
                results.append(AssignmentService._build_assignment_response(a, progress_data=item))
            return results

    @staticmethod
    async def get_assignment_detail(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> AssignmentResponse:
        """Fetch details for a specific assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        is_owner = (
            AssignmentService._is_instructor_or_admin(current_user)
            and course.instructor_id == current_user.id
        )
        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=assignment.course_id
        )

        if not is_owner and not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xem thông tin bài tập này.",
            )

        if not is_owner and assignment.status == "DRAFT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bài tập đang ở trạng thái nháp.",
            )

        checklists_data = await AssignmentRepository.get_checklists_by_assignment_with_student_progress(
            db, assignment_id=assignment_id, student_id=current_user.id
        )
        total_chk = len(checklists_data)
        completed_chk = sum(1 for c in checklists_data if c["completed"])
        prog_pct = round((completed_chk / total_chk) * 100) if total_chk > 0 else 0

        progress_record = await AssignmentRepository.get_student_progress(
            db, assignment_id=assignment_id, student_id=current_user.id
        )

        progress_info = {
            "progress_status": progress_record.progress_status if progress_record else "NOT_STARTED",
            "checklist_count": total_chk,
            "completed_checklist_count": completed_chk,
            "progress_percentage": prog_pct,
        }

        return AssignmentService._build_assignment_response(assignment, progress_data=progress_info)

    @staticmethod
    async def update_assignment(
        db: AsyncSession,
        assignment_id: str,
        payload: AssignmentUpdateRequest,
        current_user: UserResponse,
    ) -> AssignmentResponse:
        """Instructor updates an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học này mới có quyền chỉnh sửa bài tập.",
            )

        updated_assignment = await AssignmentRepository.update_assignment(
            db=db,
            assignment=assignment,
            title=payload.title,
            description=payload.description,
            available_from=payload.available_from,
            due_date=payload.due_date,
            estimated_hours=payload.estimated_hours,
            status=payload.status,
            priority=payload.priority,
        )

        full_updated = await AssignmentRepository.get_by_id(db, assignment_id)
        return AssignmentService._build_assignment_response(full_updated or updated_assignment)


    @staticmethod
    async def delete_assignment(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> dict:
        """Instructor deletes an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học này mới có quyền xóa bài tập.",
            )

        await AssignmentRepository.delete_assignment(db, assignment)
        return {"message": "Xóa bài tập thành công."}

    @staticmethod
    async def update_student_progress(
        db: AsyncSession,
        assignment_id: str,
        payload: AssignmentProgressUpdateRequest,
        current_user: UserResponse,
    ) -> AssignmentResponse:
        """Student updates their overall progress status for an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=assignment.course_id
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa đăng ký khóa học này.",
            )

        await AssignmentRepository.upsert_student_progress(
            db=db,
            assignment_id=assignment_id,
            student_id=current_user.id,
            progress_status=payload.progress_status,
        )
        return await AssignmentService.get_assignment_detail(db, assignment_id, current_user)

    # --- Student Submission Operations ---

    @staticmethod
    async def submit_assignment(
        db: AsyncSession,
        assignment_id: str,
        file: UploadFile | None,
        submission_text: str | None,
        current_user: UserResponse,
    ) -> SubmissionResponse:
        """Student submits a completed solution file and/or text note for an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=assignment.course_id
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa đăng ký khóa học này nên không thể nộp bài.",
            )

        file_name = None
        file_url = None
        object_key = None

        if file and file.filename:
            settings = get_settings()
            contents = await file.read()
            max_bytes = settings.max_upload_size_mb * 1024 * 1024
            if len(contents) > max_bytes:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Dung lượng tập tin nộp bài vượt quá {settings.max_upload_size_mb} MB.",
                )

            storage = get_storage_service()
            unique_prefix = uuid.uuid4().hex
            clean_filename = file.filename.replace(" ", "_")
            object_key = f"course/{assignment.course_id}/assignments/{assignment.id}/submissions/{current_user.id}/{unique_prefix}_{clean_filename}"
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"

            try:
                await storage.upload_file(file_data=contents, object_key=object_key, content_type=content_type)
                file_name = file.filename
            except Exception as e:
                logger.error(f"Failed to upload submission file {object_key}: {e}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Lỗi trong quá trình nộp tập tin.",
                )

        try:
            submission = await AssignmentRepository.upsert_submission(
                db=db,
                assignment_id=assignment_id,
                student_id=current_user.id,
                file_name=file_name,
                file_url=None,
                object_key=object_key,
                submission_text=submission_text,
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )

        if file_name:
            submission.file_url = f"/api/v1/submissions/{submission.id}/download"
            db.add(submission)
            await db.commit()

        due_dt = assignment.due_at
        is_late = bool(due_dt and submission.submitted_at and submission.submitted_at > due_dt)

        return SubmissionResponse(
            id=submission.id,
            assignment_id=submission.assignment_id,
            student_id=submission.student_id,
            student_name=current_user.full_name,
            student_email=current_user.email,
            file_name=submission.file_name,
            file_url=submission.file_url,
            has_file=bool(submission.object_key),
            submission_text=submission.submission_text,
            submitted_at=submission.submitted_at,
            status=submission.status.value if hasattr(submission.status, 'value') else str(submission.status),
            student_status="Late" if is_late else "Submitted",
            grading_status="Graded" if submission.score is not None else "Pending",
            is_late=is_late,
            score=submission.score,
            grade=submission.grade,
            feedback=submission.feedback,
        )

    @staticmethod
    async def undo_turn_in_assignment(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> SubmissionResponse:
        """Student unlocks their active submission (Undo Turn In) to make changes."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        existing_sub = await AssignmentRepository.get_student_submission(db, assignment_id, current_user.id)
        if not existing_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn chưa nộp bài tập này.",
            )

        if existing_sub.status == "graded" or existing_sub.score is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bài nộp đã được giảng viên chấm điểm, không thể hủy nộp bài.",
            )

        unlocked_sub = await AssignmentRepository.undo_turn_in_submission(db, assignment_id, current_user.id)
        if not unlocked_sub:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể thực hiện hủy nộp bài.",
            )

        due_dt = assignment.due_at
        is_late = bool(due_dt and unlocked_sub.submitted_at and unlocked_sub.submitted_at > due_dt)

        return SubmissionResponse(
            id=unlocked_sub.id,
            assignment_id=unlocked_sub.assignment_id,
            student_id=unlocked_sub.student_id,
            student_name=current_user.full_name,
            student_email=current_user.email,
            file_name=unlocked_sub.file_name,
            file_url=unlocked_sub.file_url,
            has_file=bool(unlocked_sub.object_key),
            submission_text=unlocked_sub.submission_text,
            submitted_at=unlocked_sub.submitted_at,
            status=unlocked_sub.status.value if hasattr(unlocked_sub.status, 'value') else str(unlocked_sub.status),
            student_status="Not Submitted",
            grading_status="-",
            is_late=is_late,
            score=unlocked_sub.score,
            grade=unlocked_sub.grade,
            feedback=unlocked_sub.feedback,
        )

    @staticmethod
    async def get_my_submission(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> SubmissionResponse | None:
        """Student gets their current submission details."""
        sub = await AssignmentRepository.get_student_submission(db, assignment_id, current_user.id)
        if not sub:
            return None

        assignment = sub.assignment
        due_dt = assignment.due_at if assignment else None
        is_late = bool(due_dt and sub.submitted_at and sub.submitted_at > due_dt)

        return SubmissionResponse(
            id=sub.id,
            assignment_id=sub.assignment_id,
            student_id=sub.student_id,
            student_name=current_user.full_name,
            student_email=current_user.email,
            file_name=sub.file_name,
            file_url=sub.file_url,
            has_file=bool(sub.object_key),
            submission_text=sub.submission_text,
            submitted_at=sub.submitted_at,
            status=sub.status.value if hasattr(sub.status, 'value') else str(sub.status),
            student_status="Late" if is_late else ("Submitted" if sub.submitted_at else "Not Submitted"),
            grading_status="Graded" if sub.score is not None else ("Pending" if sub.submitted_at else "-"),
            is_late=is_late,
            score=sub.score,
            grade=sub.grade,
            feedback=sub.feedback,
        )

    @staticmethod
    async def get_assignment_submissions(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> AssignmentSubmissionsOverviewResponse:
        """Instructor views overview statistics and complete student submission roster."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền xem bài nộp.",
            )

        enrolled_students = await CourseRepository.get_enrolled_students(db, course.id)
        existing_subs = await AssignmentRepository.get_all_submissions_for_assignment(db, assignment_id)
        subs_by_student_id = {s.student_id: s for s in existing_subs}

        questions = assignment.questions or []
        question_count = len(questions)
        total_points = sum(q.points for q in questions) if questions else 0.0

        due_dt = assignment.due_at

        sub_responses: list[SubmissionResponse] = []
        submitted_count = 0
        not_submitted_count = 0
        late_count = 0
        graded_count = 0
        pending_count = 0

        for st in enrolled_students:
            st_id = st["id"]
            st_name = st["full_name"]
            st_email = st["email"]

            if st_id in subs_by_student_id:
                s = subs_by_student_id[st_id]
                is_late = bool(due_dt and s.submitted_at and s.submitted_at > due_dt)
                student_status = "Late" if is_late else "Submitted"
                is_graded = (s.score is not None) or (s.grade == "GRADED")
                grading_status = "Graded" if is_graded else "Pending"

                submitted_count += 1
                if is_late:
                    late_count += 1
                if is_graded:
                    graded_count += 1
                else:
                    pending_count += 1

                sub_responses.append(
                    SubmissionResponse(
                        id=s.id,
                        assignment_id=s.assignment_id,
                        student_id=s.student_id,
                        student_name=st_name,
                        student_email=st_email,
                        file_name=s.file_name,
                        file_url=s.file_url,
                        has_file=bool(s.object_key),
                        submission_text=s.submission_text,
                        submitted_at=s.submitted_at,
                        status=s.status.value if hasattr(s.status, 'value') else str(s.status),
                        student_status=student_status,
                        grading_status=grading_status,
                        is_late=is_late,
                        score=s.score,
                        grade=s.grade,
                        feedback=s.feedback,
                    )
                )
            else:
                not_submitted_count += 1
                sub_responses.append(
                    SubmissionResponse(
                        id=f"unsubmitted_{st_id}",
                        assignment_id=assignment_id,
                        student_id=st_id,
                        student_name=st_name,
                        student_email=st_email,
                        file_name=None,
                        file_url=None,
                        has_file=False,
                        submission_text=None,
                        submitted_at=None,
                        status="unsubmitted",
                        student_status="Not Submitted",
                        grading_status="-",
                        is_late=False,
                        score=None,
                        grade=None,
                        feedback=None,
                    )
                )

        return AssignmentSubmissionsOverviewResponse(
            assignment_id=assignment.id,
            assignment_title=assignment.title,
            course_title=course.name,
            available_from=assignment.available_from,
            due_date=assignment.due_at,
            question_count=question_count,
            total_points=total_points,
            total_students=len(enrolled_students),
            submitted_count=submitted_count,
            not_submitted_count=not_submitted_count,
            late_count=late_count,
            graded_count=graded_count,
            pending_count=pending_count,
            submissions=sub_responses,
        )

    @staticmethod
    async def grade_submission(
        db: AsyncSession,
        submission_id: str,
        payload: GradeSubmissionRequest,
        current_user: UserResponse,
    ) -> SubmissionResponse:
        """Instructor grades a student submission."""
        sub = await AssignmentRepository.get_submission_by_id(db, submission_id)
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bản ghi bài nộp.",
            )

        assignment = sub.assignment
        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền chấm điểm.",
            )

        graded_sub = await AssignmentRepository.grade_submission(
            db=db,
            submission=sub,
            score=payload.score,
            grade=payload.grade or "GRADED",
            feedback=payload.feedback,
        )

        due_dt = assignment.due_at
        is_late = bool(due_dt and graded_sub.submitted_at and graded_sub.submitted_at > due_dt)

        return SubmissionResponse(
            id=graded_sub.id,
            assignment_id=graded_sub.assignment_id,
            student_id=graded_sub.student_id,
            student_name=graded_sub.student.full_name if graded_sub.student else "Sinh viên",
            student_email=graded_sub.student.email if graded_sub.student else "",
            file_name=graded_sub.file_name,
            file_url=graded_sub.file_url,
            has_file=bool(graded_sub.object_key),
            submission_text=graded_sub.submission_text,
            submitted_at=graded_sub.submitted_at,
            status=graded_sub.status.value if hasattr(graded_sub.status, 'value') else str(graded_sub.status),
            student_status="Late" if is_late else "Submitted",
            grading_status="Graded",
            is_late=is_late,
            score=graded_sub.score,
            grade=graded_sub.grade,
            feedback=graded_sub.feedback,
        )

    @staticmethod
    async def download_submission_file(
        db: AsyncSession,
        submission_id: str,
        current_user: UserResponse,
    ):
        """Download student submitted file (Instructor or Submitting Student)."""
        sub = await AssignmentRepository.get_submission_by_id(db, submission_id)
        if not sub:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bản ghi bài nộp.",
            )

        if not sub.object_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bài nộp này chưa được lưu tập tin lên hệ thống. Sinh viên cần tải tập tin và nộp lại.",
            )

        assignment = sub.assignment
        course = assignment.course
        is_owner = (
            AssignmentService._is_instructor_or_admin(current_user)
            and course.instructor_id == current_user.id
        )
        is_submitting_student = (sub.student_id == current_user.id)

        if not is_owner and not is_submitting_student:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền tải xuống bài nộp này.",
            )

        storage = get_storage_service()
        try:
            file_bytes = await storage.download_file(sub.object_key)
            return StreamingResponse(
                BytesIO(file_bytes),
                media_type="application/octet-stream",
                headers={
                    "Content-Disposition": f'attachment; filename="{sub.file_name or "submission"}"'
                },
            )
        except Exception as e:
            logger.error(f"Download submission file error: {e}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Không thể tải xuống tệp nộp bài: {e}",
            )

    # --- Checklist & Analytics Methods ---

    @staticmethod
    async def get_assignment_checklists(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> list[ChecklistResponse]:
        """Fetch all checklist items for an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        items = await AssignmentRepository.get_checklists_by_assignment_with_student_progress(
            db, assignment_id=assignment_id, student_id=current_user.id
        )
        return [
            ChecklistResponse(
                id=c["id"],
                assignment_id=c["assignment_id"],
                title=c["title"],
                description=c["description"],
                display_order=c["display_order"],
                created_at=c["created_at"],
                completed=c["completed"],
                completed_at=c["completed_at"],
            )
            for c in items
        ]

    @staticmethod
    async def create_checklist(
        db: AsyncSession,
        assignment_id: str,
        payload: ChecklistCreateRequest,
        current_user: UserResponse,
    ) -> ChecklistResponse:
        """Instructor creates a checklist item for an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền tạo checklist.",
            )

        chk = await AssignmentRepository.create_checklist(
            db=db,
            assignment_id=assignment_id,
            title=payload.title,
            description=payload.description,
            display_order=payload.display_order,
        )
        return ChecklistResponse(
            id=chk.id,
            assignment_id=chk.assignment_id,
            title=chk.title,
            description=chk.description,
            display_order=chk.display_order,
            created_at=chk.created_at,
            completed=False,
        )

    @staticmethod
    async def update_checklist(
        db: AsyncSession,
        checklist_id: str,
        payload: ChecklistUpdateRequest,
        current_user: UserResponse,
    ) -> ChecklistResponse:
        """Instructor updates a checklist item."""
        chk = await AssignmentRepository.get_checklist_by_id(db, checklist_id)
        if not chk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục checklist.",
            )

        course = chk.assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền chỉnh sửa checklist.",
            )

        updated_chk = await AssignmentRepository.update_checklist(
            db=db,
            checklist=chk,
            title=payload.title,
            description=payload.description,
            display_order=payload.display_order,
        )

        return ChecklistResponse(
            id=updated_chk.id,
            assignment_id=updated_chk.assignment_id,
            title=updated_chk.title,
            description=updated_chk.description,
            display_order=updated_chk.display_order,
            created_at=updated_chk.created_at,
            completed=False,
        )

    @staticmethod
    async def delete_checklist(
        db: AsyncSession,
        checklist_id: str,
        current_user: UserResponse,
    ) -> dict:
        """Instructor deletes a checklist item."""
        chk = await AssignmentRepository.get_checklist_by_id(db, checklist_id)
        if not chk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục checklist.",
            )

        course = chk.assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền xóa checklist.",
            )

        await AssignmentRepository.delete_checklist(db, chk)
        return {"message": "Xóa mục checklist thành công."}

    @staticmethod
    async def reorder_checklists(
        db: AsyncSession,
        payload: ChecklistReorderRequest,
        current_user: UserResponse,
    ) -> dict:
        """Instructor reorders checklist items."""
        if not payload.items:
            return {"message": "Thứ tự đã được cập nhật."}

        first_chk = await AssignmentRepository.get_checklist_by_id(db, payload.items[0].id)
        if not first_chk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục checklist.",
            )

        course = first_chk.assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền sắp xếp checklist.",
            )

        items_dict = [{"id": item.id, "display_order": item.display_order} for item in payload.items]
        await AssignmentRepository.reorder_checklists(db, items_dict)
        return {"message": "Cập nhật thứ tự checklist thành công."}

    @staticmethod
    async def set_checklist_completion(
        db: AsyncSession,
        checklist_id: str,
        completed: bool,
        current_user: UserResponse,
    ) -> ChecklistResponse:
        """Student marks checklist item as completed or uncompleted."""
        chk = await AssignmentRepository.get_checklist_by_id(db, checklist_id)
        if not chk:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy mục checklist.",
            )

        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=chk.assignment.course_id
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa đăng ký khóa học này nên không thể cập nhật checklist.",
            )

        prog_record = await AssignmentRepository.set_student_checklist_progress(
            db=db,
            checklist_id=checklist_id,
            student_id=current_user.id,
            completed=completed,
        )

        all_checklists = await AssignmentRepository.get_checklists_by_assignment_with_student_progress(
            db, assignment_id=chk.assignment_id, student_id=current_user.id
        )
        tot = len(all_checklists)
        comp = sum(1 for c in all_checklists if c["completed"])
        if tot > 0:
            if comp == tot:
                new_status = "COMPLETED"
            elif comp > 0:
                new_status = "IN_PROGRESS"
            else:
                new_status = "NOT_STARTED"
            await AssignmentRepository.upsert_student_progress(
                db, assignment_id=chk.assignment_id, student_id=current_user.id, progress_status=new_status
            )

        return ChecklistResponse(
            id=chk.id,
            assignment_id=chk.assignment_id,
            title=chk.title,
            description=chk.description,
            display_order=chk.display_order,
            created_at=chk.created_at,
            completed=prog_record.completed,
            completed_at=prog_record.completed_at,
        )

    @staticmethod
    async def get_assignment_analytics(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> AssignmentAnalyticsResponse:
        """Instructor views aggregated analytics for an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền xem thống kê bài tập.",
            )

        analytics_data = await AssignmentRepository.get_assignment_analytics(db, assignment_id)
        return AssignmentAnalyticsResponse(**analytics_data)

    # --- Question Service Methods ---

    @staticmethod
    async def create_question(
        db: AsyncSession,
        assignment_id: str,
        payload: AssignmentQuestionCreateRequest,
        current_user: UserResponse,
    ) -> AssignmentQuestionResponse:
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền thêm câu hỏi.",
            )

        opts = [opt.model_dump() for opt in payload.options] if payload.options else None
        q = await AssignmentRepository.create_question(
            db=db,
            assignment_id=assignment_id,
            question_type=payload.question_type,
            question_text=payload.question_text,
            points=payload.points,
            display_order=payload.display_order,
            expected_answer=payload.expected_answer,
            options=opts,
        )

        return AssignmentQuestionResponse(
            id=q.id,
            assignment_id=q.assignment_id,
            question_type=q.question_type,
            question_text=q.question_text,
            points=q.points,
            display_order=q.display_order,
            expected_answer=q.expected_answer,
            options=[
                QuestionOptionResponse(
                    id=opt.id,
                    question_id=opt.question_id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    display_order=opt.display_order,
                )
                for opt in q.options
            ],
        )

    @staticmethod
    async def update_question(
        db: AsyncSession,
        question_id: str,
        payload: AssignmentQuestionUpdateRequest,
        current_user: UserResponse,
    ) -> AssignmentQuestionResponse:
        question = await AssignmentRepository.get_question_by_id(db, question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy câu hỏi.",
            )

        assignment = await AssignmentRepository.get_by_id(db, question.assignment_id)
        if not assignment or not AssignmentService._is_instructor_or_admin(current_user) or assignment.course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa câu hỏi này.",
            )

        opts = [opt.model_dump() for opt in payload.options] if payload.options is not None else None
        q = await AssignmentRepository.update_question(
            db=db,
            question=question,
            question_type=payload.question_type,
            question_text=payload.question_text,
            points=payload.points,
            display_order=payload.display_order,
            expected_answer=payload.expected_answer,
            options=opts,
        )

        return AssignmentQuestionResponse(
            id=q.id,
            assignment_id=q.assignment_id,
            question_type=q.question_type,
            question_text=q.question_text,
            points=q.points,
            display_order=q.display_order,
            expected_answer=q.expected_answer,
            options=[
                QuestionOptionResponse(
                    id=opt.id,
                    question_id=opt.question_id,
                    option_text=opt.option_text,
                    is_correct=opt.is_correct,
                    display_order=opt.display_order,
                )
                for opt in q.options
            ],
        )

    @staticmethod
    async def delete_question(
        db: AsyncSession,
        question_id: str,
        current_user: UserResponse,
    ) -> dict:
        question = await AssignmentRepository.get_question_by_id(db, question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy câu hỏi.",
            )

        assignment = await AssignmentRepository.get_by_id(db, question.assignment_id)
        if not assignment or not AssignmentService._is_instructor_or_admin(current_user) or assignment.course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền xóa câu hỏi này.",
            )

        await AssignmentRepository.delete_question(db, question)
        return {"detail": "Xóa câu hỏi thành công."}

    @staticmethod
    async def reorder_questions(
        db: AsyncSession,
        payload: AssignmentQuestionReorderRequest,
        current_user: UserResponse,
    ) -> dict:
        if not payload.items:
            return {"detail": "Thành công."}

        first_q = await AssignmentRepository.get_question_by_id(db, payload.items[0].id)
        if first_q:
            assignment = await AssignmentRepository.get_by_id(db, first_q.assignment_id)
            if not assignment or not AssignmentService._is_instructor_or_admin(current_user) or assignment.course.instructor_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không có quyền sắp xếp câu hỏi.",
                )

        items_dict = [item.model_dump() for item in payload.items]
        await AssignmentRepository.reorder_questions(db, items_dict)
        return {"detail": "Sắp xếp thứ tự câu hỏi thành công."}

    @staticmethod
    async def import_questions_from_csv(
        db: AsyncSession,
        assignment_id: str,
        file: UploadFile,
        current_user: UserResponse,
    ) -> list[AssignmentQuestionResponse]:
        import csv
        from io import StringIO

        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy bài tập.",
            )

        course = assignment.course
        if not AssignmentService._is_instructor_or_admin(current_user) or course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên sở hữu khóa học mới có quyền nhập câu hỏi.",
            )

        content_bytes = await file.read()
        try:
            content_str = content_bytes.decode("utf-8-sig")
        except UnicodeDecodeError:
            content_str = content_bytes.decode("latin-1")

        created_questions = []
        reader = csv.DictReader(StringIO(content_str))
        start_order = len(assignment.questions)

        for idx, row in enumerate(reader):
            q_type = (row.get("question_type") or row.get("type") or "").strip().upper()
            q_text = (row.get("question_text") or row.get("text") or row.get("question") or "").strip()
            if not q_text:
                continue

            if q_type not in ["MULTIPLE_CHOICE", "ESSAY", "SHORT_ANSWER"]:
                if row.get("option_1") or row.get("options"):
                    q_type = "MULTIPLE_CHOICE"
                else:
                    q_type = "SHORT_ANSWER"

            try:
                pts = float(row.get("points") or 1.0)
            except ValueError:
                pts = 1.0

            exp_ans = (row.get("expected_answer") or row.get("rubric") or row.get("answer") or "").strip() or None

            options = []
            if q_type == "MULTIPLE_CHOICE":
                correct_idx = None
                raw_correct = (row.get("correct_option") or row.get("correct") or "").strip()
                if raw_correct.isdigit():
                    correct_idx = int(raw_correct) - 1

                opt_texts = []
                for i in range(1, 10):
                    key = f"option_{i}"
                    if key in row and row[key] and row[key].strip():
                        opt_texts.append(row[key].strip())

                if not opt_texts and row.get("options"):
                    opt_texts = [o.strip() for o in row["options"].split("|") if o.strip()]

                for opt_i, opt_t in enumerate(opt_texts):
                    is_corr = False
                    if correct_idx is not None and opt_i == correct_idx:
                        is_corr = True
                    elif raw_correct.lower() == opt_t.lower():
                        is_corr = True
                    options.append({
                        "option_text": opt_t,
                        "is_correct": is_corr,
                        "display_order": opt_i,
                    })

            q = await AssignmentRepository.create_question(
                db=db,
                assignment_id=assignment_id,
                question_type=q_type,
                question_text=q_text,
                points=pts,
                display_order=start_order + idx,
                expected_answer=exp_ans,
                options=options if options else None,
            )
            created_questions.append(
                AssignmentQuestionResponse(
                    id=q.id,
                    assignment_id=q.assignment_id,
                    question_type=q.question_type,
                    question_text=q.question_text,
                    points=q.points,
                    display_order=q.display_order,
                    expected_answer=q.expected_answer,
                    options=[
                        QuestionOptionResponse(
                            id=opt.id,
                            question_id=opt.question_id,
                            option_text=opt.option_text,
                            is_correct=opt.is_correct,
                            display_order=opt.display_order,
                        )
                        for opt in q.options
                    ],
                )
            )

        return created_questions

