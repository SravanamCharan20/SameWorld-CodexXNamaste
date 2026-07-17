import re

from fastapi import APIRouter

from app.db.mongo import get_db
from app.envelope import ok

router = APIRouter()


@router.get("/globe/state")
async def globe_state():
    db = get_db()
    cursor = db.signals.find(
        {"status": "active"},
        {
            "region_lat": 1,
            "region_lng": 1,
            "region_label": 1,
            "kind": 1,
            "topic": 1,
            "raw_text": 1,
            "is_profile": 1,
            "owner_id": 1,
            "created_at": 1,
        },
    )
    points = [
        {
            "id": str(doc["_id"]),
            "owner_id": doc["owner_id"],
            "lat": doc["region_lat"],
            "lng": doc["region_lng"],
            "region_label": doc["region_label"],
            "kind": doc["kind"],
            "topic": doc.get("topic") or doc["raw_text"][:60],
            "is_profile": doc["is_profile"],
            "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        }
        async for doc in cursor
    ]
    return ok(points)


@router.get("/activity/recent")
async def activity_recent(limit: int = 8, region: str | None = None):
    db = get_db()
    query: dict = {"status": {"$in": ["active", "resolved"]}}
    if region:
        query["region_label"] = {"$regex": re.escape(region), "$options": "i"}
    cursor = db.signals.find(query).sort("created_at", -1).limit(limit)
    items = [
        {
            "id": str(doc["_id"]),
            "owner_id": doc["owner_id"],
            "raw_text": doc["raw_text"],
            "region_label": doc["region_label"],
            "kind": doc["kind"],
            "status": doc["status"],
            "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        }
        async for doc in cursor
    ]
    return ok(items)
