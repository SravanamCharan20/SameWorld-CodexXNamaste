import json

from app.config import get_settings
from app.services.groq_client import get_groq_client

SYSTEM_PROMPT = """You write short, natural relationship labels explaining why each candidate result is \
relevant to a search query on SameWorld. Given the query and a numbered list of candidates (their text \
and intent), return strict JSON only:

{"labels": ["<label for candidate 1>", "<label for candidate 2>", ...]}

Each label is 3-6 words, lowercase except proper nouns, no trailing period. Prefer a natural,
specific phrase such as "can help with this", "shares your interest", "asked something you've lived
through", "offering the same thing", "heading to the same place" — pick whatever genuinely fits that
candidate. Never force a need/offer-style label onto a match that isn't actually that; fall back to
"relevant right now" only when nothing more specific fits. Return exactly one label per candidate, in
order."""


async def generate_labels(query_text: str, candidates: list[dict]) -> list[str]:
    if not candidates:
        return []
    settings = get_settings()
    client = get_groq_client()
    numbered = "\n".join(
        f"{i + 1}. [{c['intent']}] {c['raw_text']}" for i, c in enumerate(candidates)
    )
    completion = await client.chat.completions.create(
        model=settings.groq_model,
        temperature=0.3,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Query: {query_text}\n\nCandidates:\n{numbered}"},
        ],
    )
    result = json.loads(completion.choices[0].message.content)
    labels = result.get("labels", [])
    if len(labels) != len(candidates):
        labels = (labels + ["relevant right now"] * len(candidates))[: len(candidates)]
    return labels
