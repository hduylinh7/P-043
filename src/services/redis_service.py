import logging
from redis.asyncio import Redis, from_url

from src.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

redis_client: Redis | None = None


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
        await redis_client.close()
        logger.info("Redis connection closed.")


async def get_redis() -> Redis | None:
    """Get initialized Redis client."""
    global redis_client
    if redis_client is None:
        return await init_redis()
    return redis_client


async def set_cache(key: str, value: str, expire_seconds: int = 3600) -> bool:
    """Set key-value pair in Redis cache with TTL."""
    client = await get_redis()
    if client:
        try:
            await client.set(key, value, ex=expire_seconds)
            return True
        except Exception as e:
            logger.error(f"Redis set_cache failed for key {key}: {e}")
    return False


async def get_cache(key: str) -> str | None:
    """Get value from Redis cache."""
    client = await get_redis()
    if client:
        try:
            return await client.get(key)
        except Exception as e:
            logger.error(f"Redis get_cache failed for key {key}: {e}")
    return None
