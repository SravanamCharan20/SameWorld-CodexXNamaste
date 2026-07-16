from typing import Optional

from fastapi import APIRouter, Depends

from app.db.mongo import get_db
from app.deps import get_current_persona_id
from app.envelope import ok
from app.models.signal import SignalCreate, new_signal_document, serialize_signal

router = APIRouter()


@router.post("/signals")
async def create_signal(
    payload: SignalCreate, persona_id: str = Depends(get_current_persona_id)
):
    db = get_db()
    persona = await db.personas.find_one({"_id": persona_id})
    doc = new_signal_document(
        owner_id=persona_id,
        payload=payload,
        region_label=persona["region_label"],
        region_lat=persona["region_lat"],
        region_lng=persona["region_lng"],
    )
    result = await db.signals.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ok(serialize_signal(doc))


@router.get("/signals/mine")
async def my_signals(
    status: Optional[str] = None, persona_id: str = Depends(get_current_persona_id)
):
    db = get_db()
    query: dict = {"owner_id": persona_id}
    if status:
        query["status"] = status
    cursor = db.signals.find(query).sort("created_at", -1)
    signals = [serialize_signal(doc) async for doc in cursor]
    return ok(signals)


@router.get("/signals/browse")
async def browse_signals(region: Optional[str] = None, tag: Optional[str] = None):
    db = get_db()
    query: dict = {"status": "active"}
    if region:
        query["region_label"] = region
    if tag:
        query["tags"] = tag
    cursor = db.signals.find(query).sort("created_at", -1).limit(50)
    signals = [serialize_signal(doc) async for doc in cursor]
    return ok(signals)
