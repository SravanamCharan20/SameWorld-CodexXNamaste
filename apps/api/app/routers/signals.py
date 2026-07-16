import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db.mongo import get_db
from app.db.qdrant import upsert_signal_point
from app.deps import get_current_persona_id
from app.envelope import ok
from app.models.signal import (
    SignalConfirm,
    SignalCreate,
    build_signal_document,
    qdrant_payload_for,
    serialize_signal,
)
from app.services.embeddings import embed
from app.services.intent_extraction import extract_intent
from app.services.preview_store import delete_preview, get_preview, save_preview
from app.services.rate_limit import enforce_rate_limit
from app.services.safety import run_safety_gate

router = APIRouter()


@router.post("/signals")
async def create_signal(
    payload: SignalCreate, persona_id: str = Depends(get_current_persona_id)
):
    await enforce_rate_limit(persona_id, "signal_create", limit=15)
    db = get_db()
    persona = await db.personas.find_one({"_id": persona_id})

    safety = await run_safety_gate(payload.raw_text)
    if safety["blocked"]:
        return ok(
            {
                "blocked": True,
                "reason": safety["reason"],
                "risk_flags": safety["risk_flags"],
            }
        )

    analysis, vector = await asyncio.gather(
        extract_intent(payload.raw_text), embed(payload.raw_text)
    )
    merged_tags = list(dict.fromkeys([*payload.tags, *analysis["tags"]]))[:6]

    preview = {
        "owner_id": persona_id,
        "raw_text": payload.raw_text,
        "visibility": payload.visibility,
        "contact_intent": payload.contact_intent,
        "tags": merged_tags,
        "region_label": persona["region_label"],
        "region_lat": persona["region_lat"],
        "region_lng": persona["region_lng"],
        "intent": analysis["intent"],
        "topic": analysis["topic"],
        "kind": analysis["suggested_kind"],
        "vector": vector,
    }
    preview_id = await save_preview(preview)

    return ok(
        {
            "blocked": False,
            "preview_id": preview_id,
            "intent": analysis["intent"],
            "topic": analysis["topic"],
            "tags": merged_tags,
            "suggested_kind": analysis["suggested_kind"],
            "region_label": persona["region_label"],
        }
    )


@router.post("/signals/confirm")
async def confirm_signal(body: SignalConfirm):
    preview = await get_preview(body.preview_id)
    if not preview:
        raise HTTPException(status_code=404, detail="Preview expired or not found")

    db = get_db()
    doc = build_signal_document(
        owner_id=preview["owner_id"],
        raw_text=preview["raw_text"],
        visibility=preview["visibility"],
        contact_intent=preview["contact_intent"],
        tags=preview["tags"],
        region_label=preview["region_label"],
        region_lat=preview["region_lat"],
        region_lng=preview["region_lng"],
        intent=preview["intent"],
        topic=preview["topic"],
        kind=preview["kind"],
    )
    point_id = str(uuid.uuid4())
    doc["qdrant_point_id"] = point_id
    result = await db.signals.insert_one(doc)
    doc["_id"] = result.inserted_id

    await upsert_signal_point(point_id, preview["vector"], qdrant_payload_for(doc))

    await delete_preview(body.preview_id)
    return ok(serialize_signal(doc))


@router.post("/signals/{signal_id}/resolve")
async def resolve_signal(signal_id: str, persona_id: str = Depends(get_current_persona_id)):
    db = get_db()
    doc = await db.signals.find_one({"_id": ObjectId(signal_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Signal not found")
    if doc["owner_id"] != persona_id:
        raise HTTPException(status_code=403, detail="Not your signal")
    resolved_at = datetime.now(timezone.utc)
    await db.signals.update_one(
        {"_id": doc["_id"]}, {"$set": {"status": "resolved", "resolved_at": resolved_at}}
    )
    doc["status"] = "resolved"
    doc["resolved_at"] = resolved_at
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
async def browse_signals(
    region: Optional[str] = None, tag: Optional[str] = None, owner_id: Optional[str] = None
):
    db = get_db()
    query: dict = {"status": "active"}
    if region:
        query["region_label"] = region
    if tag:
        query["tags"] = tag
    if owner_id:
        # Human Card use case — the profile is already pinned separately, so
        # exclude it here to avoid showing it twice.
        query["owner_id"] = owner_id
        query["is_profile"] = False
    cursor = db.signals.find(query).sort("created_at", -1).limit(50)
    signals = [serialize_signal(doc) async for doc in cursor]
    return ok(signals)
