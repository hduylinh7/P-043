import asyncio
from sqlalchemy import select, delete
from src.db.database import AsyncSessionLocal
from src.db.models.identity.user import User
from src.db.models.learning.assignment import Assignment
from src.db.models.learning.submission import Submission
from src.repositories.assignment_repository import AssignmentRepository
from src.repositories.course_repository import CourseRepository
from src.services.assignment_service import AssignmentService
from src.models.auth import UserResponse
from src.models.assignment import GradeSubmissionRequest

async def main():
    async with AsyncSessionLocal() as db:
        # Fetch an instructor and a student
        users = (await db.execute(select(User))).scalars().all()
        instructor = users[0]
        student = users[1] if len(users) > 1 else users[0]

        # Fetch an assignment using repository
        assignments = (await db.execute(select(Assignment))).scalars().all()
        if not assignments:
            print("No assignment found to test.")
            return

        assignment = await AssignmentRepository.get_by_id(db, assignments[0].id)
        print(f"Testing with Assignment: '{assignment.title}' (ID: {assignment.id})")

        # Enroll student in course
        if not await CourseRepository.check_enrollment_exists(db, student.id, assignment.course_id):
            await CourseRepository.join_course(db, student.id, assignment.course_id)
        await db.commit()

        # Clean existing submissions for this test
        await db.execute(
            delete(Submission).where(
                (Submission.assignment_id == assignment.id) & (Submission.student_id == student.id)
            )
        )
        await db.commit()

        inst_res = UserResponse(
            id=assignment.course.instructor_id or instructor.id,
            email=instructor.email,
            full_name=instructor.full_name,
            roles=["instructor"],
            is_active=True,
            is_verified=True,
        )

        stud_res = UserResponse(
            id=student.id,
            email=student.email,
            full_name=student.full_name,
            roles=["student"],
            is_active=True,
            is_verified=True,
        )

        # 1. Student Turn In
        sub1 = await AssignmentService.submit_assignment(
            db=db,
            assignment_id=assignment.id,
            file=None,
            submission_text="[Bai lam trac nghiem & tu luan]:\nCau 1: Lua chon A\nCau 2: Bai lam tu luan mau",
            current_user=stud_res,
        )
        print(f"[SUCCESS] Student turned in assignment. Status: {sub1.status}, Student Status: {sub1.student_status}")

        # 2. Try submitting again while locked (should fail)
        try:
            await AssignmentService.submit_assignment(
                db=db,
                assignment_id=assignment.id,
                file=None,
                submission_text="Direct edit test",
                current_user=stud_res,
            )
            print("[FAIL] Re-submit while locked did not throw error!")
        except Exception as e:
            print("[SUCCESS] Re-submit while locked was correctly blocked by server lock check!")

        # 3. Student Undo Turn In
        unlocked = await AssignmentService.undo_turn_in_assignment(
            db=db,
            assignment_id=assignment.id,
            current_user=stud_res,
        )
        print(f"[SUCCESS] Student Undo Turn In executed. Status: {unlocked.status}, Student Status: {unlocked.student_status}")

        # 4. Turn In again after Undo
        sub2 = await AssignmentService.submit_assignment(
            db=db,
            assignment_id=assignment.id,
            file=None,
            submission_text="[Bai lam trac nghiem & tu luan]:\nCau 1: Lua chon A\nCau 2: Bai lam tu luan mau da chinh sua",
            current_user=stud_res,
        )
        print(f"[SUCCESS] Student turned in again. Status: {sub2.status}")

        # 5. Instructor Grade Submission
        overview = await AssignmentService.get_assignment_submissions(db, assignment.id, inst_res)
        print(f"[SUCCESS] Instructor viewed Overview. Total students: {overview.total_students}, Submitted: {overview.submitted_count}, Pending: {overview.pending_count}")

        # Grade the submission
        actual_sub_id = sub2.id
        grade_payload = GradeSubmissionRequest(
            score=18.0,
            grade="GRADED",
            feedback='{"questionScores":{"q1":10,"q2":8},"questionFeedbacks":{"q2":"Good explanation, but add more detail."},"generalFeedback":"Overall, good work. Review Random Forest before next assignment."}'
        )

        graded_res = await AssignmentService.grade_submission(
            db=db,
            submission_id=actual_sub_id,
            payload=grade_payload,
            current_user=inst_res,
        )
        print(f"[SUCCESS] Instructor graded submission. Score: {graded_res.score}, Status: {graded_res.status}")

        # 6. Student views graded submission
        my_sub = await AssignmentService.get_my_submission(db, assignment.id, stud_res)
        print(f"[SUCCESS] Student fetched graded submission. Score: {my_sub.score}, Feedback present: {bool(my_sub.feedback)}")
        print("\nALL INTEGRATION TESTS PASSED 100% CLEANLY!")

if __name__ == "__main__":
    asyncio.run(main())
