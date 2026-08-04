from abc import ABC, abstractmethod


class StorageService(ABC):
    """Abstract interface for Object Storage providers (MinIO, AWS S3, Cloudflare R2, etc.)."""

    @abstractmethod
    async def upload_file(
        self, file_data: bytes, object_key: str, content_type: str
    ) -> dict[str, str | int]:
        """Upload file bytes to object storage.

        Returns dict containing metadata (object_key, bucket, size, content_type).
        """
        pass

    @abstractmethod
    async def download_file(self, object_key: str) -> bytes:
        """Download raw file bytes from object storage."""
        pass

    @abstractmethod
    async def delete_file(self, object_key: str) -> bool:
        """Delete an object from storage."""
        pass

    @abstractmethod
    async def generate_presigned_url(
        self, object_key: str, expiration: int = 3600, filename: str | None = None
    ) -> str:
        """Generate a presigned GET URL for downloading/viewing the object."""
        pass

    @abstractmethod
    async def file_exists(self, object_key: str) -> bool:
        """Check if an object exists in storage."""
        pass
