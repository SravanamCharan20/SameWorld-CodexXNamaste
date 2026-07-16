import asyncio
import logging
from functools import lru_cache

from groq import AsyncGroq, RateLimitError

from app.config import get_settings

logger = logging.getLogger(__name__)

MAX_ROUNDS = 4
DEFAULT_BACKOFF_SECONDS = 10.0


@lru_cache
def get_groq_clients() -> tuple[AsyncGroq, ...]:
    settings = get_settings()
    keys = [settings.groq_api_key]
    if settings.groq_fallback_api_keys:
        keys += [k.strip() for k in settings.groq_fallback_api_keys.split(",") if k.strip()]
    return tuple(AsyncGroq(api_key=key) for key in keys)


def get_groq_client() -> AsyncGroq:
    """The primary client — used for the /health ping only. Everything else
    goes through create_chat_completion, which round-robins all keys."""
    return get_groq_clients()[0]


async def ping_groq() -> bool:
    await get_groq_client().models.list()
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
    """client.chat.completions.create with multi-key fallback + retry/backoff —
    free-tier Groq TPD limits are a real risk under seeding load (§16). Tries
    every configured key before sleeping, so one exhausted key doesn't stall
    every AI call in the app."""
    clients = get_groq_clients()
    last_error: RateLimitError | None = None
    for round_num in range(MAX_ROUNDS + 1):
        for key_index, client in enumerate(clients):
            try:
                return await client.chat.completions.create(**kwargs)
            except RateLimitError as e:
                last_error = e
                logger.warning("Groq key #%d rate limited", key_index)
        if round_num == MAX_ROUNDS:
            raise last_error
        delay = _retry_delay(last_error, round_num)
        logger.warning(
            "All %d Groq key(s) rate limited, retrying in %.1fs (round %d)",
            len(clients), delay, round_num + 1,
        )
        await asyncio.sleep(delay)
