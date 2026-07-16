from datetime import datetime, timedelta, timezone
from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import ContactIntent, Intent, Kind, Visibility

NOW_LIFETIME = timedelta(hours=24)
OPEN_LIFETIME = timedelta(days=30)


class SignalCreate(BaseModel):
    raw_text: str = Field(min_length=1, max_length=2000)
    visibility: Visibility = "worldwide"
    contact_intent: ContactIntent = "open_to_conversation"
    tags: list[str] = Field(default_factory=list)
    # Temporary Phase 2 stand-in for the AI-suggested NOW/OPEN kind (§12 composer).
    # Replaced by a Groq-suggested value in Phase 3 — kept here only until then.
    kind: Kind = "NOW"


def expires_at_for(kind: Kind, created_at: datetime) -> Optional[datetime]:
    if kind == "NOW":
        return created_at + NOW_LIFETIME
    if kind == "OPEN":
        return created_at + OPEN_LIFETIME
    return None  # PROFILE never expires


def new_signal_document(
    *,
    owner_id: str,
    payload: SignalCreate,
    region_label: str,
    region_lat: float,
    region_lng: float,
    is_profile: bool = False,
    intent: Intent = "other",
    topic: str = "",
) -> dict:
    created_at = datetime.now(timezone.utc)
    return {
        "owner_id": owner_id,
        "is_profile": is_profile,
        "raw_text": payload.raw_text,
        "kind": "PROFILE" if is_profile else payload.kind,
        "intent": intent,
        "topic": topic,
        "tags": payload.tags,
        "links": [],
        "region_label": region_label,
        "region_lat": region_lat,
        "region_lng": region_lng,
        "visibility": payload.visibility,
        "contact_intent": payload.contact_intent,
        "status": "active",
        "risk_flags": [],
        "qdrant_point_id": None,
        "created_at": created_at,
        "expires_at": expires_at_for("PROFILE" if is_profile else payload.kind, created_at),
        "resolved_at": None,
        "edited_at": created_at,
    }


def serialize_signal(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "owner_id": doc["owner_id"],
        "is_profile": doc["is_profile"],
        "raw_text": doc["raw_text"],
        "kind": doc["kind"],
        "intent": doc["intent"],
        "topic": doc["topic"],
        "tags": doc["tags"],
        "links": doc["links"],
        "region_label": doc["region_label"],
        "region_lat": doc["region_lat"],
        "region_lng": doc["region_lng"],
        "visibility": doc["visibility"],
        "contact_intent": doc["contact_intent"],
        "status": doc["status"],
        "risk_flags": doc["risk_flags"],
        "created_at": doc["created_at"].isoformat() if doc.get("created_at") else None,
        "expires_at": doc["expires_at"].isoformat() if doc.get("expires_at") else None,
        "resolved_at": doc["resolved_at"].isoformat() if doc.get("resolved_at") else None,
        "edited_at": doc["edited_at"].isoformat() if doc.get("edited_at") else None,
    }
