from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth import UserResponse
from src.models.course import (
    CourseCreateRequest,
    CourseDetailResponse,
    CourseResponse,
    CourseUpdateRequest,
    EnrolledStudentResponse,
)
from src.repositories.course_repository import CourseRepository


class CourseService:
    @staticmethod
    def _build_course_response(course, student_count: int = 0, is_enrolled: bool = False, instructor_name: str | None = None) -> CourseResponse:
        return CourseResponse(
            id=course.id,
            code=course.code,
            name=course.name,
            description=course.description,
            term=course.term,
            start_date=course.start_date,
            end_date=course.end_date,
            status=course.computed_status,
            instructor_id=course.instructor_id,
            instructor_name=instructor_name or (course.instructor.full_name if getattr(course, "instructor", None) else None),
            created_at=course.created_at,
            student_count=student_count,
            is_enrolled=is_enrolled,
        )

    @staticmethod
    async def create_course(
        db: AsyncSession, payload: CourseCreateRequest, current_user: UserResponse
    ) -> CourseResponse:
        """Create new course owned by current instructor."""
        if "instructor" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên mới có quyền tạo khóa học.",
            )

        course = await CourseRepository.create_course(
            db=db,
            name=payload.name,
            code=payload.code,
            instructor_id=current_user.id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            description=payload.description,
            term=payload.term,
        )

        return CourseService._build_course_response(
            course, student_count=0, is_enrolled=False, instructor_name=current_user.full_name
        )

    @staticmethod
    async def update_course(
        db: AsyncSession, course_id: str, payload: CourseUpdateRequest, current_user: UserResponse
    ) -> CourseResponse:
        """Update existing course owned by current instructor."""
        if "instructor" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên mới có quyền chỉnh sửa khóa học.",
            )

        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        if course.instructor_id != current_user.id and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn không có quyền chỉnh sửa khóa học này.",
            )

        updated_course = await CourseRepository.update_course(
            db=db,
            course_id=course_id,
            name=payload.name,
            code=payload.code,
            description=payload.description,
            term=payload.term,
            start_date=payload.start_date,
            end_date=payload.end_date,
        )

        students_data = await CourseRepository.get_enrolled_students(db, course_id)
        return CourseService._build_course_response(
            updated_course, student_count=len(students_data), is_enrolled=False, instructor_name=current_user.full_name
        )

    @staticmethod
    async def get_instructor_courses(
        db: AsyncSession, current_user: UserResponse
    ) -> list[CourseResponse]:
        """Fetch list of courses created by instructor."""
        if "instructor" not in current_user.roles and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có Giảng viên mới có quyền xem danh sách khóa học giảng dạy.",
            )

        courses_data = await CourseRepository.get_courses_by_instructor(db, current_user.id)
        res = []
        for item in courses_data:
            course = item["course"]
            res.append(
                CourseService._build_course_response(
                    course, student_count=item["student_count"], is_enrolled=False, instructor_name=current_user.full_name
                )
            )
        return res

    @staticmethod
    async def get_available_courses(
        db: AsyncSession, current_user: UserResponse
    ) -> list[CourseResponse]:
        """Fetch available courses for discovery by students."""
        items = await CourseRepository.get_available_courses(db, student_id=current_user.id)
        res = []
        for item in items:
            course = item["course"]
            res.append(
                CourseService._build_course_response(
                    course,
                    student_count=item["student_count"],
                    is_enrolled=item["is_enrolled"],
                    instructor_name=item["instructor_name"],
                )
            )
        return res

    @staticmethod
    async def join_course(
        db: AsyncSession, course_id: str, current_user: UserResponse
    ) -> CourseResponse:
        """Enroll student into a course."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        is_already_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=course_id
        )
        if is_already_enrolled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bạn đã tham gia khóa học này trước đó.",
            )

        await CourseRepository.join_course(db, student_id=current_user.id, course_id=course_id)

        instructor_name = course.instructor.full_name if course.instructor else "Giảng viên"

        return CourseService._build_course_response(
            course, student_count=1, is_enrolled=True, instructor_name=instructor_name
        )

    @staticmethod
    async def get_student_courses(
        db: AsyncSession, current_user: UserResponse
    ) -> list[CourseResponse]:
        """Fetch courses joined by current student."""
        items = await CourseRepository.get_enrolled_courses(db, student_id=current_user.id)
        res = []
        for item in items:
            course = item["course"]
            res.append(
                CourseService._build_course_response(
                    course,
                    student_count=item["student_count"],
                    is_enrolled=True,
                    instructor_name=item["instructor_name"],
                )
            )
        return res

    @staticmethod
    async def get_course_detail(
        db: AsyncSession, course_id: str, current_user: UserResponse
    ) -> CourseDetailResponse:
        """Fetch full details and student roster for a course."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        students_data = await CourseRepository.get_enrolled_students(db, course_id)
        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=course_id
        )

        instructor_name = course.instructor.full_name if course.instructor else "Giảng viên"

        course_resp = CourseService._build_course_response(
            course,
            student_count=len(students_data),
            is_enrolled=is_enrolled,
            instructor_name=instructor_name,
        )

        students_list = [
            EnrolledStudentResponse(
                id=st["id"],
                full_name=st["full_name"],
                email=st["email"],
                joined_at=st["joined_at"],
                status=st["status"],
            )
            for st in students_data
        ]

        return CourseDetailResponse(course=course_resp, students=students_list)

    @staticmethod
    async def get_enrolled_students(
        db: AsyncSession, course_id: str, current_user: UserResponse
    ) -> list[EnrolledStudentResponse]:
        """Fetch list of enrolled students for a course."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        students_data = await CourseRepository.get_enrolled_students(db, course_id)
        return [
            EnrolledStudentResponse(
                id=st["id"],
                full_name=st["full_name"],
                email=st["email"],
                joined_at=st["joined_at"],
                status=st["status"],
            )
            for st in students_data
        ]

