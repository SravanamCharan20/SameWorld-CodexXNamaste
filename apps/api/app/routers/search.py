import asyncio

from bson import ObjectId
from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings
from app.db.mongo import get_db
from app.db.qdrant import search_candidates
from app.envelope import ok
from app.services.embeddings import embed
from app.services.explain import generate_labels
from app.services.narrate import generate_narrative
from app.services.query_understanding import understand_query
from app.services.ranking import score_candidate

router = APIRouter()

EMPTY_STATE_MESSAGE = "Nobody's signal matches that yet. Be the first — post it as a Signal, or Browse Nearby."


class SearchRequest(BaseModel):
    query_text: str
    region_filter: str | None = None
    tag: str | None = None


@router.post("/search")
async def search(body: SearchRequest):
    settings = get_settings()
    analysis, query_vector = await asyncio.gather(
        understand_query(body.query_text), embed(body.query_text)
    )
    region_filter = body.region_filter or analysis["region_filter"]
    # An explicit region_filter passed by the caller (e.g. Browse Nearby)
    # is always meant as a real constraint; one merely inferred from the
    # free-text query only counts as "required" when the LLM judged the
    # phrasing as an explicit ask, not an incidental mention.
    region_required = bool(body.region_filter) or analysis["region_required"]
    query_tags = [body.tag] if body.tag else analysis["tags"]

    points = await search_candidates(query_vector, limit=30)

    scored = []
    for point in points:
        payload = point.payload or {}
        score = score_candidate(
            similarity=point.score,
            query_intent=analysis["intent"],
            candidate_intent=payload.get("intent", "other"),
            query_tags=query_tags,
            candidate_tags=payload.get("tags", []),
            candidate_created_at=payload.get("created_at"),
            candidate_kind=payload.get("kind", "NOW"),
            region_filter=region_filter,
            candidate_region=payload.get("region_label", ""),
            region_required=region_required,
        )
        scored.append({**payload, "similarity": point.score, "score": score})

    scored.sort(key=lambda c: c["score"], reverse=True)
    survivors = [c for c in scored if c["score"] >= settings.similarity_threshold][:8]

    if not survivors:
        return ok({"empty": True, "message": EMPTY_STATE_MESSAGE, "results": []})

    labels = await generate_labels(body.query_text, survivors)

    results = [
        {
            "signal_id": c["signal_id"],
            "owner_id": c["owner_id"],
            "raw_text": c["raw_text"],
            "topic": c["topic"],
            "intent": c["intent"],
            "kind": c["kind"],
            "tags": c["tags"],
            "region_label": c["region_label"],
            "is_profile": c["is_profile"],
            "score": round(c["score"], 4),
            "similarity": round(c["similarity"], 4),
            "label": label,
        }
        for c, label in zip(survivors, labels)
    ]
    return ok({"empty": False, "message": None, "results": results})


class NarrateRequest(BaseModel):
    query_text: str
    signal_ids: list[str]


# "Ask the World" — a second, optional call the frontend fires after a search
# already has results, so the (slower, AI-written) narrative never blocks the
# result list itself. Any failure here — a bad id, a Groq rate limit, a
# timeout — degrades to `ok(None)`, not an error: the plain search results
# the user already has stay fully usable either way.
@router.post("/search/narrate")
async def narrate(body: NarrateRequest):
    db = get_db()
    try:
        object_ids = [ObjectId(sid) for sid in body.signal_ids]
    except Exception:
        return ok(None)

    docs_by_id = {}
    async for doc in db.signals.find({"_id": {"$in": object_ids}}):
        docs_by_id[str(doc["_id"])] = doc
    ordered = [docs_by_id[sid] for sid in body.signal_ids if sid in docs_by_id]
    if not ordered:
        return ok(None)

    owner_ids = list({doc["owner_id"] for doc in ordered})
    personas_by_id = {}
    async for persona in db.personas.find({"_id": {"$in": owner_ids}}):
        personas_by_id[persona["_id"]] = persona

    candidates = [
        {
            "signal_id": str(doc["_id"]),
            "owner_id": doc["owner_id"],
            "display_name": personas_by_id.get(doc["owner_id"], {}).get("display_name", "Someone"),
            "region_label": doc["region_label"],
            "raw_text": doc["raw_text"],
        }
        for doc in ordered
    ]

    try:
        narrative = await generate_narrative(body.query_text, candidates)
    except Exception:
        return ok(None)

    return ok(
        {
            "narrative": narrative,
            "citations": [
                {
                    "signal_id": c["signal_id"],
                    "owner_id": c["owner_id"],
                    "display_name": c["display_name"],
                    "region_label": c["region_label"],
                }
                for c in candidates
            ],
        }
    )
