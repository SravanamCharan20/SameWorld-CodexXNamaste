import asyncio
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException

from app.db.mongo import get_db
from app.db.qdrant import upsert_signal_point
from app.deps import get_current_persona_id
from app.envelope import ok
from app.models.profile import ProfileUpsert
from app.models.signal import build_signal_document, qdrant_payload_for, serialize_signal
from app.services.embeddings import embed
from app.services.intent_extraction import extract_intent
from app.services.rate_limit import enforce_rate_limit
from app.services.safety import run_safety_gate

router = APIRouter()


@router.post("/profile")
async def upsert_profile(
    payload: ProfileUpsert, persona_id: str = Depends(get_current_persona_id)
):
    await enforce_rate_limit(persona_id, "profile_edit", limit=15)
    db = get_db()
    persona = await db.personas.find_one({"_id": persona_id})

    safety = await run_safety_gate(payload.bio)
    if safety["blocked"]:
        return ok(
            {
                "blocked": True,
                "reason": safety["reason"],
                "risk_flags": safety["risk_flags"],
            }
        )

    analysis, vector = await asyncio.gather(
        extract_intent(payload.bio), embed(payload.bio)
    )
    merged_tags = list(dict.fromkeys([*payload.tags, *analysis["tags"]]))[:8]

    existing = await db.signals.find_one({"owner_id": persona_id, "is_profile": True})

    if existing:
        update_fields = {
            "raw_text": payload.bio,
            "tags": merged_tags,
            "links": payload.links,
            "visibility": payload.visibility,
            "contact_intent": payload.contact_intent,
            "intent": analysis["intent"],
            "topic": analysis["topic"],
            "edited_at": datetime.now(timezone.utc),
        }
        await db.signals.update_one({"_id": existing["_id"]}, {"$set": update_fields})
        doc = {**existing, **update_fields}
        point_id = existing["qdrant_point_id"]
    else:
        doc = build_signal_document(
            owner_id=persona_id,
            raw_text=payload.bio,
            visibility=payload.visibility,
            contact_intent=payload.contact_intent,
            tags=merged_tags,
            region_label=persona["region_label"],
            region_lat=persona["region_lat"],
            region_lng=persona["region_lng"],
            intent=analysis["intent"],
            topic=analysis["topic"],
            kind="PROFILE",
            is_profile=True,
            links=payload.links,
        )
        point_id = str(uuid.uuid4())
        doc["qdrant_point_id"] = point_id
        result = await db.signals.insert_one(doc)
        doc["_id"] = result.inserted_id
        await db.personas.update_one(
            {"_id": persona_id}, {"$set": {"profile_signal_id": result.inserted_id}}
        )

    await upsert_signal_point(point_id, vector, qdrant_payload_for(doc))
    return ok(serialize_signal(doc))


@router.get("/profile/{persona_id}")
async def get_profile(persona_id: str):
    db = get_db()
    doc = await db.signals.find_one({"owner_id": persona_id, "is_profile": True})
    if not doc:
        raise HTTPException(status_code=404, detail="No profile for this persona")
    return ok(serialize_signal(doc))
