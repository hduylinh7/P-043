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
    AssignmentResponse,
    AssignmentUpdateRequest,
    ChecklistCreateRequest,
    ChecklistReorderRequest,
    ChecklistResponse,
    ChecklistUpdateRequest,
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
            due_date=payload.due_date,
            estimated_hours=payload.estimated_hours,
            status=payload.status,
            priority=payload.priority,
            created_by=current_user.id,
        )

        return AssignmentResponse(
            id=assignment.id,
            course_id=assignment.course_id,
            title=assignment.title,
            description=assignment.description,
            due_date=assignment.due_at,
            estimated_hours=assignment.estimated_hours,
            status=assignment.status,
            priority=assignment.priority,
            attachment_file_name=assignment.attachment_file_name,
            attachment_file_url=assignment.attachment_file_url,
            created_by=assignment.created_by,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
        )

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
            assignments = await AssignmentRepository.get_assignments_by_course(db, course_id)
            results = []
            for a in assignments:
                checklists = await AssignmentRepository.get_checklists_by_assignment(db, a.id)
                results.append(
                    AssignmentResponse(
                        id=a.id,
                        course_id=a.course_id,
                        title=a.title,
                        description=a.description,
                        due_date=a.due_at,
                        estimated_hours=a.estimated_hours,
                        status=a.status,
                        priority=a.priority,
                        attachment_file_name=a.attachment_file_name,
                        attachment_file_url=a.attachment_file_url,
                        created_by=a.created_by,
                        created_at=a.created_at,
                        updated_at=a.updated_at,
                        checklist_count=len(checklists),
                        checklists=[
                            ChecklistResponse(
                                id=c.id,
                                assignment_id=c.assignment_id,
                                title=c.title,
                                description=c.description,
                                display_order=c.display_order,
                                created_at=c.created_at,
                                completed=False,
                            )
                            for c in checklists
                        ],
                    )
                )
            return results
        else:
            items = await AssignmentRepository.get_assignments_by_course_with_student_progress(
                db, course_id=course_id, student_id=current_user.id
            )
            results = []
            for item in items:
                a = item["assignment"]
                checklists_data = item["checklists"]
                results.append(
                    AssignmentResponse(
                        id=a.id,
                        course_id=a.course_id,
                        title=a.title,
                        description=a.description,
                        due_date=a.due_at,
                        estimated_hours=a.estimated_hours,
                        status=a.status,
                        priority=a.priority,
                        attachment_file_name=a.attachment_file_name,
                        attachment_file_url=a.attachment_file_url,
                        created_by=a.created_by,
                        created_at=a.created_at,
                        updated_at=a.updated_at,
                        progress_status=item["progress_status"],
                        checklist_count=item["checklist_count"],
                        completed_checklist_count=item["completed_checklist_count"],
                        progress_percentage=item["progress_percentage"],
                        checklists=[
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
                            for c in checklists_data
                        ],
                    )
                )
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

        checklists_data = await AssignmentRepository.get_checklists_by_assignment_with_student_progress(
            db, assignment_id=assignment_id, student_id=current_user.id
        )
        total_chk = len(checklists_data)
        completed_chk = sum(1 for c in checklists_data if c["completed"])
        prog_pct = round((completed_chk / total_chk) * 100) if total_chk > 0 else 0

        progress_record = await AssignmentRepository.get_student_progress(
            db, assignment_id=assignment_id, student_id=current_user.id
        )

        return AssignmentResponse(
            id=assignment.id,
            course_id=assignment.course_id,
            title=assignment.title,
            description=assignment.description,
            due_date=assignment.due_at,
            estimated_hours=assignment.estimated_hours,
            status=assignment.status,
            priority=assignment.priority,
            attachment_file_name=assignment.attachment_file_name,
            attachment_file_url=assignment.attachment_file_url,
            created_by=assignment.created_by,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
            progress_status=progress_record.progress_status if progress_record else "NOT_STARTED",
            checklist_count=total_chk,
            completed_checklist_count=completed_chk,
            progress_percentage=prog_pct,
            checklists=[
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
                for c in checklists_data
            ],
        )

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
            due_date=payload.due_date,
            estimated_hours=payload.estimated_hours,
            status=payload.status,
            priority=payload.priority,
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

        submission = await AssignmentRepository.upsert_submission(
            db=db,
            assignment_id=assignment_id,
            student_id=current_user.id,
            file_name=file_name,
            file_url=None,
            object_key=object_key,
            submission_text=submission_text,
        )

        if file_name:
            submission.file_url = f"/api/v1/submissions/{submission.id}/download"
            db.add(submission)
            await db.commit()

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
            status=submission.status,
            score=submission.score,
            grade=submission.grade,
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
            status=sub.status,
            score=sub.score,
            grade=sub.grade,
        )

    @staticmethod
    async def get_assignment_submissions(
        db: AsyncSession,
        assignment_id: str,
        current_user: UserResponse,
    ) -> list[SubmissionResponse]:
        """Instructor views all submissions for an assignment."""
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

        subs = await AssignmentRepository.get_all_submissions_for_assignment(db, assignment_id)
        return [
            SubmissionResponse(
                id=s.id,
                assignment_id=s.assignment_id,
                student_id=s.student_id,
                student_name=s.student.full_name if s.student else "Sinh viên",
                student_email=s.student.email if s.student else "",
                file_name=s.file_name,
                file_url=s.file_url,
                has_file=bool(s.object_key),
                submission_text=s.submission_text,
                submitted_at=s.submitted_at,
                status=s.status,
                score=s.score,
                grade=s.grade,
            )
            for s in subs
        ]

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
