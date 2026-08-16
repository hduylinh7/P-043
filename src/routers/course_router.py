from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.database import get_db
from src.models.auth import UserResponse
from src.models.course import (
    CourseCreateRequest,
    CourseDetailResponse,
    CourseResponse,
    CourseUpdateRequest,
    EnrolledStudentResponse,
    TimetableEntryResponse,
)
from src.models.material import CourseMaterialResponse
from src.routers.auth_router import get_current_user
from src.services.course_service import CourseService
from src.services.material_service import MaterialService

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.post("", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor creates a new course."""
    return await CourseService.create_course(db, payload, current_user)


@router.put("/{course_id}", response_model=CourseResponse)
async def update_course(
    course_id: str,
    payload: CourseUpdateRequest,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Instructor updates an existing course."""
    return await CourseService.update_course(db, course_id, payload, current_user)


@router.get("/instructor/my-courses", response_model=list[CourseResponse])
async def get_instructor_courses(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch all courses created by current instructor."""
    return await CourseService.get_instructor_courses(db, current_user)


@router.get("/available", response_model=list[CourseResponse])
async def get_available_courses(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch available courses for students to browse and join."""
    return await CourseService.get_available_courses(db, current_user)


@router.get("/student/my-courses", response_model=list[CourseResponse])
async def get_student_courses(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch all courses joined by current student."""
    return await CourseService.get_student_courses(db, current_user)


@router.get("/student/timetable", response_model=list[TimetableEntryResponse])
async def get_student_timetable(
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch official weekly timetable entries for student's enrolled courses."""
    return await CourseService.get_student_timetable(db, current_user)


@router.post("/{course_id}/join", response_model=CourseResponse)
async def join_course(
    course_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Student joins a course."""
    return await CourseService.join_course(db, course_id, current_user)


@router.delete("/{course_id}/leave")
@router.post("/{course_id}/leave")
async def leave_course(
    course_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Student drops/leaves a course."""
    return await CourseService.leave_course(db, course_id, current_user)


@router.get("/{course_id}", response_model=CourseDetailResponse)
async def get_course_detail(
    course_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch course details and enrolled student roster."""
    return await CourseService.get_course_detail(db, course_id, current_user)


@router.get("/{course_id}/students", response_model=list[EnrolledStudentResponse])
async def get_enrolled_students(
    course_id: str,
    current_user: Annotated[UserResponse, Depends(get_current_user)],
    db: AsyncSession = Depends(get_db),
):
    """Fetch list of enrolled students for a specific course."""
    return await CourseService.get_enrolled_students(db, course_id, current_user)


# --- Course Materials Endpoints ---

@router.post("/{course_id}/materials", response_model=CourseMaterialResponse, status_code=status.HTTP_201_CREATED)
async def upload_course_material(
    course_id: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    title: str = Form(""),
    material_type: str = Form("document"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Upload course learning material (Instructor only)."""
    return await MaterialService.upload_material(
        db=db,
        course_id=course_id,
        file=file,
        title=title,
        material_type=material_type,
        current_user=current_user,
        background_tasks=background_tasks,
    )


@router.get("/{course_id}/materials", response_model=list[CourseMaterialResponse])
async def get_course_materials(
    course_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fetch list of materials for a course (Instructor or Enrolled Student)."""
    return await MaterialService.get_course_materials(db, course_id, current_user)


@router.get("/{course_id}/materials/{material_id}/download")
async def download_course_material(
    course_id: str,
    material_id: str,
    inline: bool = False,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download or stream material file for a course (Instructor or Enrolled Student)."""
    return await MaterialService.download_material(
        db, course_id, material_id, current_user, inline=inline
    )


@router.get("/{course_id}/materials/{material_id}/content")
async def get_course_material_content(
    course_id: str,
    material_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Extract and return text content of material."""
    return await MaterialService.get_material_content(
        db, course_id, material_id, current_user
    )



@router.delete("/{course_id}/materials/{material_id}")
async def delete_course_material(
    course_id: str,
    material_id: str,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a course material (Instructor only)."""
    return await MaterialService.delete_material(db, course_id, material_id, current_user)

