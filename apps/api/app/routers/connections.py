from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.db.mongo import get_db
from app.deps import get_current_persona_id
from app.envelope import ok
from app.models.connection import ConnectionAction, ConnectionCreate, serialize_connection
from app.services.icebreaker import generate_icebreakers
from app.services.rate_limit import enforce_rate_limit

router = APIRouter()


class IcebreakerRequest(BaseModel):
    signal_id: str


# Suggests opening lines for the connect textarea — "reach out" too often
# stalls on a blank box, so this gives something concrete to start from (and
# edit or ignore). Degrades to ok(None) on any failure so the connect flow
# itself never depends on it working.
@router.post("/connections/icebreaker")
async def icebreaker(body: IcebreakerRequest, persona_id: str = Depends(get_current_persona_id)):
    db = get_db()
    try:
        signal = await db.signals.find_one({"_id": ObjectId(body.signal_id)})
    except Exception:
        return ok(None)
    if not signal:
        return ok(None)

    sender = await db.personas.find_one({"_id": persona_id})
    sender_name = sender["display_name"] if sender else "Someone"

    try:
        suggestions = await generate_icebreakers(signal["raw_text"], sender_name)
    except Exception:
        return ok(None)
    if not suggestions:
        return ok(None)
    return ok({"suggestions": suggestions})


@router.post("/connections")
async def create_connection(
    payload: ConnectionCreate, persona_id: str = Depends(get_current_persona_id)
):
    await enforce_rate_limit(persona_id, "connection_request", limit=15)
    db = get_db()
    signal = await db.signals.find_one({"_id": ObjectId(payload.signal_id)})
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    if signal["owner_id"] == persona_id:
        raise HTTPException(status_code=400, detail="Can't connect to your own signal")

    existing = await db.connections.find_one(
        {"requester_id": persona_id, "signal_id": payload.signal_id, "status": "pending"}
    )
    if existing:
        raise HTTPException(status_code=409, detail="Connection request already pending")

    doc = {
        "requester_id": persona_id,
        "recipient_id": signal["owner_id"],
        "signal_id": payload.signal_id,
        "message": payload.message,
        "rationale": payload.rationale or "reached out to connect",
        "status": "pending",
        "conversation_id": None,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.connections.insert_one(doc)
    doc["_id"] = result.inserted_id
    return ok(serialize_connection(doc, persona_id))


@router.get("/connections")
async def list_connections(
    status: Optional[str] = None,
    direction: Optional[str] = None,
    persona_id: str = Depends(get_current_persona_id),
):
    db = get_db()
    if direction == "incoming":
        query: dict = {"recipient_id": persona_id}
    elif direction == "outgoing":
        query = {"requester_id": persona_id}
    else:
        query = {"$or": [{"requester_id": persona_id}, {"recipient_id": persona_id}]}
    if status:
        query["status"] = status

    cursor = db.connections.find(query).sort("created_at", -1)
    connections = [serialize_connection(doc, persona_id) async for doc in cursor]
    return ok(connections)


@router.patch("/connections/{connection_id}")
async def update_connection(
    connection_id: str,
    payload: ConnectionAction,
    persona_id: str = Depends(get_current_persona_id),
):
    db = get_db()
    conn = await db.connections.find_one({"_id": ObjectId(connection_id)})
    if not conn:
        raise HTTPException(status_code=404, detail="Connection not found")
    if conn["recipient_id"] != persona_id:
        raise HTTPException(status_code=403, detail="Only the recipient can respond")
    if conn["status"] != "pending":
        raise HTTPException(status_code=400, detail="Connection already resolved")

    if payload.action == "decline":
        await db.connections.update_one({"_id": conn["_id"]}, {"$set": {"status": "declined"}})
        conn["status"] = "declined"
        return ok(serialize_connection(conn, persona_id))

    if payload.action != "accept":
        raise HTTPException(status_code=400, detail="action must be accept or decline")

    signal = await db.signals.find_one({"_id": ObjectId(conn["signal_id"])})
    pinned_context = {
        "signal_id": conn["signal_id"],
        "owner_id": signal["owner_id"] if signal else conn["recipient_id"],
        "raw_text": signal["raw_text"] if signal else "",
        "topic": signal["topic"] if signal else "",
        "is_profile": signal["is_profile"] if signal else False,
        "rationale": conn["rationale"],
    }
    conversation = {
        "connection_id": conn["_id"],
        "participant_ids": [conn["requester_id"], conn["recipient_id"]],
        "pinned_context": pinned_context,
        "messages": [],
        "status": "active",
        "created_at": datetime.now(timezone.utc),
    }
    conv_result = await db.conversations.insert_one(conversation)

    await db.connections.update_one(
        {"_id": conn["_id"]},
        {"$set": {"status": "accepted", "conversation_id": conv_result.inserted_id}},
    )
    conn["status"] = "accepted"
    conn["conversation_id"] = conv_result.inserted_id
    return ok(serialize_connection(conn, persona_id))
