from unittest.mock import AsyncMock

import pytest

from src.models.auth import UserResponse
from src.services.material_service import MaterialService
from src.services.storage.base import StorageService
from src.services.storage.factory import get_storage_service
from src.services.storage.minio_storage import MinIOStorageService


class DummyStorageService(StorageService):
    def __init__(self):
        self.files = {}

    async def upload_file(
        self, file_data: bytes, object_key: str, content_type: str
    ) -> dict[str, str | int]:
        self.files[object_key] = {"data": file_data, "content_type": content_type}
        return {
            "object_key": object_key,
            "bucket": "test-bucket",
            "size": len(file_data),
            "mime_type": content_type,
        }

    async def download_file(self, object_key: str) -> bytes:
        if object_key not in self.files:
            raise FileNotFoundError(f"{object_key} not found")
        return self.files[object_key]["data"]

    async def delete_file(self, object_key: str) -> bool:
        if object_key in self.files:
            del self.files[object_key]
            return True
        return False

    async def generate_presigned_url(
        self, object_key: str, expiration: int = 3600, filename: str | None = None
    ) -> str:
        return f"http://localhost:9000/test-bucket/{object_key}?expires={expiration}"

    async def file_exists(self, object_key: str) -> bool:
        return object_key in self.files


def test_storage_factory():
    storage = get_storage_service()
    assert isinstance(storage, StorageService)
    assert isinstance(storage, MinIOStorageService)


@pytest.mark.asyncio
async def test_dummy_storage_operations():
    storage = DummyStorageService()
    res = await storage.upload_file(b"test content", "course/c1/materials/test.txt", "text/plain")
    assert res["object_key"] == "course/c1/materials/test.txt"
    assert res["bucket"] == "test-bucket"

    exists = await storage.file_exists("course/c1/materials/test.txt")
    assert exists is True

    content = await storage.download_file("course/c1/materials/test.txt")
    assert content == b"test content"

    url = await storage.generate_presigned_url("course/c1/materials/test.txt")
    assert "test-bucket" in url

    deleted = await storage.delete_file("course/c1/materials/test.txt")
    assert deleted is True
    assert await storage.file_exists("course/c1/materials/test.txt") is False
