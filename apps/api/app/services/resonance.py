import math

from app.config import get_settings
from app.services.groq_client import create_chat_completion

RESONANCE_SYSTEM_PROMPT = """Two unrelated people just posted on SameWorld, in different parts of the \
world, and their signals turned out to be a striking match — that's a "resonance". Given both signals, \
write ONE short, warm sentence (under 22 words) naming why they resonate. Plain text, no preamble, no \
quotation marks."""


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def best_cross_owner_pair(points: list) -> tuple[tuple, float] | None:
    """O(n^2) over a capped sample (≤60 points) — trivial at this scale, and
    simpler/cheaper than standing up a background job for a hackathon-sized
    corpus."""
    best_pair = None
    best_score = -1.0
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            p1, p2 = points[i], points[j]
            if p1.payload.get("owner_id") == p2.payload.get("owner_id"):
                continue
            score = cosine_similarity(p1.vector, p2.vector)
            if score > best_score:
                best_score = score
                best_pair = (p1, p2)
    if best_pair is None:
        return None
    return best_pair, best_score


async def generate_resonance_note(text_a: str, text_b: str) -> str:
    settings = get_settings()
    completion = await create_chat_completion(
        model=settings.groq_model,
        temperature=0.7,
        messages=[
            {"role": "system", "content": RESONANCE_SYSTEM_PROMPT},
            {"role": "user", "content": f'Signal A: "{text_a}"\n\nSignal B: "{text_b}"'},
        ],
    )
    return completion.choices[0].message.content.strip()
