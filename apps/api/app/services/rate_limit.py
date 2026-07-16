import time

from fastapi import HTTPException

from app.db.redis import get_redis_client


async def enforce_rate_limit(persona_id: str, action: str, limit: int = 10, window_seconds: int = 3600) -> None:
    """§8: signal creation, profile edits, and connection requests are each
    independently rate-limited — generous enough that legitimate rapid testing
    never hits a wall."""
    client = get_redis_client()
    bucket = int(time.time() // window_seconds)
    key = f"ratelimit:{action}:{persona_id}:{bucket}"
    count = await client.incr(key)
    if count == 1:
        await client.expire(key, window_seconds)
    if count > limit:
        raise HTTPException(status_code=429, detail=f"Rate limit exceeded for {action}. Try again later.")
