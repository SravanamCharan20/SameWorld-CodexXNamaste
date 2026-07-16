import asyncio

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings
from app.db.qdrant import search_candidates
from app.envelope import ok
from app.services.embeddings import embed
from app.services.explain import generate_labels
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
