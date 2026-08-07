import sys
import os
sys.path.insert(0, os.path.abspath("."))
import asyncio
from datetime import datetime
from io import BytesIO
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.base import Base
from src.db.models import User
from src.models.assignment import AssignmentCreateRequest
from src.models.auth import UserResponse
from src.models.course import CourseCreateRequest
from src.services.assignment_service import AssignmentService
from src.services.course_service import CourseService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


async def run_attachment_test():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        # 1. Create Users
        instructor = User(id="inst_10", email="prof@test.com", full_name="Professor Smith")
        student = User(id="stud_10", email="alice@test.com", full_name="Alice Student")

        session.add_all([instructor, student])
        await session.commit()

        instructor_user = UserResponse(id="inst_10", email="prof@test.com", full_name="Professor Smith", roles=["instructor"], is_active=True)
        student_user = UserResponse(id="stud_10", email="alice@test.com", full_name="Alice Student", roles=["student"], is_active=True)

        # 2. Course Creation & Student Enrollment
        course_resp = await CourseService.create_course(
            session,
            CourseCreateRequest(name="Machine Learning Lab", code="CS302", description="ML Lab Course"),
            instructor_user,
        )
        course_id = course_resp.id
        await CourseService.join_course(session, course_id, student_user)
        print("[OK] Created course CS302 and enrolled student Alice")

        # 3. Instructor creates assignment
        assignment = await AssignmentService.create_assignment(
            session,
            course_id,
            AssignmentCreateRequest(
                title="Lab 1: SVM Classifier",
                description="Implement Support Vector Machine classifier",
                due_date=datetime.now(),
                estimated_hours=5.0,
                priority="HIGH",
                status="ACTIVE",
            ),
            instructor_user,
        )
        print("[OK] Instructor created assignment Lab 1")

        # 4. Instructor uploads problem specification document
        spec_bytes = b"Problem Specification Document for Lab 1"
        spec_file = UploadFile(filename="lab1_spec.pdf", file=BytesIO(spec_bytes))
        spec_file.headers = {"content-type": "application/pdf"}

        updated_assignment = await AssignmentService.upload_assignment_attachment(
            session, assignment.id, spec_file, instructor_user
        )
        print("[OK] Instructor uploaded attachment:", updated_assignment.attachment_file_name)
        assert updated_assignment.attachment_file_name == "lab1_spec.pdf"
        assert updated_assignment.attachment_file_url is not None

        # 5. Student submits solution file and notes
        sol_bytes = b"Student Solution Python Code for Lab 1"
        sol_file = UploadFile(filename="alice_submission.zip", file=BytesIO(sol_bytes))
        sol_file.headers = {"content-type": "application/zip"}

        submission = await AssignmentService.submit_assignment(
            session, assignment.id, sol_file, "Completed tasks 1 to 4 with 98% accuracy", student_user
        )
        print("[OK] Student submitted solution:", submission.file_name)
        assert submission.file_name == "alice_submission.zip"
        assert submission.status == "submitted"
        assert submission.submission_text == "Completed tasks 1 to 4 with 98% accuracy"

        # 6. Student checks their submission
        my_sub = await AssignmentService.get_my_submission(session, assignment.id, student_user)
        print("[OK] Student retrieved submission details:", my_sub.student_name, my_sub.file_name)
        assert my_sub is not None
        assert my_sub.file_name == "alice_submission.zip"

        # 8. Test downloading assignment attachment & student submission file
        attachment_stream = await AssignmentService.download_assignment_attachment(session, assignment.id, student_user)
        attachment_chunks = [chunk async for chunk in attachment_stream.body_iterator]
        attachment_body = b"".join(attachment_chunks)
        print("[OK] Downloaded assignment attachment bytes length:", len(attachment_body))
        assert attachment_body == b"Problem Specification Document for Lab 1"

        submission_stream = await AssignmentService.download_submission_file(session, submission.id, instructor_user)
        submission_chunks = [chunk async for chunk in submission_stream.body_iterator]
        submission_body = b"".join(submission_chunks)
        print("[OK] Downloaded student submission file bytes length:", len(submission_body))
        assert submission_body == b"Student Solution Python Code for Lab 1"

    await engine.dispose()
    print("ALL ASSIGNMENT FILE ATTACHMENTS & SUBMISSIONS TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_attachment_test())
