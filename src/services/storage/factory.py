import logging
from functools import lru_cache

from src.config import get_settings
from src.services.storage.base import StorageService
from src.services.storage.local_storage import LocalStorageService

logger = logging.getLogger(__name__)


@lru_cache
def get_storage_service() -> StorageService:
    """Factory function returning the configured StorageService instance based on settings."""
    settings = get_settings()
    provider = settings.storage_provider.lower()

    if provider in ("minio", "s3", "aws_s3", "r2"):
        try:
            from src.services.storage.minio_storage import MinIOStorageService
            return MinIOStorageService(settings=settings)
        except (ImportError, Exception) as e:
            logger.warning(f"boto3 / MinIO not available ({e}), falling back to LocalStorageService.")
            return LocalStorageService()

    return LocalStorageService()
