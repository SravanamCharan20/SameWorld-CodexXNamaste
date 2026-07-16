import json

from app.config import get_settings
from app.services.groq_client import create_chat_completion

SYSTEM_PROMPT = """You write short opening messages for SameWorld, where people reach out to someone \
based on a specific thing that person posted. Given that person's signal and the name of who's \
reaching out, write exactly 2 short, warm, specific opening messages (each under 20 words) the sender \
could use. Reference a concrete detail from the signal — never a generic "Hi, I saw your post" or "I'm \
interested". Write in the sender's voice, first person, ready to send as-is. Return strict JSON only:

{"suggestions": ["<message 1>", "<message 2>"]}"""


async def generate_icebreakers(raw_text: str, sender_name: str) -> list[str]:
    settings = get_settings()
    completion = await create_chat_completion(
        model=settings.groq_model,
        temperature=0.8,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": f'Sender: {sender_name}\n\nTheir signal: "{raw_text}"',
            },
        ],
    )
    result = json.loads(completion.choices[0].message.content)
    suggestions = result.get("suggestions", [])
    return [s for s in suggestions if isinstance(s, str) and s.strip()][:2]
