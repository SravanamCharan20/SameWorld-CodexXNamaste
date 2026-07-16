import json

from app.config import get_settings
from app.services.groq_client import get_groq_client

SYSTEM_PROMPT = """You extract advisory search metadata from a free-text query on SameWorld, an open \
human-intent search engine. Given the query, return strict JSON only:

{
  "intent": one of "need" | "offer" | "question" | "experience" | "goal" | "opinion" | "moment" | "other",
  "topic": a short phrase (3-6 words) summarizing what is being searched for,
  "tags": array of 0-4 short lowercase tags implied by the query,
  "region_filter": a region/city name mentioned in the query, or null if none is mentioned
}

This is advisory only — never treat it as a hard filter. If the query is vague, still make a best-effort
guess rather than refusing."""


async def understand_query(query_text: str) -> dict:
    settings = get_settings()
    client = get_groq_client()
    completion = await client.chat.completions.create(
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
    }
