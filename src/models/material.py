from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class CourseMaterialResponse(BaseModel):
    id: str
    course_id: str
    title: str
    file_name: str
    file_url: str
    object_key: str | None = None
    bucket: str | None = None
    size: int | None = None
    mime_type: str | None = None
    presigned_url: str | None = None
    status: str = "completed"
    type: str = "document"
    uploaded_by: str | None = None
    uploader_name: str | None = None
    created_at: datetime | str

    model_config = ConfigDict(from_attributes=True)
