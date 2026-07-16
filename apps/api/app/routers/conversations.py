from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException

from app.db.mongo import get_db
from app.deps import get_current_persona_id
from app.envelope import ok
from app.models.conversation import MessageCreate, ReportCreate, serialize_conversation

router = APIRouter()


async def _get_conversation_for_participant(conversation_id: str, persona_id: str) -> dict:
    db = get_db()
    conv = await db.conversations.find_one({"_id": ObjectId(conversation_id)})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    if persona_id not in conv["participant_ids"]:
        raise HTTPException(status_code=403, detail="Not a participant in this conversation")
    return conv


@router.get("/conversations")
async def list_conversations(persona_id: str = Depends(get_current_persona_id)):
    db = get_db()
    cursor = db.conversations.find({"participant_ids": persona_id}).sort("created_at", -1)
    conversations = [serialize_conversation(doc) async for doc in cursor]
    return ok(conversations)


@router.get("/conversations/{conversation_id}")
async def get_conversation(
    conversation_id: str, persona_id: str = Depends(get_current_persona_id)
):
    conv = await _get_conversation_for_participant(conversation_id, persona_id)
    return ok(serialize_conversation(conv))


@router.post("/conversations/{conversation_id}/messages")
async def post_message(
    conversation_id: str,
    payload: MessageCreate,
    persona_id: str = Depends(get_current_persona_id),
):
    conv = await _get_conversation_for_participant(conversation_id, persona_id)
    if conv["status"] != "active":
        raise HTTPException(status_code=400, detail="Conversation is no longer active")
    db = get_db()
    message = {"sender_id": persona_id, "text": payload.text, "sent_at": datetime.now(timezone.utc)}
    await db.conversations.update_one(
        {"_id": conv["_id"]}, {"$push": {"messages": message}}
    )
    conv["messages"].append(message)
    return ok(serialize_conversation(conv))


@router.patch("/conversations/{conversation_id}/end")
async def end_conversation(
    conversation_id: str, persona_id: str = Depends(get_current_persona_id)
):
    conv = await _get_conversation_for_participant(conversation_id, persona_id)
    db = get_db()
    await db.conversations.update_one({"_id": conv["_id"]}, {"$set": {"status": "ended"}})
    conv["status"] = "ended"
    return ok(serialize_conversation(conv))


@router.post("/conversations/{conversation_id}/report")
async def report_conversation(
    conversation_id: str,
    payload: ReportCreate,
    persona_id: str = Depends(get_current_persona_id),
):
    conv = await _get_conversation_for_participant(conversation_id, persona_id)
    db = get_db()
    await db.reports.insert_one(
        {
            "conversation_id": conv["_id"],
            "reported_by": persona_id,
            "reason": payload.reason,
            "created_at": datetime.now(timezone.utc),
        }
    )
    return ok({"reported": True})
