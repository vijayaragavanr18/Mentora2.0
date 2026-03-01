"""Cache Service — Redis get/set/delete wrappers."""
import json
from typing import Any, Optional
import redis.asyncio as aioredis
from config import get_settings

settings = get_settings()

_redis: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def get(key: str) -> Optional[Any]:
    r = await get_redis()
    val = await r.get(key)
    if val is None:
        return None
    try:
        return json.loads(val)
    except json.JSONDecodeError:
        return val


async def set(key: str, value: Any, ttl: int = 3600) -> None:
    r = await get_redis()
    await r.setex(key, ttl, json.dumps(value))


async def delete(key: str) -> None:
    r = await get_redis()
    await r.delete(key)


async def exists(key: str) -> bool:
    r = await get_redis()
    return bool(await r.exists(key))
