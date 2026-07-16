from typing import Optional

from pydantic import BaseModel, Field


class ConnectionCreate(BaseModel):
    signal_id: str
    message: str = Field(min_length=1, max_length=1000)
    rationale: Optional[str] = None


class ConnectionAction(BaseModel):
    action: str  # "accept" | "decline"


def serialize_connection(doc: dict, viewer_persona_id: str) -> dict:
    direction = "outgoing" if doc["requester_id"] == viewer_persona_id else "incoming"
    return {
        "id": str(doc["_id"]),
        "requester_id": doc["requester_id"],
        "recipient_id": doc["recipient_id"],
        "signal_id": doc["signal_id"],
        "message": doc["message"],
        "rationale": doc["rationale"],
        "status": doc["status"],
        "direction": direction,
        "conversation_id": str(doc["conversation_id"]) if doc.get("conversation_id") else None,
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
    }
