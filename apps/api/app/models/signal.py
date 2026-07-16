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


class SignalConfirm(BaseModel):
    preview_id: str


def expires_at_for(kind: Kind, created_at: datetime) -> Optional[datetime]:
    if kind == "NOW":
        return created_at + NOW_LIFETIME
    if kind == "OPEN":
        return created_at + OPEN_LIFETIME
    return None  # PROFILE never expires


def build_signal_document(
    *,
    owner_id: str,
    raw_text: str,
    visibility: str,
    contact_intent: str,
    tags: list[str],
    region_label: str,
    region_lat: float,
    region_lng: float,
    intent: Intent,
    topic: str,
    kind: Kind,
    is_profile: bool = False,
    links: Optional[list[str]] = None,
) -> dict:
    created_at = datetime.now(timezone.utc)
    effective_kind = "PROFILE" if is_profile else kind
    return {
        "owner_id": owner_id,
        "is_profile": is_profile,
        "raw_text": raw_text,
        "kind": effective_kind,
        "intent": intent,
        "topic": topic,
        "tags": tags,
        "links": links or [],
        "region_label": region_label,
        "region_lat": region_lat,
        "region_lng": region_lng,
        "visibility": visibility,
        "contact_intent": contact_intent,
        "status": "active",
        "risk_flags": [],
        "qdrant_point_id": None,
        "created_at": created_at,
        "expires_at": expires_at_for(effective_kind, created_at),
        "resolved_at": None,
        "edited_at": created_at,
    }


def qdrant_payload_for(doc: dict) -> dict:
    return {
        "signal_id": str(doc["_id"]),
        "is_profile": doc["is_profile"],
        "intent": doc["intent"],
        "topic": doc["topic"],
        "tags": doc["tags"],
        "region_label": doc["region_label"],
        "contact_intent": doc["contact_intent"],
        "status": doc["status"],
        "expires_at": doc["expires_at"].isoformat() if doc.get("expires_at") else None,
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
