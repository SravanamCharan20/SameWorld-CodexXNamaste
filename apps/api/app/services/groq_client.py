from functools import lru_cache

from groq import AsyncGroq

from app.config import get_settings


@lru_cache
def get_groq_client() -> AsyncGroq:
    settings = get_settings()
    return AsyncGroq(api_key=settings.groq_api_key)


async def ping_groq() -> bool:
    client = get_groq_client()
    await client.models.list()
    return True
