import logging
import mimetypes
import uuid
from fastapi import BackgroundTasks, HTTPException, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.models.auth import UserResponse
from src.models.material import CourseMaterialResponse
from src.repositories.course_repository import CourseRepository
from src.repositories.material_repository import MaterialRepository
from src.services.rag_service import RAGService
from src.services.storage.base import StorageService
from src.services.storage.factory import get_storage_service

logger = logging.getLogger(__name__)


class MaterialService:
    @staticmethod
    async def upload_material(
        db: AsyncSession,
        course_id: str,
        file: UploadFile,
        title: str,
        material_type: str,
        current_user: UserResponse,
        storage_service: StorageService | None = None,
        background_tasks: BackgroundTasks | None = None,
    ) -> CourseMaterialResponse:
        """Upload learning material for a course to object storage (Instructor only)."""
        settings = get_settings()
        storage = storage_service or get_storage_service()

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

        contents = await file.read()
        max_bytes = settings.max_upload_size_mb * 1024 * 1024
        if len(contents) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Dung lượng tập tin vượt quá giới hạn tối đa ({settings.max_upload_size_mb} MB).",
            )

        # Unique Object Key structure: course/{course_id}/materials/{uuid}_{original_filename}
        unique_prefix = uuid.uuid4().hex
        clean_filename = file.filename.replace(" ", "_")
        object_key = f"course/{course_id}/materials/{unique_prefix}_{clean_filename}"

        content_type = file.content_type or mimetypes.guess_type(file.filename)[0] or "application/octet-stream"

        try:
            upload_result = await storage.upload_file(
                file_data=contents,
                object_key=object_key,
                content_type=content_type,
            )
        except Exception as e:
            logger.error(f"Failed to upload object {object_key} to storage: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Lỗi trong quá trình tải tệp lên hệ thống lưu trữ.",
            )

        relative_file_url = f"/api/v1/courses/{course_id}/materials/download/{unique_prefix}_{clean_filename}"

        material = await MaterialRepository.create_material(
            db=db,
            course_id=course_id,
            title=title if title else file.filename,
            file_name=file.filename,
            file_url=relative_file_url,
            material_type=material_type,
            uploaded_by=current_user.id,
            object_key=object_key,
            bucket=str(upload_result.get("bucket", "")),
            size=int(upload_result.get("size", len(contents))),
            mime_type=content_type,
            status="pending",
        )

        if background_tasks:
            background_tasks.add_task(
                RAGService.ingest_document_background,
                course_id=course_id,
                material_id=material.id,
                file_bytes=contents,
                file_name=file.filename,
                object_key=object_key,
                mime_type=content_type,
            )

        presigned_url = None
        try:
            presigned_url = await storage.generate_presigned_url(object_key, filename=file.filename)
        except Exception as e:
            logger.warning(f"Could not generate presigned URL after upload: {e}")

        return CourseMaterialResponse(
            id=material.id,
            course_id=material.course_id,
            title=material.title,
            file_name=material.file_name,
            file_url=material.file_url,
            object_key=material.object_key,
            bucket=material.bucket,
            size=material.size,
            mime_type=material.mime_type,
            presigned_url=presigned_url,
            status=material.status,
            type=material.type,
            uploaded_by=current_user.id,
            uploader_name=current_user.full_name,
            created_at=material.created_at,
        )

    @staticmethod
    async def get_course_materials(
        db: AsyncSession,
        course_id: str,
        current_user: UserResponse,
        storage_service: StorageService | None = None,
    ) -> list[CourseMaterialResponse]:
        """Fetch list of materials for a course with presigned URLs (Instructor or Enrolled Student)."""
        storage = storage_service or get_storage_service()

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
            presigned_url = None
            if mat.object_key:
                try:
                    presigned_url = await storage.generate_presigned_url(
                        mat.object_key, filename=mat.file_name
                    )
                except Exception as e:
                    logger.warning(f"Failed to generate presigned URL for {mat.id}: {e}")

            res.append(
                CourseMaterialResponse(
                    id=mat.id,
                    course_id=mat.course_id,
                    title=mat.title,
                    file_name=mat.file_name,
                    file_url=mat.file_url,
                    object_key=mat.object_key,
                    bucket=mat.bucket,
                    size=mat.size,
                    mime_type=mat.mime_type,
                    presigned_url=presigned_url,
                    status=getattr(mat, "status", "completed"),
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
        storage_service: StorageService | None = None,
    ) -> RedirectResponse:
        """Generate presigned download URL and redirect (Instructor or Enrolled Student)."""
        storage = storage_service or get_storage_service()

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

        if not material.object_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tập tin không có thông tin lưu trữ Object Storage.",
            )

        try:
            filename_arg = None if inline else material.file_name
            presigned_url = await storage.generate_presigned_url(
                material.object_key, filename=filename_arg
            )
            return RedirectResponse(url=presigned_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
        except Exception as e:
            logger.error(f"Error generating presigned download URL for {material.id}: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Không thể tạo liên kết tải tài liệu từ Object Storage.",
            )

    @staticmethod
    async def delete_material(
        db: AsyncSession,
        course_id: str,
        material_id: str,
        current_user: UserResponse,
        storage_service: StorageService | None = None,
    ) -> dict[str, str]:
        """Delete material record and file object from storage (Instructor only)."""
        storage = storage_service or get_storage_service()

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

        if material.object_key:
            try:
                await storage.delete_file(material.object_key)
            except Exception as e:
                logger.warning(f"Could not delete storage object {material.object_key}: {e}")

        # Delete RAG vectors from ChromaDB
        try:
            RAGService.delete_material_vectors(material_id)
        except Exception as e:
            logger.warning(f"Could not delete vectors for material {material_id}: {e}")

        await MaterialRepository.delete_material(db, material_id)
        return {"message": "Đã xóa tài liệu môn học thành công"}
