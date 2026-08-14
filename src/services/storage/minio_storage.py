import asyncio
import logging
from typing import Any

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from src.config import Settings, get_settings
from src.services.storage.base import StorageService

logger = logging.getLogger(__name__)


class MinIOStorageService(StorageService):
    """S3-compatible Object Storage implementation using boto3 (MinIO, AWS S3, R2)."""

    def __init__(self, settings: Settings | None = None):
        self.settings = settings or get_settings()
        self.bucket_name = self.settings.s3_bucket

        provider = self.settings.storage_provider.lower()
        default_region = "auto" if provider == "r2" else "us-east-1"
        region = self.settings.s3_region or default_region

        client_kwargs: dict[str, Any] = {
            "service_name": "s3",
            "aws_access_key_id": self.settings.s3_access_key,
            "aws_secret_access_key": self.settings.s3_secret_key,
            "region_name": region,
            "config": Config(s3={"addressing_style": "path"}),
        }

        if self.settings.s3_endpoint:
            client_kwargs["endpoint_url"] = self.settings.s3_endpoint

        self.client = boto3.client(**client_kwargs)
        self._ensure_bucket_exists_sync()

    def _ensure_bucket_exists_sync(self) -> None:
        """Helper to ensure the configured S3 bucket exists (synchronous initialization)."""
        try:
            self.client.head_bucket(Bucket=self.bucket_name)
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")
            if str(error_code) in ("404", "NoSuchBucket", "403"):
                try:
                    logger.info(f"Bucket {self.bucket_name} check/creation attempting...")
                    region = self.settings.s3_region
                    if region and region not in ("us-east-1", "auto"):
                        self.client.create_bucket(
                            Bucket=self.bucket_name,
                            CreateBucketConfiguration={"LocationConstraint": region},
                        )
                    else:
                        self.client.create_bucket(Bucket=self.bucket_name)
                    logger.info(f"Successfully created bucket: {self.bucket_name}")
                except Exception as create_err:
                    logger.warning(f"Could not auto-create bucket {self.bucket_name}: {create_err}")
            else:
                logger.warning(f"Bucket check warning for {self.bucket_name}: {e}")

    async def upload_file(
        self, file_data: bytes, object_key: str, content_type: str
    ) -> dict[str, str | int]:
        def _upload() -> dict[str, str | int]:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_data,
                ContentType=content_type,
            )
            return {
                "object_key": object_key,
                "bucket": self.bucket_name,
                "size": len(file_data),
                "mime_type": content_type,
            }

        try:
            return await asyncio.to_thread(_upload)
        except ClientError as e:
            logger.error(f"Failed to upload file to S3 ({object_key}): {e}")
            raise RuntimeError(f"Storage upload error: {e}") from e

    async def download_file(self, object_key: str) -> bytes:
        def _download() -> bytes:
            response = self.client.get_object(Bucket=self.bucket_name, Key=object_key)
            return response["Body"].read()

        try:
            return await asyncio.to_thread(_download)
        except ClientError as e:
            logger.error(f"Failed to download file from S3 ({object_key}): {e}")
            raise FileNotFoundError(f"Object {object_key} not found in storage: {e}") from e

    async def delete_file(self, object_key: str) -> bool:
        def _delete() -> bool:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_key)
            return True

        try:
            return await asyncio.to_thread(_delete)
        except ClientError as e:
            logger.error(f"Failed to delete file from S3 ({object_key}): {e}")
            return False

    async def generate_presigned_url(
        self, object_key: str, expiration: int = 3600, filename: str | None = None
    ) -> str:
        def _presign() -> str:
            params: dict[str, str] = {"Bucket": self.bucket_name, "Key": object_key}
            if filename:
                params["ResponseContentDisposition"] = f'attachment; filename="{filename}"'
            return self.client.generate_presigned_url(
                "get_object", Params=params, ExpiresIn=expiration
            )

        try:
            return await asyncio.to_thread(_presign)
        except ClientError as e:
            logger.error(f"Failed to generate presigned URL for {object_key}: {e}")
            raise RuntimeError(f"Could not generate presigned URL: {e}") from e

    async def file_exists(self, object_key: str) -> bool:
        def _exists() -> bool:
            try:
                self.client.head_object(Bucket=self.bucket_name, Key=object_key)
                return True
            except ClientError:
                return False

        return await asyncio.to_thread(_exists)
