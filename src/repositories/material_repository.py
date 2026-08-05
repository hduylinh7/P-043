from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.db.models.identity.user import User
from src.db.models.learning.course_material import CourseMaterial


class MaterialRepository:
    @staticmethod
    async def create_material(
        db: AsyncSession,
        course_id: str,
        title: str,
        file_name: str,
        file_url: str,
        material_type: str,
        uploaded_by: str,
        object_key: str | None = None,
        bucket: str | None = None,
        size: int | None = None,
        mime_type: str | None = None,
        status: str = "completed",
    ) -> CourseMaterial:
        """Create and persist a new CourseMaterial instance."""
        material = CourseMaterial(
            course_id=course_id,
            title=title.strip(),
            file_name=file_name.strip(),
            file_url=file_url.strip(),
            object_key=object_key,
            bucket=bucket,
            size=size,
            mime_type=mime_type,
            status=status,
            type=material_type.strip() if material_type else "document",
            uploaded_by=uploaded_by,
        )
        db.add(material)
        await db.commit()
        await db.refresh(material)
        return material

    @staticmethod
    async def update_material_status(db: AsyncSession, material_id: str, new_status: str) -> bool:
        """Update processing status of a course material."""
        material = await MaterialRepository.get_by_id(db, material_id)
        if not material:
            return False
        material.status = new_status
        await db.commit()
        return True

    @staticmethod
    async def get_by_id(db: AsyncSession, material_id: str) -> CourseMaterial | None:
        """Fetch material by ID with uploader user relationship."""
        stmt = (
            select(CourseMaterial)
            .options(selectinload(CourseMaterial.uploader))
            .where(CourseMaterial.id == material_id)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_materials_by_course(db: AsyncSession, course_id: str) -> list[dict]:
        """Fetch all learning materials for a specific course."""
        stmt = (
            select(CourseMaterial, User)
            .outerjoin(User, CourseMaterial.uploaded_by == User.id)
            .where(CourseMaterial.course_id == course_id)
            .order_by(CourseMaterial.created_at.desc())
        )
        result = await db.execute(stmt)
        rows = result.all()

        items = []
        for material, uploader in rows:
            items.append({
                "material": material,
                "uploader_name": uploader.full_name if uploader else "Giảng viên",
            })
        return items

    @staticmethod
    async def delete_material(db: AsyncSession, material_id: str) -> bool:
        """Delete a material record from database."""
        material = await MaterialRepository.get_by_id(db, material_id)
        if not material:
            return False
        await db.delete(material)
        await db.commit()
        return True
