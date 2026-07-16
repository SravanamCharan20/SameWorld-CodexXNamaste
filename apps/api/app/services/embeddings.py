import asyncio
from functools import lru_cache

from app.config import get_settings


@lru_cache
def _get_model():
    from sentence_transformers import SentenceTransformer

    settings = get_settings()
    return SentenceTransformer(settings.embedding_model_name)


async def embed(text: str) -> list[float]:
    loop = asyncio.get_running_loop()
    vector = await loop.run_in_executor(None, lambda: _get_model().encode(text, normalize_embeddings=True))
    return vector.tolist()
