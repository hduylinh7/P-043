from datetime import datetime, UTC
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.enums import EnrollmentRoleEnum, ProgressStatusEnum, SubmissionStatusEnum
from src.db.models.identity.user import User
from src.db.models.learning.assignment import Assignment
from src.db.models.learning.assignment_checklist import AssignmentChecklist
from src.db.models.learning.enrollment import Enrollment
from src.db.models.learning.question import AssignmentQuestion, QuestionOption
from src.db.models.learning.student_assignment_progress import StudentAssignmentProgress
from src.db.models.learning.student_checklist_progress import StudentChecklistProgress
from src.db.models.learning.submission import Submission


class AssignmentRepository:
    @staticmethod
    def parse_datetime(val: datetime | str | None) -> datetime | None:
        if val is None:
            return None
        if isinstance(val, datetime):
            return val
        if isinstance(val, str):
            val_clean = val.rstrip("Z")
            try:
                return datetime.fromisoformat(val_clean)
            except ValueError:
                return None
        return None

    @classmethod
    async def create_assignment(
        cls,
        db: AsyncSession,
        course_id: str,
        title: str,
        description: str | None = None,
        available_from: datetime | str | None = None,
        due_date: datetime | str | None = None,
        estimated_hours: float | None = None,
        status: str = "DRAFT",
        priority: str = "MEDIUM",
        attachment_file_name: str | None = None,
        attachment_file_url: str | None = None,
        attachment_object_key: str | None = None,
        created_by: str | None = None,
    ) -> Assignment:
        """Create and persist a new Assignment."""
        due_dt = cls.parse_datetime(due_date)
        available_dt = cls.parse_datetime(available_from)
        assignment = Assignment(
            course_id=course_id,
            title=title.strip(),
            description=description.strip() if description else None,
            available_from=available_dt,
            due_at=due_dt,
            estimated_hours=estimated_hours,
            status=status.strip().upper() if status else "DRAFT",
            priority=priority.strip().upper() if priority else "MEDIUM",
            attachment_file_name=attachment_file_name,
            attachment_file_url=attachment_file_url,
            attachment_object_key=attachment_object_key,
            created_by=created_by,
        )
        db.add(assignment)
        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def get_by_id(db: AsyncSession, assignment_id: str) -> Assignment | None:
        """Fetch assignment by ID with course, checklists, and questions loaded."""
        stmt = (
            select(Assignment)
            .options(
                selectinload(Assignment.course),
                selectinload(Assignment.checklists),
                selectinload(Assignment.questions).selectinload(AssignmentQuestion.options),
            )
            .where(Assignment.id == assignment_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_assignments_by_course(
        db: AsyncSession, course_id: str, include_drafts: bool = True
    ) -> list[Assignment]:
        """Fetch all assignments for a course ordered by creation date."""
        stmt = (
            select(Assignment)
            .options(
                selectinload(Assignment.checklists),
                selectinload(Assignment.questions).selectinload(AssignmentQuestion.options),
            )
            .where(Assignment.course_id == course_id)
        )
        if not include_drafts:
            stmt = stmt.where(Assignment.status != "DRAFT")
        stmt = stmt.order_by(Assignment.created_at.desc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_assignments_by_course_with_student_progress(
        db: AsyncSession, course_id: str, student_id: str
    ) -> list[dict]:
        """Fetch assignments for a course with current student's progress and checklists (hides DRAFTs)."""
        stmt = (
            select(Assignment)
            .options(
                selectinload(Assignment.checklists),
                selectinload(Assignment.questions).selectinload(AssignmentQuestion.options),
            )
            .where((Assignment.course_id == course_id) & (Assignment.status != "DRAFT"))
            .order_by(Assignment.created_at.desc())
        )
        result = await db.execute(stmt)
        assignments = list(result.scalars().all())

        items = []
        for assignment in assignments:
            checklists_with_progress = await AssignmentRepository.get_checklists_by_assignment_with_student_progress(
                db, assignment_id=assignment.id, student_id=student_id
            )

            total_checklists = len(checklists_with_progress)
            completed_checklists = sum(1 for c in checklists_with_progress if c["completed"])
            progress_pct = (
                round((completed_checklists / total_checklists) * 100) if total_checklists > 0 else 0
            )

            sub_stmt = select(Submission).where(
                (Submission.assignment_id == assignment.id)
                & (Submission.student_id == student_id)
            )
            sub_res = await db.execute(sub_stmt)
            sub_obj = sub_res.scalar_one_or_none()

            prog_stmt = select(StudentAssignmentProgress.progress_status).where(
                (StudentAssignmentProgress.assignment_id == assignment.id)
                & (StudentAssignmentProgress.student_id == student_id)
            )
            prog_res = await db.execute(prog_stmt)
            prog_val = prog_res.scalar_one_or_none()

            if sub_obj and sub_obj.status in (SubmissionStatusEnum.SUBMITTED, SubmissionStatusEnum.GRADED, "SUBMITTED", "GRADED"):
                status_val = "COMPLETED"
            elif prog_val:
                status_val = str(prog_val.value) if hasattr(prog_val, "value") else str(prog_val)
            else:
                status_val = "NOT_STARTED"

            items.append({
                "assignment": assignment,
                "progress_status": status_val,
                "checklist_count": total_checklists,
                "completed_checklist_count": completed_checklists,
                "progress_percentage": progress_pct,
                "checklists": checklists_with_progress,
            })
        return items

    @classmethod
    async def update_assignment(
        cls,
        db: AsyncSession,
        assignment: Assignment,
        title: str | None = None,
        description: str | None = None,
        available_from: datetime | str | None = None,
        due_date: datetime | str | None = None,
        estimated_hours: float | None = None,
        status: str | None = None,
        priority: str | None = None,
        attachment_file_name: str | None = None,
        attachment_file_url: str | None = None,
        attachment_object_key: str | None = None,
    ) -> Assignment:
        """Update fields of an assignment."""
        if title is not None:
            assignment.title = title.strip()
        if description is not None:
            assignment.description = description.strip() if description else None
        if available_from is not None:
            assignment.available_from = cls.parse_datetime(available_from)
        if due_date is not None:
            assignment.due_at = cls.parse_datetime(due_date)
        if estimated_hours is not None:
            assignment.estimated_hours = estimated_hours
        if status is not None:
            assignment.status = status.strip().upper()
        if priority is not None:
            assignment.priority = priority.strip().upper()
        if attachment_file_name is not None:
            assignment.attachment_file_name = attachment_file_name
        if attachment_file_url is not None:
            assignment.attachment_file_url = attachment_file_url
        if attachment_object_key is not None:
            assignment.attachment_object_key = attachment_object_key

        db.add(assignment)
        await db.commit()
        await db.refresh(assignment)
        return assignment

    @staticmethod
    async def delete_assignment(db: AsyncSession, assignment: Assignment) -> None:
        """Delete assignment from database."""
        await db.delete(assignment)
        await db.commit()

    @staticmethod
    async def get_student_progress(
        db: AsyncSession, assignment_id: str, student_id: str
    ) -> StudentAssignmentProgress | None:
        """Fetch student progress record for an assignment."""
        stmt = select(StudentAssignmentProgress).where(
            (StudentAssignmentProgress.assignment_id == assignment_id)
            & (StudentAssignmentProgress.student_id == student_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def upsert_student_progress(
        db: AsyncSession, assignment_id: str, student_id: str, progress_status: str
    ) -> StudentAssignmentProgress:
        """Create or update progress status for a student."""
        stmt = select(StudentAssignmentProgress).where(
            (StudentAssignmentProgress.assignment_id == assignment_id)
            & (StudentAssignmentProgress.student_id == student_id)
        )
        result = await db.execute(stmt)
        progress = result.scalar_one_or_none()

        clean_status = progress_status.strip().upper()
        if not progress:
            progress = StudentAssignmentProgress(
                assignment_id=assignment_id,
                student_id=student_id,
                progress_status=clean_status,
            )
            db.add(progress)
        else:
            progress.progress_status = clean_status
            db.add(progress)

        await db.commit()
        await db.refresh(progress)
        return progress

    # --- Checklist Operations ---

    @staticmethod
    async def create_checklist(
        db: AsyncSession,
        assignment_id: str,
        title: str,
        description: str | None = None,
        display_order: int = 0,
    ) -> AssignmentChecklist:
        """Create a new checklist item for an assignment."""
        checklist = AssignmentChecklist(
            assignment_id=assignment_id,
            title=title.strip(),
            description=description.strip() if description else None,
            display_order=display_order,
        )
        db.add(checklist)
        await db.commit()
        await db.refresh(checklist)
        return checklist

    @staticmethod
    async def get_checklist_by_id(db: AsyncSession, checklist_id: str) -> AssignmentChecklist | None:
        """Fetch checklist item by ID with assignment and course relationships."""
        stmt = (
            select(AssignmentChecklist)
            .options(
                selectinload(AssignmentChecklist.assignment).selectinload(Assignment.course)
            )
            .where(AssignmentChecklist.id == checklist_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_checklists_by_assignment(
        db: AsyncSession, assignment_id: str
    ) -> list[AssignmentChecklist]:
        """Fetch all checklist items for an assignment ordered by display_order."""
        stmt = (
            select(AssignmentChecklist)
            .where(AssignmentChecklist.assignment_id == assignment_id)
            .order_by(AssignmentChecklist.display_order.asc(), AssignmentChecklist.created_at.asc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_checklists_by_assignment_with_student_progress(
        db: AsyncSession, assignment_id: str, student_id: str
    ) -> list[dict]:
        """Fetch checklist items for an assignment along with student's completion status."""
        stmt = (
            select(AssignmentChecklist, StudentChecklistProgress.completed, StudentChecklistProgress.completed_at)
            .outerjoin(
                StudentChecklistProgress,
                (StudentChecklistProgress.checklist_id == AssignmentChecklist.id)
                & (StudentChecklistProgress.student_id == student_id),
            )
            .where(AssignmentChecklist.assignment_id == assignment_id)
            .order_by(AssignmentChecklist.display_order.asc(), AssignmentChecklist.created_at.asc())
        )
        result = await db.execute(stmt)
        rows = result.all()

        items = []
        for checklist, completed, completed_at in rows:
            items.append({
                "id": checklist.id,
                "assignment_id": checklist.assignment_id,
                "title": checklist.title,
                "description": checklist.description,
                "display_order": checklist.display_order,
                "created_at": checklist.created_at,
                "completed": bool(completed),
                "completed_at": completed_at,
            })
        return items

    @staticmethod
    async def update_checklist(
        db: AsyncSession,
        checklist: AssignmentChecklist,
        title: str | None = None,
        description: str | None = None,
        display_order: int | None = None,
    ) -> AssignmentChecklist:
        """Update a checklist item."""
        if title is not None:
            checklist.title = title.strip()
        if description is not None:
            checklist.description = description.strip() if description else None
        if display_order is not None:
            checklist.display_order = display_order

        db.add(checklist)
        await db.commit()
        await db.refresh(checklist)
        return checklist

    @staticmethod
    async def delete_checklist(db: AsyncSession, checklist: AssignmentChecklist) -> None:
        """Delete a checklist item."""
        await db.delete(checklist)
        await db.commit()

    @staticmethod
    async def reorder_checklists(db: AsyncSession, items: list[dict]) -> None:
        """Update display_order for multiple checklist items."""
        for item in items:
            stmt = select(AssignmentChecklist).where(AssignmentChecklist.id == item["id"])
            res = await db.execute(stmt)
            chk = res.scalar_one_or_none()
            if chk:
                chk.display_order = item["display_order"]
                db.add(chk)
        await db.commit()

    @staticmethod
    async def set_student_checklist_progress(
        db: AsyncSession, checklist_id: str, student_id: str, completed: bool
    ) -> StudentChecklistProgress:
        """Set completion status of a checklist item for a student."""
        stmt = select(StudentChecklistProgress).where(
            (StudentChecklistProgress.checklist_id == checklist_id)
            & (StudentChecklistProgress.student_id == student_id)
        )
        result = await db.execute(stmt)
        record = result.scalar_one_or_none()

        now_dt = datetime.now(UTC) if completed else None
        if not record:
            record = StudentChecklistProgress(
                checklist_id=checklist_id,
                student_id=student_id,
                completed=completed,
                completed_at=now_dt,
            )
            db.add(record)
        else:
            record.completed = completed
            record.completed_at = now_dt
            db.add(record)

        await db.commit()
        await db.refresh(record)
        return record

    # --- Student Submission Operations ---

    @staticmethod
    async def upsert_submission(
        db: AsyncSession,
        assignment_id: str,
        student_id: str,
        file_name: str | None = None,
        file_url: str | None = None,
        object_key: str | None = None,
        submission_text: str | None = None,
    ) -> Submission:
        """Create or update a student's submission for an assignment."""
        stmt = select(Submission).where(
            (Submission.assignment_id == assignment_id)
            & (Submission.student_id == student_id)
        )
        result = await db.execute(stmt)
        sub = result.scalar_one_or_none()

        now_dt = datetime.now(UTC)
        if not sub:
            sub = Submission(
                assignment_id=assignment_id,
                student_id=student_id,
                file_name=file_name,
                file_url=file_url,
                object_key=object_key,
                submission_text=submission_text,
                submitted_at=now_dt,
                status=SubmissionStatusEnum.SUBMITTED,
            )
            db.add(sub)
        else:
            if sub.status in (SubmissionStatusEnum.SUBMITTED, SubmissionStatusEnum.GRADED):
                raise ValueError("BÀI_NỘP_ĐÃ_KHÓA: Vui lòng bấm 'Hủy Nộp Bài' (Undo Turn In) trước khi chỉnh sửa.")

            if file_name:
                sub.file_name = file_name
            if file_url:
                sub.file_url = file_url
            if object_key:
                sub.object_key = object_key
            if submission_text is not None:
                sub.submission_text = submission_text
            sub.submitted_at = now_dt
            sub.status = SubmissionStatusEnum.SUBMITTED
            db.add(sub)

        # Upsert StudentAssignmentProgress to COMPLETED
        prog_stmt = select(StudentAssignmentProgress).where(
            (StudentAssignmentProgress.assignment_id == assignment_id)
            & (StudentAssignmentProgress.student_id == student_id)
        )
        prog_res = await db.execute(prog_stmt)
        prog_obj = prog_res.scalar_one_or_none()
        if not prog_obj:
            prog_obj = StudentAssignmentProgress(
                assignment_id=assignment_id,
                student_id=student_id,
                progress_status=ProgressStatusEnum.COMPLETED,
            )
            db.add(prog_obj)
        else:
            prog_obj.progress_status = ProgressStatusEnum.COMPLETED
            db.add(prog_obj)

        await db.commit()
        await db.refresh(sub)
        return sub

    @staticmethod
    async def undo_turn_in_submission(
        db: AsyncSession, assignment_id: str, student_id: str
    ) -> Submission | None:
        """Undo a student's submission, unlocking it for editing."""
        stmt = select(Submission).where(
            (Submission.assignment_id == assignment_id)
            & (Submission.student_id == student_id)
        )
        result = await db.execute(stmt)
        sub = result.scalar_one_or_none()
        if not sub:
            return None

        if sub.status == SubmissionStatusEnum.SUBMITTED:
            sub.status = SubmissionStatusEnum.UNSUBMITTED
            db.add(sub)

            prog_stmt = select(StudentAssignmentProgress).where(
                (StudentAssignmentProgress.assignment_id == assignment_id)
                & (StudentAssignmentProgress.student_id == student_id)
            )
            prog_res = await db.execute(prog_stmt)
            prog_obj = prog_res.scalar_one_or_none()
            if prog_obj:
                prog_obj.progress_status = ProgressStatusEnum.IN_PROGRESS
                db.add(prog_obj)

            await db.commit()
            await db.refresh(sub)
        return sub

    @staticmethod
    async def get_student_submission(
        db: AsyncSession, assignment_id: str, student_id: str
    ) -> Submission | None:
        """Fetch a specific student's submission for an assignment."""
        stmt = (
            select(Submission)
            .options(
                selectinload(Submission.student),
                selectinload(Submission.assignment).selectinload(Assignment.course),
            )
            .where(
                (Submission.assignment_id == assignment_id)
                & (Submission.student_id == student_id)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_all_submissions_for_assignment(
        db: AsyncSession, assignment_id: str
    ) -> list[Submission]:
        """Fetch all submissions for an assignment with student details."""
        stmt = (
            select(Submission)
            .options(
                selectinload(Submission.student),
                selectinload(Submission.assignment).selectinload(Assignment.course),
            )
            .where(Submission.assignment_id == assignment_id)
            .order_by(Submission.submitted_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_submission_by_id(db: AsyncSession, submission_id: str) -> Submission | None:
        """Fetch submission by primary key ID."""
        stmt = (
            select(Submission)
            .options(
                selectinload(Submission.student),
                selectinload(Submission.assignment).selectinload(Assignment.course),
            )
            .where(Submission.id == submission_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def grade_submission(
        db: AsyncSession,
        submission: Submission,
        score: float,
        grade: str = "GRADED",
        feedback: str | None = None,
    ) -> Submission:
        """Instructor grades a student submission."""
        submission.score = score
        submission.grade = grade
        if feedback is not None:
            submission.feedback = feedback
        db.add(submission)
        await db.commit()
        await db.refresh(submission)
        return submission

    @staticmethod
    async def get_assignment_analytics(db: AsyncSession, assignment_id: str) -> dict:
        """Calculate aggregated progress analytics for an assignment."""
        assignment = await AssignmentRepository.get_by_id(db, assignment_id)
        if not assignment:
            return {
                "assignment_id": assignment_id,
                "total_enrolled_students": 0,
                "average_completion_percentage": 0.0,
                "completed_students_count": 0,
                "in_progress_students_count": 0,
                "not_started_students_count": 0,
            }

        enroll_stmt = (
            select(User.id)
            .join(Enrollment, User.id == Enrollment.user_id)
            .where(
                (Enrollment.course_id == assignment.course_id)
                & (Enrollment.role == EnrollmentRoleEnum.STUDENT)
            )
        )
        enroll_res = await db.execute(enroll_stmt)
        student_ids = enroll_res.scalars().all()
        total_students = len(student_ids)

        if total_students == 0:
            return {
                "assignment_id": assignment_id,
                "total_enrolled_students": 0,
                "average_completion_percentage": 0.0,
                "completed_students_count": 0,
                "in_progress_students_count": 0,
                "not_started_students_count": 0,
            }

        checklists = await AssignmentRepository.get_checklists_by_assignment(db, assignment_id)
        total_checklists = len(checklists)

        completed_count = 0
        in_progress_count = 0
        not_started_count = 0
        total_pct_sum = 0.0

        for st_id in student_ids:
            if total_checklists == 0:
                p_stmt = select(StudentAssignmentProgress.progress_status).where(
                    (StudentAssignmentProgress.assignment_id == assignment_id)
                    & (StudentAssignmentProgress.student_id == st_id)
                )
                p_res = await db.execute(p_stmt)
                st_status = p_res.scalar_one_or_none() or "NOT_STARTED"

                if st_status == "COMPLETED":
                    pct = 100.0
                    completed_count += 1
                elif st_status == "IN_PROGRESS":
                    pct = 50.0
                    in_progress_count += 1
                else:
                    pct = 0.0
                    not_started_count += 1
            else:
                c_stmt = (
                    select(func.count(StudentChecklistProgress.id))
                    .join(AssignmentChecklist, StudentChecklistProgress.checklist_id == AssignmentChecklist.id)
                    .where(
                        (AssignmentChecklist.assignment_id == assignment_id)
                        & (StudentChecklistProgress.student_id == st_id)
                        & (StudentChecklistProgress.completed == True)
                    )
                )
                c_res = await db.execute(c_stmt)
                comp_cnt = c_res.scalar() or 0
                pct = (comp_cnt / total_checklists) * 100.0

                if pct >= 100.0:
                    completed_count += 1
                elif pct > 0:
                    in_progress_count += 1
                else:
                    not_started_count += 1

            total_pct_sum += pct

        avg_pct = round(total_pct_sum / total_students, 1)

        return {
            "assignment_id": assignment_id,
            "total_enrolled_students": total_students,
            "average_completion_percentage": avg_pct,
            "completed_students_count": completed_count,
            "in_progress_students_count": in_progress_count,
            "not_started_students_count": not_started_count,
        }

    # --- Question Repository Methods ---

    @staticmethod
    async def create_question(
        db: AsyncSession,
        assignment_id: str,
        question_type: str,
        question_text: str,
        points: float = 1.0,
        display_order: int = 0,
        expected_answer: str | None = None,
        options: list[dict] | None = None,
    ) -> AssignmentQuestion:
        question = AssignmentQuestion(
            assignment_id=assignment_id,
            question_type=question_type,
            question_text=question_text.strip(),
            points=points,
            display_order=display_order,
            expected_answer=expected_answer.strip() if expected_answer else None,
        )
        db.add(question)
        await db.flush()

        if options and question_type == "MULTIPLE_CHOICE":
            for idx, opt in enumerate(options):
                opt_obj = QuestionOption(
                    question_id=question.id,
                    option_text=opt["option_text"].strip(),
                    is_correct=opt.get("is_correct", False),
                    display_order=opt.get("display_order", idx),
                )
                db.add(opt_obj)

        await db.commit()

        stmt = (
            select(AssignmentQuestion)
            .options(selectinload(AssignmentQuestion.options))
            .where(AssignmentQuestion.id == question.id)
        )
        res = await db.execute(stmt)
        return res.scalar_one()

    @staticmethod
    async def get_question_by_id(db: AsyncSession, question_id: str) -> AssignmentQuestion | None:
        stmt = (
            select(AssignmentQuestion)
            .options(selectinload(AssignmentQuestion.options))
            .where(AssignmentQuestion.id == question_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def update_question(
        db: AsyncSession,
        question: AssignmentQuestion,
        question_type: str | None = None,
        question_text: str | None = None,
        points: float | None = None,
        display_order: int | None = None,
        expected_answer: str | None = None,
        options: list[dict] | None = None,
    ) -> AssignmentQuestion:
        if question_type is not None:
            question.question_type = question_type
        if question_text is not None:
            question.question_text = question_text.strip()
        if points is not None:
            question.points = points
        if display_order is not None:
            question.display_order = display_order
        if expected_answer is not None:
            question.expected_answer = expected_answer.strip() if expected_answer else None

        if options is not None:
            for opt in list(question.options):
                await db.delete(opt)
            await db.flush()

            if (question_type or question.question_type) == "MULTIPLE_CHOICE":
                for idx, opt in enumerate(options):
                    opt_obj = QuestionOption(
                        question_id=question.id,
                        option_text=opt["option_text"].strip(),
                        is_correct=opt.get("is_correct", False),
                        display_order=opt.get("display_order", idx),
                    )
                    db.add(opt_obj)

        db.add(question)
        await db.commit()

        stmt = (
            select(AssignmentQuestion)
            .options(selectinload(AssignmentQuestion.options))
            .where(AssignmentQuestion.id == question.id)
        )
        res = await db.execute(stmt)
        return res.scalar_one()

    @staticmethod
    async def delete_question(db: AsyncSession, question: AssignmentQuestion) -> None:
        await db.delete(question)
        await db.commit()

    @staticmethod
    async def delete_questions_by_assignment(db: AsyncSession, assignment_id: str) -> None:
        stmt = select(AssignmentQuestion).where(AssignmentQuestion.assignment_id == assignment_id)
        res = await db.execute(stmt)
        questions = list(res.scalars().all())
        for q in questions:
            await db.delete(q)
        await db.flush()

    @staticmethod
    async def reorder_questions(db: AsyncSession, items: list[dict]) -> None:
        for item in items:
            stmt = select(AssignmentQuestion).where(AssignmentQuestion.id == item["id"])
            res = await db.execute(stmt)
            q = res.scalar_one_or_none()
            if q:
                q.display_order = item["display_order"]
                db.add(q)
        await db.commit()

