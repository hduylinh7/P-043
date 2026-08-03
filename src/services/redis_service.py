from datetime import datetime, timezone
import logging
from typing import Any

from redis.asyncio import Redis, from_url

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

redis_client: Redis | None = None

# In-memory fallback cache dict for test / dev when Redis is not running
_in_memory_cache: dict[str, tuple[str, float | None]] = {}


async def init_redis() -> Redis | None:
    """Initialize async Redis client connection."""
    global redis_client
    try:
        redis_client = from_url(settings.redis_url, decode_responses=True)
        await redis_client.ping()
        logger.info("Connected to Redis successfully.")
        return redis_client
    except Exception as e:
        logger.warning(f"Could not connect to Redis at {settings.redis_url}: {e}")
        redis_client = None
        return None


async def close_redis() -> None:
    """Close Redis client connection."""
    global redis_client
    if redis_client:
        try:
            await redis_client.close()
        except Exception:
            pass
        redis_client = None
        logger.info("Redis connection closed.")


async def get_redis() -> Redis | None:
    """Get initialized Redis client, re-initializing if event loop changed."""
    global redis_client
    if redis_client is None:
        return await init_redis()
    try:
        # Check connection status
        await redis_client.ping()
        return redis_client
    except (RuntimeError, Exception):
        # Event loop was closed or connection dropped -> re-init
        redis_client = None
        return await init_redis()


async def set_cache(key: str, value: str, expire_seconds: int = 3600) -> bool:
    """Set key-value pair in Redis cache with TTL, with in-memory fallback."""
    client = await get_redis()
    if client:
        try:
            await client.set(key, value, ex=expire_seconds)
            return True
        except Exception as e:
            logger.error(f"Redis set_cache failed for key {key}: {e}")

    # Fallback to in-memory cache
    expire_time = (
        datetime.now(timezone.utc).timestamp() + expire_seconds
        if expire_seconds
        else None
    )
    _in_memory_cache[key] = (value, expire_time)
    return True


async def get_cache(key: str) -> str | None:
    """Get value from Redis cache, falling back to in-memory cache."""
    client = await get_redis()
    if client:
        try:
            val = await client.get(key)
            if val is not None:
                return val
        except Exception as e:
            logger.error(f"Redis get_cache failed for key {key}: {e}")

    # Fallback lookup
    if key in _in_memory_cache:
        val, exp = _in_memory_cache[key]
        if exp is not None and datetime.now(timezone.utc).timestamp() > exp:
            del _in_memory_cache[key]
            return None
        return val
    return None


async def delete_cache(key: str) -> bool:
    """Delete key from Redis cache and in-memory cache."""
    client = await get_redis()
    if client:
        try:
            await client.delete(key)
        except Exception as e:
            logger.error(f"Redis delete_cache failed for key {key}: {e}")

    if key in _in_memory_cache:
        del _in_memory_cache[key]
    return True
