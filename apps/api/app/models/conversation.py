from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    text: str = Field(min_length=1, max_length=2000)


class ReportCreate(BaseModel):
    reason: str = Field(default="", max_length=500)


def serialize_message(msg: dict) -> dict:
    return {
        "sender_id": msg["sender_id"],
        "text": msg["text"],
        "sent_at": msg["sent_at"].isoformat() if msg.get("sent_at") else None,
    }


def serialize_conversation(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "connection_id": str(doc["connection_id"]),
        "participant_ids": doc["participant_ids"],
        "pinned_context": doc["pinned_context"],
        "messages": [serialize_message(m) for m in doc["messages"]],
        "status": doc["status"],
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
    }
