from functools import lru_cache

from upstash_redis.asyncio import Redis

from app.config import get_settings


@lru_cache
def get_redis_client() -> Redis:
    settings = get_settings()
    return Redis(url=settings.upstash_redis_url, token=settings.upstash_redis_token)


async def ping_redis() -> bool:
    client = get_redis_client()
    await client.set("sameworld:health", "ok")
    value = await client.get("sameworld:health")
    return value == "ok"
