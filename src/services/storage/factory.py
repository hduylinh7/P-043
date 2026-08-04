from functools import lru_cache

from src.config import get_settings
from src.services.storage.base import StorageService
from src.services.storage.minio_storage import MinIOStorageService


@lru_cache
def get_storage_service() -> StorageService:
    """Factory function returning the configured StorageService instance based on settings."""
    settings = get_settings()
    provider = settings.storage_provider.lower()

    if provider in ("minio", "s3", "aws_s3", "r2"):
        return MinIOStorageService(settings=settings)
    
    # Fallback/Default to MinIOStorageService
    return MinIOStorageService(settings=settings)
