import asyncio
import os
from functools import lru_cache

from app.config import get_settings

# The model is downloaded once and cached locally — after that, skip HF Hub's
# "check for updates" network calls entirely. Without this, every embed() call
# could retry HTTP HEAD requests against huggingface.co (5 retries, exponential
# backoff up to 8s each) inside a thread-pool executor slot, and enough of those
# piling up concurrently starves the executor for everything else.
os.environ.setdefault("HF_HUB_OFFLINE", "1")


@lru_cache
def _get_model():
    from sentence_transformers import SentenceTransformer

    settings = get_settings()
    return SentenceTransformer(settings.embedding_model_name)


async def warm_model() -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _get_model)


async def embed(text: str) -> list[float]:
    loop = asyncio.get_running_loop()
    vector = await loop.run_in_executor(None, lambda: _get_model().encode(text, normalize_embeddings=True))
    return vector.tolist()
