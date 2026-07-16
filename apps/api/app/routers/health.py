import asyncio

from fastapi import APIRouter

from app.config import get_settings
from app.db.mongo import ping_mongo
from app.db.qdrant import ping_qdrant
from app.db.redis import ping_redis
from app.envelope import ok
from app.services.groq_client import ping_groq

router = APIRouter()


async def _check(name: str, configured: bool, fn) -> dict:
    if not configured:
        return {"service": name, "status": "not_configured"}
    try:
        await asyncio.wait_for(fn(), timeout=8)
        return {"service": name, "status": "connected"}
    except Exception as exc:  # noqa: BLE001 — surfaced to the caller, not swallowed
        return {"service": name, "status": "error", "detail": str(exc)}


@router.get("/health")
async def health():
    settings = get_settings()
    results = await asyncio.gather(
        _check("mongodb", bool(settings.mongodb_uri), ping_mongo),
        _check("qdrant", bool(settings.qdrant_url), ping_qdrant),
        _check("redis", bool(settings.upstash_redis_url), ping_redis),
        _check("groq", bool(settings.groq_api_key), ping_groq),
    )
    all_up = all(r["status"] == "connected" for r in results)
    return ok({"api": "connected", "all_services_up": all_up, "services": results})
