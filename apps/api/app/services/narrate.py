from app.config import get_settings
from app.services.groq_client import create_chat_completion

SYSTEM_PROMPT = """You are the voice of SameWorld, a live map of what people around the world need, \
offer, and are doing right now. Given a person's search query and a short list of real, currently \
active signals that matched it (each with the person's name, place, and what they wrote), write a \
short, warm, second-person narrative (2-4 sentences, under 70 words) that answers the query by \
weaving in specific people by name and place — as if you're a well-connected friend who happens to \
know exactly who to point them to. Only reference people actually in the list; never invent anyone \
or any fact not present in it. No preamble, no "Based on the search results" — just the answer \
itself, plain text, no markdown."""


async def generate_narrative(query_text: str, candidates: list[dict]) -> str:
    settings = get_settings()
    numbered = "\n".join(
        f'- {c["display_name"]} in {c["region_label"]}: "{c["raw_text"]}"' for c in candidates
    )
    completion = await create_chat_completion(
        model=settings.groq_model,
        temperature=0.6,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Query: {query_text}\n\nMatches:\n{numbered}"},
        ],
    )
    return completion.choices[0].message.content.strip()
