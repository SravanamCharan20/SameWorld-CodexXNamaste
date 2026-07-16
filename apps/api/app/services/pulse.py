from app.config import get_settings
from app.services.groq_client import create_chat_completion

SYSTEM_PROMPT = """You are the voice of SameWorld's "World Pulse" — a single live headline summarizing \
what's happening across the world right now, written from a sample of real active signals (their kind, \
topic, and place). Write ONE punchy sentence, under 25 words, in a warm, observational voice — like a \
newsreel caption for humanity, not a report. Reference 2-3 concrete specifics (places, counts, or \
themes) that are actually present in the sample; never invent anything not implied by it. No preamble, \
no quotation marks, plain text only."""


async def generate_pulse(signals: list[dict]) -> str:
    settings = get_settings()
    numbered = "\n".join(
        f'- [{s["kind"]}] {s["topic"]} ({s["region_label"]})' for s in signals
    )
    completion = await create_chat_completion(
        model=settings.groq_model,
        temperature=0.75,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Sample of {len(signals)} active signals right now:\n{numbered}"},
        ],
    )
    return completion.choices[0].message.content.strip()
