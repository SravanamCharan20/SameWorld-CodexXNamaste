import json
import random

from bson import ObjectId
from fastapi import APIRouter

from app.db.mongo import get_db
from app.db.qdrant import sample_active_points
from app.db.redis import get_redis_client
from app.envelope import ok
from app.services.pulse import generate_pulse
from app.services.resonance import best_cross_owner_pair, generate_resonance_note

router = APIRouter()

# Cached and shared across every viewer (not per-request, not per-user) —
# the point is that everyone looking at the globe right now sees the same
# pulse/resonance, like it's one live shared instrument reading the world,
# not a personalized widget. TTLs just bound how often Groq gets called.
PULSE_CACHE_KEY = "sameworld:pulse"
PULSE_TTL = 60
RESONANCE_CACHE_KEY = "sameworld:resonance"
RESONANCE_TTL = 300
RESONANCE_THRESHOLD = 0.5


@router.get("/pulse")
async def pulse():
    client = get_redis_client()
    cached = await client.get(PULSE_CACHE_KEY)
    if cached:
        return ok({"headline": cached})

    db = get_db()
    cursor = (
        db.signals.find({"status": "active", "is_profile": False})
        .sort("created_at", -1)
        .limit(40)
    )
    signals = [doc async for doc in cursor]
    if not signals:
        return ok(None)
    sample = random.sample(signals, min(12, len(signals)))
    candidates = [
        {
            "kind": s["kind"],
            "topic": s.get("topic") or s["raw_text"][:60],
            "region_label": s["region_label"],
        }
        for s in sample
    ]
    try:
        headline = await generate_pulse(candidates)
    except Exception:
        return ok(None)

    await client.set(PULSE_CACHE_KEY, headline, ex=PULSE_TTL)
    return ok({"headline": headline})


@router.get("/resonance")
async def resonance():
    client = get_redis_client()
    cached = await client.get(RESONANCE_CACHE_KEY)
    if cached:
        return ok(json.loads(cached))

    points = await sample_active_points(limit=60)
    if len(points) < 2:
        return ok(None)
    found = best_cross_owner_pair(points)
    if not found:
        return ok(None)
    (point_a, point_b), score = found
    if score < RESONANCE_THRESHOLD:
        return ok(None)

    db = get_db()
    signal_ids = [point_a.payload["signal_id"], point_b.payload["signal_id"]]
    owner_ids = [point_a.payload["owner_id"], point_b.payload["owner_id"]]
    signals_by_id = {}
    async for doc in db.signals.find({"_id": {"$in": [ObjectId(sid) for sid in signal_ids]}}):
        signals_by_id[str(doc["_id"])] = doc
    personas_by_id = {}
    async for persona in db.personas.find({"_id": {"$in": owner_ids}}):
        personas_by_id[persona["_id"]] = persona

    def build_side(point):
        doc = signals_by_id.get(point.payload["signal_id"])
        if not doc:
            return None
        persona = personas_by_id.get(doc["owner_id"], {})
        return {
            "signal_id": str(doc["_id"]),
            "owner_id": doc["owner_id"],
            "display_name": persona.get("display_name", "Someone"),
            "region_label": doc["region_label"],
            "lat": doc["region_lat"],
            "lng": doc["region_lng"],
            "raw_text": doc["raw_text"],
        }

    side_a, side_b = build_side(point_a), build_side(point_b)
    if not side_a or not side_b:
        return ok(None)

    try:
        note = await generate_resonance_note(side_a["raw_text"], side_b["raw_text"])
    except Exception:
        note = None

    result = {"a": side_a, "b": side_b, "score": round(score, 3), "note": note}
    await client.set(RESONANCE_CACHE_KEY, json.dumps(result), ex=RESONANCE_TTL)
    return ok(result)
