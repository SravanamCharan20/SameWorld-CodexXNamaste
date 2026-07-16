import json

from app.config import get_settings
from app.services.groq_client import get_groq_client

SYSTEM_PROMPT = """You extract structured metadata from a short text signal for SameWorld's open \
semantic search index. Given the raw text, return strict JSON only:

{
  "intent": one of "need" | "offer" | "question" | "experience" | "goal" | "opinion" | "moment" | "other",
  "topic": a short phrase (3-6 words) summarizing what the text is about,
  "tags": array of 1-4 short lowercase single-or-two-word tags (skills/topics/interests mentioned),
  "suggested_kind": "NOW" if this reads as urgent/immediate/expires in hours (e.g. "right now",
     a same-day plan, a passing mood), or "OPEN" if it reads as longer-standing (e.g. an offer,
     an experience, a multi-week plan)
}

intent is a soft ranking hint only, never a hard filter — pick the single best fit, and use "other"
if genuinely nothing fits."""


async def extract_intent(text: str) -> dict:
    settings = get_settings()
    client = get_groq_client()
    completion = await client.chat.completions.create(
        model=settings.groq_model,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": text},
        ],
    )
    result = json.loads(completion.choices[0].message.content)
    intent = result.get("intent", "other")
    if intent not in ("need", "offer", "question", "experience", "goal", "opinion", "moment", "other"):
        intent = "other"
    kind = result.get("suggested_kind", "NOW")
    if kind not in ("NOW", "OPEN"):
        kind = "NOW"
    return {
        "intent": intent,
        "topic": result.get("topic", "")[:120],
        "tags": [t.lower() for t in result.get("tags", [])][:4],
        "suggested_kind": kind,
    }
