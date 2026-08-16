from datetime import datetime
from typing import Any
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models.learning import Course, CourseSchedule
from src.models.auth import UserResponse
from src.models.course import (
    CourseCreateRequest,
    CourseDetailResponse,
    CourseResponse,
    CourseScheduleResponse,
    CourseUpdateRequest,
    EnrolledStudentResponse,
    TimetableEntryResponse,
)
from src.repositories.course_repository import CourseRepository
from src.services.schedule_utils import (
    check_schedule_conflict,
    date_ranges_overlap,
    minutes_to_time_str,
    parse_datetime,
    parse_time_to_minutes,
)


class CourseService:
    @staticmethod
    def _build_course_response(
        course, student_count: int = 0, is_enrolled: bool = False, instructor_name: str | None = None
    ) -> CourseResponse:
        schedules_list = []
        if hasattr(course, "schedules") and course.schedules:
            schedules_list = [
                CourseScheduleResponse(
                    id=s.id,
                    course_id=s.course_id,
                    day_of_week=s.day_of_week,
                    start_time=s.start_time,
                    end_time=s.end_time,
                    room=s.room,
                )
                for s in course.schedules
            ]

        return CourseResponse(
            id=course.id,
            code=course.code,
            name=course.name,
            description=course.description,
            term=course.term,
            credits=getattr(course, "credits", 3),
            start_date=course.start_date,
            end_date=course.end_date,
            status=course.computed_status,
            instructor_id=course.instructor_id,
            instructor_name=instructor_name or (course.instructor.full_name if getattr(course, "instructor", None) else None),
            created_at=course.created_at,
            student_count=student_count,
            is_enrolled=is_enrolled,
            schedules=schedules_list,
        )

    @staticmethod
    async def auto_allocate_course_schedules(
        db: AsyncSession,
        credits: int,
        start_date: datetime,
        end_date: datetime,
        exclude_course_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Automatically allocate conflict-free weekly class schedule slots
        based on course credits and active start/end dates.
        """
        # 1. Parse dates & calculate duration in weeks
        s_dt = parse_datetime(start_date) or start_date
        e_dt = parse_datetime(end_date) or end_date
        if isinstance(s_dt, str):
            s_dt = datetime.fromisoformat(s_dt.replace("Z", "+00:00"))
        if isinstance(e_dt, str):
            e_dt = datetime.fromisoformat(e_dt.replace("Z", "+00:00"))

        duration_days = max(7, (e_dt - s_dt).days)
        duration_weeks = max(1.0, duration_days / 7.0)

        # 2. Required contact hours (1 credit = 15 contact hours)
        total_required_hours = max(15, credits * 15)
        weekly_required_hours = total_required_hours / duration_weeks

        # 3. Determine weekly session count and duration in minutes
        if weekly_required_hours <= 2.5:
            session_count = 1
            duration_mins = max(60, min(180, int(weekly_required_hours * 60)))
        elif weekly_required_hours <= 5.5:
            session_count = 2
            duration_mins = max(60, min(180, int((weekly_required_hours / 2) * 60)))
        elif weekly_required_hours <= 8.5:
            session_count = 3
            duration_mins = max(60, min(180, int((weekly_required_hours / 3) * 60)))
        elif weekly_required_hours <= 12.0:
            session_count = 4
            duration_mins = max(60, min(180, int((weekly_required_hours / 4) * 60)))
        else:
            session_count = 5
            duration_mins = max(60, min(180, int((weekly_required_hours / 5) * 60)))

        # Round duration_mins to neat 15-minute increments
        duration_mins = max(60, round(duration_mins / 15) * 15)

        # 4. Day Patterns based on session count
        if session_count == 1:
            day_patterns = [["Monday"], ["Tuesday"], ["Wednesday"], ["Thursday"], ["Friday"]]
        elif session_count == 2:
            day_patterns = [
                ["Monday", "Wednesday"],
                ["Tuesday", "Thursday"],
                ["Wednesday", "Friday"],
                ["Monday", "Thursday"],
                ["Tuesday", "Friday"],
            ]
        elif session_count == 3:
            day_patterns = [
                ["Monday", "Wednesday", "Friday"],
                ["Tuesday", "Thursday", "Saturday"],
            ]
        elif session_count == 4:
            day_patterns = [
                ["Monday", "Tuesday", "Thursday", "Friday"],
                ["Monday", "Wednesday", "Thursday", "Friday"],
            ]
        else:
            day_patterns = [
                ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            ]

        time_slot_candidates = [
            (480, 480 + duration_mins),   # 08:00
            (600, 600 + duration_mins),   # 10:00
            (780, 780 + duration_mins),   # 13:00
            (900, 900 + duration_mins),   # 15:00
            (540, 540 + duration_mins),   # 09:00
            (840, 840 + duration_mins),   # 14:00
        ]
        # 4. Fetch all existing courses and their schedules across the university
        stmt = select(Course).options(selectinload(Course.schedules))
        if exclude_course_id:
            stmt = stmt.where(Course.id != exclude_course_id)
        res = await db.execute(stmt)
        all_existing_courses = res.scalars().all()

        overlapping_courses = []
        for c in all_existing_courses:
            if c.start_date and c.end_date:
                cs = parse_datetime(c.start_date)
                ce = parse_datetime(c.end_date)
                req_s = parse_datetime(start_date)
                req_e = parse_datetime(end_date)
                if cs and ce and req_s and req_e:
                    if date_ranges_overlap(req_s, req_e, cs, ce):
                        overlapping_courses.append(c)

        for days in day_patterns:
            for (s_mins, e_mins) in time_slot_candidates:
                s_str = minutes_to_time_str(s_mins)
                e_str = minutes_to_time_str(e_mins)

                is_conflict = False
                for day_name in days:
                    for ex_course in overlapping_courses:
                        for ex_sched in (ex_course.schedules or []):
                            if ex_sched.day_of_week.strip().lower() == day_name.lower():
                                ex_s_mins = parse_time_to_minutes(ex_sched.start_time)
                                ex_e_mins = parse_time_to_minutes(ex_sched.end_time)
                                if s_mins < ex_e_mins and ex_s_mins < e_mins:
                                    is_conflict = True
                                    break
                        if is_conflict:
                            break
                    if is_conflict:
                        break

                if not is_conflict:
                    return [
                        {
                            "day_of_week": day_name,
                            "start_time": s_str,
                            "end_time": e_str,
                            "room": None,
                        }
                        for day_name in days
                    ]

        default_days = day_patterns[0]
        return [
            {
                "day_of_week": day_name,
                "start_time": "08:00",
                "end_time": minutes_to_time_str(480 + duration_mins),
                "room": None,
            }
            for day_name in default_days
        ]

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

        if payload.schedules:
            schedules_data = [s.model_dump() for s in payload.schedules]
        else:
            schedules_data = await CourseService.auto_allocate_course_schedules(
                db=db,
                credits=payload.credits,
                start_date=payload.start_date,
                end_date=payload.end_date,
            )

        course = await CourseRepository.create_course(
            db=db,
            name=payload.name,
            code=payload.code,
            credits=payload.credits,
            instructor_id=current_user.id,
            start_date=payload.start_date,
            end_date=payload.end_date,
            description=payload.description,
            term=payload.term,
            schedules_data=schedules_data,
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

        if payload.schedules is not None:
            schedules_data = [s.model_dump() for s in payload.schedules]
        elif payload.credits is not None or payload.start_date is not None or payload.end_date is not None:
            eff_credits = payload.credits if payload.credits is not None else getattr(course, "credits", 3)
            eff_start = payload.start_date if payload.start_date is not None else course.start_date
            eff_end = payload.end_date if payload.end_date is not None else course.end_date
            schedules_data = await CourseService.auto_allocate_course_schedules(
                db=db,
                credits=eff_credits,
                start_date=eff_start,
                end_date=eff_end,
                exclude_course_id=course_id,
            )
        else:
            schedules_data = None

        updated_course = await CourseRepository.update_course(
            db=db,
            course_id=course_id,
            name=payload.name,
            code=payload.code,
            credits=payload.credits,
            description=payload.description,
            term=payload.term,
            start_date=payload.start_date,
            end_date=payload.end_date,
            schedules_data=schedules_data,
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
        """Enroll student into a course after checking schedule conflicts."""
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

        # Conflict Detection: Compare course schedules against student's existing enrolled courses
        enrolled_items = await CourseRepository.get_enrolled_courses(db, student_id=current_user.id)
        conflict = check_schedule_conflict(enrolled_items, course)
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "Trùng lịch học! Không thể đăng ký môn học này.",
                    "conflict": conflict.model_dump(),
                },
            )

        await CourseRepository.join_course(db, student_id=current_user.id, course_id=course_id)

        instructor_name = course.instructor.full_name if course.instructor else "Giảng viên"

        return CourseService._build_course_response(
            course, student_count=1, is_enrolled=True, instructor_name=instructor_name
        )

    @staticmethod
    async def leave_course(
        db: AsyncSession, course_id: str, current_user: UserResponse
    ) -> dict:
        """Unenroll student from a course."""
        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=course_id
        )
        if not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Bạn chưa tham gia khóa học này.",
            )

        success = await CourseRepository.leave_course(db, student_id=current_user.id, course_id=course_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Rời khóa học thất bại.",
            )

        return {"message": "Đã rời khỏi khóa học thành công."}

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
    async def get_student_timetable(
        db: AsyncSession, current_user: UserResponse
    ) -> list[TimetableEntryResponse]:
        """Fetch official timetable schedule entries for student's enrolled courses."""
        items = await CourseRepository.get_enrolled_courses(db, student_id=current_user.id)
        timetable_entries = []

        for item in items:
            course = item["course"]
            instructor_name = item.get("instructor_name") or "Giảng viên"
            schedules = getattr(course, "schedules", [])

            for s in schedules:
                timetable_entries.append(
                    TimetableEntryResponse(
                        course_id=course.id,
                        course_code=course.code,
                        course_name=course.name,
                        credits=getattr(course, "credits", 3),
                        instructor_name=instructor_name,
                        start_date=course.start_date,
                        end_date=course.end_date,
                        day_of_week=s.day_of_week,
                        start_time=s.start_time,
                        end_time=s.end_time,
                        room=s.room,
                    )
                )

        return timetable_entries

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
