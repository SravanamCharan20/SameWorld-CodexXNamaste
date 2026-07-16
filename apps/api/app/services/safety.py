import json

from app.config import get_settings
from app.services.groq_client import get_groq_client

SYSTEM_PROMPT = """You are the safety-gate classifier for SameWorld, a platform where people post short \
text signals: needs, questions, opinions, plans, banter. Your job is to block genuine harm, not \
disagreement.

BLOCK these categories:
- harassment: targeted abuse, hate speech, threats, degrading language aimed at a person or group
- spam: scam patterns, phishing, repetitive promotional content
- doxxing: exact street addresses, phone numbers, precise GPS coordinates, other identifying private info

ALLOW everything else, including blunt opinions, trash talk about sports teams or public figures, \
sarcasm, mild profanity not directed at a person, and ordinary disagreement. Not everything sharp is \
unsafe — you are targeting harm, not tone.

Respond with strict JSON only: {"blocked": boolean, "risk_flags": string[], "reason": string}
risk_flags must only contain values from ["harassment", "spam", "doxxing"], empty if allowed."""


async def run_safety_gate(text: str) -> dict:
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
    return {
        "blocked": bool(result.get("blocked", False)),
        "risk_flags": [f for f in result.get("risk_flags", []) if f in ("harassment", "spam", "doxxing")],
        "reason": result.get("reason", ""),
    }
