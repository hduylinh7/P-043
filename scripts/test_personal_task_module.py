import asyncio
import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from src.db.base import Base
from src.db.database import init_db
from src.models.auth import UserResponse
from src.models.personal_task import (
    PersonalTaskCreateRequest,
    PersonalTaskStatusUpdateRequest,
    PersonalTaskUpdateRequest,
)
from src.services.personal_task_service import PersonalTaskService
from fastapi import HTTPException


async def run_personal_task_tests():
    db_url = "sqlite+aiosqlite:///./data/test_personal_tasks.db"
    engine = create_async_engine(db_url, echo=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    student_user = UserResponse(
        id="student_100",
        email="student_alice@vinuni.edu.vn",
        full_name="Alice Student",
        roles=["student"],
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    other_student_user = UserResponse(
        id="student_200",
        email="student_bob@vinuni.edu.vn",
        full_name="Bob Student",
        roles=["student"],
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    instructor_user = UserResponse(
        id="instructor_99",
        email="prof_dr@vinuni.edu.vn",
        full_name="Prof Dr. Smith",
        roles=["instructor"],
        is_active=True,
        created_at=datetime.now(timezone.utc),
    )

    async with session_factory() as session:
        print("=== TEST 1: Student creates personal tasks ===")
        task1_req = PersonalTaskCreateRequest(
            title="Prepare TOEIC 750+",
            description="Practice 200 listening questions and 100 reading passages",
            category="STUDY",
            priority="HIGH",
            status="NOT_STARTED",
            estimated_hours=15.0,
            due_date=(datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
        )
        task1 = await PersonalTaskService.create_personal_task(session, task1_req, student_user)
        print(f"[OK] Created Task 1: {task1.title} (Category: {task1.category}, Priority: {task1.priority})")

        task2_req = PersonalTaskCreateRequest(
            title="Update CV and Portfolio",
            description="Add latest AI project details to GitHub and LinkedIn",
            category="CAREER",
            priority="CRITICAL",
            status="IN_PROGRESS",
            estimated_hours=5.0,
            due_date=(datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        )
        task2 = await PersonalTaskService.create_personal_task(session, task2_req, student_user)
        print(f"[OK] Created Task 2: {task2.title} (Category: {task2.category}, Priority: {task2.priority})")

        task3_req = PersonalTaskCreateRequest(
            title="Gym Workout Session",
            description="Leg day workout routine",
            category="HEALTH",
            priority="LOW",
            status="NOT_STARTED",
            estimated_hours=1.5,
            due_date=(datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
        )
        task3 = await PersonalTaskService.create_personal_task(session, task3_req, student_user)
        print(f"[OK] Created Task 3: {task3.title} (Category: {task3.category}, Priority: {task3.priority})")

        print("\n=== TEST 2: List personal tasks with filters and sorting ===")
        all_tasks = await PersonalTaskService.get_personal_tasks(session, student_user)
        print(f"[OK] Student total personal tasks count: {len(all_tasks)}")
        assert len(all_tasks) == 3

        # Filter by category STUDY
        study_tasks = await PersonalTaskService.get_personal_tasks(session, student_user, category_filter="STUDY")
        print(f"[OK] STUDY tasks count: {len(study_tasks)}")
        assert len(study_tasks) == 1
        assert study_tasks[0].id == task1.id

        # Filter by status IN_PROGRESS
        in_progress_tasks = await PersonalTaskService.get_personal_tasks(session, student_user, status_filter="IN_PROGRESS")
        print(f"[OK] IN_PROGRESS tasks count: {len(in_progress_tasks)}")
        assert len(in_progress_tasks) == 1
        assert in_progress_tasks[0].id == task2.id

        # Sort by priority
        sorted_by_priority = await PersonalTaskService.get_personal_tasks(session, student_user, sort_by="priority")
        print(f"[OK] Sorted by priority top task: {sorted_by_priority[0].title} ({sorted_by_priority[0].priority})")
        assert sorted_by_priority[0].priority == "CRITICAL"

        print("\n=== TEST 3: Update task detail & status ===")
        update_req = PersonalTaskUpdateRequest(
            title="Prepare TOEIC 800+ (Updated Target)",
            estimated_hours=20.0,
        )
        updated_task1 = await PersonalTaskService.update_personal_task(session, task1.id, update_req, student_user)
        print(f"[OK] Updated Task 1 Title: {updated_task1.title}, Hours: {updated_task1.estimated_hours}")
        assert updated_task1.title == "Prepare TOEIC 800+ (Updated Target)"

        status_req = PersonalTaskStatusUpdateRequest(status="COMPLETED")
        completed_task1 = await PersonalTaskService.update_personal_task_status(session, task1.id, status_req, student_user)
        print(f"[OK] Updated Task 1 status to: {completed_task1.status}")
        assert completed_task1.status == "COMPLETED"

        print("\n=== TEST 4: Instructor access rejection (403 Forbidden) ===")
        try:
            await PersonalTaskService.get_personal_tasks(session, instructor_user)
            assert False, "Instructor should not be allowed to access Personal Tasks"
        except HTTPException as exc:
            print(f"[OK] Instructor correctly rejected with HTTP {exc.status_code}")
            assert exc.status_code == 403

        print("\n=== TEST 5: Non-owner student access rejection (404 Not Found) ===")
        try:
            await PersonalTaskService.get_personal_task_detail(session, task1.id, other_student_user)
            assert False, "Student Bob should not be allowed to view Student Alice's task"
        except HTTPException as exc:
            print(f"[OK] Non-owner correctly rejected with HTTP {exc.status_code}")
            assert exc.status_code == 404

        print("\n=== TEST 6: Student deletes personal task ===")
        await PersonalTaskService.delete_personal_task(session, task3.id, student_user)
        print("[OK] Task deleted successfully")

        remaining = await PersonalTaskService.get_personal_tasks(session, student_user)
        print(f"[OK] Remaining tasks count: {len(remaining)}")
        assert len(remaining) == 2

    await engine.dispose()
    if os.path.exists("./data/test_personal_tasks.db"):
        os.remove("./data/test_personal_tasks.db")

    print("\nALL PERSONAL TASK MODULE TESTS PASSED SUCCESSFULLY!")


if __name__ == "__main__":
    asyncio.run(run_personal_task_tests())
