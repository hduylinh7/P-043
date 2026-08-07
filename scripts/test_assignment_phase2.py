import sys
import os
sys.path.insert(0, os.path.abspath("."))
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.base import Base
from src.db.models import Assignment, Course, Enrollment, StudentAssignmentProgress, User
from src.models.assignment import (
    AssignmentCreateRequest,
    ChecklistCreateRequest,
    ChecklistReorderItem,
    ChecklistReorderRequest,
    ChecklistUpdateRequest,
)
from src.models.auth import UserResponse
from src.models.course import CourseCreateRequest
from src.services.assignment_service import AssignmentService
from src.services.course_service import CourseService

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


async def run_phase2_test():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_maker = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        # 1. Create Users
        instructor = User(id="inst_1", email="instructor@test.com", full_name="Instructor One")
        student1 = User(id="stud_1", email="student1@test.com", full_name="Student One")
        student2 = User(id="stud_2", email="student2@test.com", full_name="Student Two")

        session.add_all([instructor, student1, student2])
        await session.commit()

        instructor_user = UserResponse(id="inst_1", email="instructor@test.com", full_name="Instructor One", roles=["instructor"], is_active=True)
        student1_user = UserResponse(id="stud_1", email="student1@test.com", full_name="Student One", roles=["student"], is_active=True)
        student2_user = UserResponse(id="stud_2", email="student2@test.com", full_name="Student Two", roles=["student"], is_active=True)

        # 2. Course Creation
        course_resp = await CourseService.create_course(
            session,
            CourseCreateRequest(name="AI Systems", code="AI401", description="AI Course"),
            instructor_user,
        )
        course_id = course_resp.id
        print("[OK] Course created:", course_id)

        # 3. Students join course
        await CourseService.join_course(session, course_id, student1_user)
        await CourseService.join_course(session, course_id, student2_user)
        print("[OK] Enrolled 2 students into AI401")

        # 4. Instructor creates assignment with HIGH priority
        assignment = await AssignmentService.create_assignment(
            session,
            course_id,
            AssignmentCreateRequest(
                title="RAG Project",
                description="Build RAG pipeline",
                due_date=datetime.now(),
                estimated_hours=12.0,
                priority="HIGH",
                status="ACTIVE",
            ),
            instructor_user,
        )
        print("[OK] Created assignment with Priority:", assignment.priority)
        assert assignment.priority == "HIGH"

        # 5. Instructor adds 3 checklist items
        c1 = await AssignmentService.create_checklist(
            session, assignment.id, ChecklistCreateRequest(title="Item 1: Data Pipeline", display_order=1), instructor_user
        )
        c2 = await AssignmentService.create_checklist(
            session, assignment.id, ChecklistCreateRequest(title="Item 2: Vector DB", display_order=2), instructor_user
        )
        c3 = await AssignmentService.create_checklist(
            session, assignment.id, ChecklistCreateRequest(title="Item 3: LangChain Graph", display_order=3), instructor_user
        )
        print("[OK] Created 3 checklist items for assignment")

        # 6. Instructor reorders checklists
        await AssignmentService.reorder_checklists(
            session,
            ChecklistReorderRequest(items=[
                ChecklistReorderItem(id=c2.id, display_order=1),
                ChecklistReorderItem(id=c1.id, display_order=2),
                ChecklistReorderItem(id=c3.id, display_order=3),
            ]),
            instructor_user,
        )
        print("[OK] Reordered checklist items")

        # 7. Student 1 completes 2 of 3 items (Vector DB and Data Pipeline)
        await AssignmentService.set_checklist_completion(session, c2.id, True, student1_user)
        await AssignmentService.set_checklist_completion(session, c1.id, True, student1_user)

        # Check student 1 assignment detail
        s1_detail = await AssignmentService.get_assignment_detail(session, assignment.id, student1_user)
        print("[OK] Student 1 completion count:", s1_detail.completed_checklist_count, "/", s1_detail.checklist_count)
        print("[OK] Student 1 calculated progress percentage:", s1_detail.progress_percentage, "%")
        assert s1_detail.completed_checklist_count == 2
        assert s1_detail.checklist_count == 3
        assert s1_detail.progress_percentage == 67

        # 8. Student 2 completes all 3 items (100%)
        await AssignmentService.set_checklist_completion(session, c1.id, True, student2_user)
        await AssignmentService.set_checklist_completion(session, c2.id, True, student2_user)
        await AssignmentService.set_checklist_completion(session, c3.id, True, student2_user)

        s2_detail = await AssignmentService.get_assignment_detail(session, assignment.id, student2_user)
        print("[OK] Student 2 calculated progress percentage:", s2_detail.progress_percentage, "%")
        assert s2_detail.progress_percentage == 100

        # 9. Instructor views analytics
        analytics = await AssignmentService.get_assignment_analytics(session, assignment.id, instructor_user)
        print("[OK] Instructor analytics - Enrolled:", analytics.total_enrolled_students)
        print("[OK] Instructor analytics - Average completion %:", analytics.average_completion_percentage)
        print("[OK] Instructor analytics - Completed count:", analytics.completed_students_count)
        print("[OK] Instructor analytics - In-progress count:", analytics.in_progress_students_count)
        assert analytics.total_enrolled_students == 2
        assert analytics.completed_students_count == 1
        assert analytics.in_progress_students_count == 1
        assert analytics.average_completion_percentage == 83.3

    await engine.dispose()
    print("ALL ASSIGNMENT PHASE 2 TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_phase2_test())
