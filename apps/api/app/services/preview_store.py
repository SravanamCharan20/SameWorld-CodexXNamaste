import json
import uuid

from app.db.redis import get_redis_client

PREVIEW_TTL_SECONDS = 600


def _key(preview_id: str) -> str:
    return f"signal_preview:{preview_id}"


async def save_preview(data: dict) -> str:
    preview_id = str(uuid.uuid4())
    client = get_redis_client()
    await client.set(_key(preview_id), json.dumps(data), ex=PREVIEW_TTL_SECONDS)
    return preview_id


async def get_preview(preview_id: str) -> dict | None:
    client = get_redis_client()
    raw = await client.get(_key(preview_id))
    return json.loads(raw) if raw else None


async def delete_preview(preview_id: str) -> None:
    client = get_redis_client()
    await client.delete(_key(preview_id))
