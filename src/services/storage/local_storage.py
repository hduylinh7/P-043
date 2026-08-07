import os

from src.services.storage.base import StorageService


class LocalStorageService(StorageService):
    """Local File System Storage Provider fallback."""

    def __init__(self, base_dir: str = "./data/uploads"):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _get_full_path(self, object_key: str) -> str:
        clean_key = object_key.lstrip("/")
        return os.path.join(self.base_dir, clean_key)

    async def upload_file(
        self, file_data: bytes, object_key: str, content_type: str
    ) -> dict[str, str | int]:
        full_path = self._get_full_path(object_key)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(file_data)
        return {
            "object_key": object_key,
            "bucket": "local",
            "size": len(file_data),
            "content_type": content_type,
        }

    async def download_file(self, object_key: str) -> bytes:
        full_path = self._get_full_path(object_key)
        if not os.path.exists(full_path):
            raise FileNotFoundError(f"File not found in local storage: {object_key}")
        with open(full_path, "rb") as f:
            return f.read()

    async def delete_file(self, object_key: str) -> bool:
        full_path = self._get_full_path(object_key)
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

    async def generate_presigned_url(
        self, object_key: str, expiration: int = 3600, filename: str | None = None
    ) -> str:
        return f"/api/v1/files/{object_key}"

    async def file_exists(self, object_key: str) -> bool:
        full_path = self._get_full_path(object_key)
        return os.path.exists(full_path)
