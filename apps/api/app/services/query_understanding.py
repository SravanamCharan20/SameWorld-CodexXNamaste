import json

from app.config import get_settings
from app.services.groq_client import create_chat_completion

SYSTEM_PROMPT = """You extract search metadata from a free-text query on SameWorld, an open \
human-intent search engine. Given the query, return strict JSON only:

{
  "intent": one of "need" | "offer" | "question" | "experience" | "goal" | "opinion" | "moment" | "other",
  "topic": a short phrase (3-6 words) summarizing what is being searched for,
  "tags": array of 0-4 short lowercase tags implied by the query,
  "region_filter": a region/city/country name mentioned in the query, or null if none is mentioned,
  "region_required": true if the query explicitly wants people FROM that place (e.g. "USA people",
    "only people in Berlin", "folks based in Japan", "I want Kenyan responses"), false if the place is
    just mentioned as a topic/destination/incidental detail (e.g. "planning a trip to Japan",
    "thoughts on NYC pizza") rather than a constraint on who should match. Default false when unsure —
    only true for a clear, explicit ask about the responder's own location.
}

If the query is vague, still make a best-effort guess rather than refusing."""


async def understand_query(query_text: str) -> dict:
    settings = get_settings()
    completion = await create_chat_completion(
        model=settings.groq_model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": query_text},
        ],
    )
    result = json.loads(completion.choices[0].message.content)
    intent = result.get("intent", "other")
    if intent not in ("need", "offer", "question", "experience", "goal", "opinion", "moment", "other"):
        intent = "other"
    return {
        "intent": intent,
        "topic": result.get("topic", "")[:120],
        "tags": [t.lower() for t in result.get("tags", [])][:4],
        "region_filter": result.get("region_filter") or None,
        "region_required": bool(result.get("region_required", False)),
    }
