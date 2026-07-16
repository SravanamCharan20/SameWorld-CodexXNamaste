import asyncio
import logging
from functools import lru_cache

from groq import AsyncGroq, RateLimitError

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_RETRIES = 4
DEFAULT_BACKOFF_SECONDS = 10.0


@lru_cache
def get_groq_client() -> AsyncGroq:
    settings = get_settings()
    return AsyncGroq(api_key=settings.groq_api_key)


async def ping_groq() -> bool:
    client = get_groq_client()
    await client.models.list()
    return True


def _retry_delay(error: RateLimitError, attempt: int) -> float:
    retry_after = getattr(getattr(error, "response", None), "headers", {}).get("retry-after")
    if retry_after:
        try:
            return float(retry_after)
        except ValueError:
            pass
    return DEFAULT_BACKOFF_SECONDS * (2**attempt)


async def create_chat_completion(**kwargs):
    """client.chat.completions.create with retry/backoff on rate limits — free-tier
    Groq TPD limits are a real risk under seeding load (§16), and this keeps a single
    burst from taking down every AI call in the app."""
    client = get_groq_client()
    for attempt in range(MAX_RETRIES + 1):
        try:
            return await client.chat.completions.create(**kwargs)
        except RateLimitError as e:
            if attempt == MAX_RETRIES:
                raise
            delay = _retry_delay(e, attempt)
            logger.warning("Groq rate limited, retrying in %.1fs (attempt %d)", delay, attempt + 1)
            await asyncio.sleep(delay)
