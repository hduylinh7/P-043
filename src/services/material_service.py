import os
import uuid
from fastapi import HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.auth import UserResponse
from src.models.material import CourseMaterialResponse
from src.repositories.course_repository import CourseRepository
from src.repositories.material_repository import MaterialRepository

UPLOAD_BASE_DIR = "./data/uploads/courses"


class MaterialService:
    @staticmethod
    async def upload_material(
        db: AsyncSession,
        course_id: str,
        file: UploadFile,
        title: str,
        material_type: str,
        current_user: UserResponse,
    ) -> CourseMaterialResponse:
        """Upload learning material for a course (Instructor only)."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        if course.instructor_id != current_user.id and "admin" not in current_user.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có giảng viên tạo khóa học mới có quyền tải lên tài liệu.",
            )

        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Tập tin tải lên không hợp lệ.",
            )

        # Ensure upload directory exists
        course_upload_dir = os.path.join(UPLOAD_BASE_DIR, course_id)
        os.makedirs(course_upload_dir, exist_ok=True)

        # Unique file naming
        file_ext = os.path.splitext(file.filename)[1]
        unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join(course_upload_dir, unique_filename)

        # Save file to disk
        contents = await file.read()
        with open(file_path, "wb") as f:
            f.write(contents)

        relative_file_url = f"/api/v1/courses/{course_id}/materials/download/{unique_filename}"

        material = await MaterialRepository.create_material(
            db=db,
            course_id=course_id,
            title=title if title else file.filename,
            file_name=file.filename,
            file_url=relative_file_url,
            material_type=material_type,
            uploaded_by=current_user.id,
        )

        return CourseMaterialResponse(
            id=material.id,
            course_id=material.course_id,
            title=material.title,
            file_name=material.file_name,
            file_url=material.file_url,
            type=material.type,
            uploaded_by=current_user.id,
            uploader_name=current_user.full_name,
            created_at=material.created_at,
        )

    @staticmethod
    async def get_course_materials(
        db: AsyncSession, course_id: str, current_user: UserResponse
    ) -> list[CourseMaterialResponse]:
        """Fetch list of materials for a course (Instructor or Enrolled Student)."""
        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        is_instructor = ("instructor" in current_user.roles) or ("admin" in current_user.roles)
        is_owner = (course.instructor_id == current_user.id) or (course.instructor_id is None and is_instructor)
        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=course_id
        )

        if not is_instructor and not is_owner and not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa đăng ký hoặc không có quyền truy cập khóa học này.",
            )

        items = await MaterialRepository.get_materials_by_course(db, course_id)
        res = []
        for item in items:
            mat = item["material"]
            res.append(
                CourseMaterialResponse(
                    id=mat.id,
                    course_id=mat.course_id,
                    title=mat.title,
                    file_name=mat.file_name,
                    file_url=mat.file_url,
                    type=mat.type,
                    uploaded_by=mat.uploaded_by,
                    uploader_name=item["uploader_name"],
                    created_at=mat.created_at,
                )
            )
        return res

    @staticmethod
    async def download_material(
        db: AsyncSession,
        course_id: str,
        material_id: str,
        current_user: UserResponse,
        inline: bool = False,
    ) -> FileResponse:
        """Stream/download material file for authorized users."""
        material = await MaterialRepository.get_by_id(db, material_id)
        if not material or material.course_id != course_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài liệu môn học.",
            )

        course = await CourseRepository.get_by_id(db, course_id)
        if not course:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy khóa học.",
            )

        is_instructor = ("instructor" in current_user.roles) or ("admin" in current_user.roles)
        is_owner = (course.instructor_id == current_user.id) or (course.instructor_id is None and is_instructor)
        is_enrolled = await CourseRepository.check_enrollment_exists(
            db, student_id=current_user.id, course_id=course_id
        )

        if not is_instructor and not is_owner and not is_enrolled:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Bạn chưa đăng ký hoặc không có quyền tải tài liệu này.",
            )


        # Determine physical file path
        filename_on_disk = os.path.basename(material.file_url)
        file_path = os.path.join(UPLOAD_BASE_DIR, course_id, filename_on_disk)

        if not os.path.exists(file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tập tin không còn tồn tại trên máy chủ.",
            )

        # Detect MIME type
        ext = os.path.splitext(material.file_name)[1].lower()
        media_type = "application/octet-stream"
        if ext == ".pdf":
            media_type = "application/pdf"
        elif ext in [".png", ".jpg", ".jpeg"]:
            media_type = f"image/{ext.replace('.', '')}"
        elif ext in [".txt", ".md"]:
            media_type = "text/plain; charset=utf-8"

        disposition = "inline" if inline else "attachment"

        return FileResponse(
            path=file_path,
            filename=material.file_name,
            media_type=media_type,
            headers={"Content-Disposition": f'{disposition}; filename="{material.file_name}"'},
        )


    @staticmethod
    async def delete_material(
        db: AsyncSession, course_id: str, material_id: str, current_user: UserResponse
    ) -> dict[str, str]:
        """Delete material record and file from disk (Instructor only)."""
        material = await MaterialRepository.get_by_id(db, material_id)
        if not material or material.course_id != course_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài liệu môn học.",
            )

        course = await CourseRepository.get_by_id(db, course_id)
        if not course or (course.instructor_id != current_user.id and "admin" not in current_user.roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ có giảng viên tạo khóa học mới có quyền xóa tài liệu.",
            )

        # Delete physical file from disk if exists
        filename_on_disk = os.path.basename(material.file_url)
        file_path = os.path.join(UPLOAD_BASE_DIR, course_id, filename_on_disk)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

        await MaterialRepository.delete_material(db, material_id)
        return {"message": "Đã xóa tài liệu môn học thành công"}
