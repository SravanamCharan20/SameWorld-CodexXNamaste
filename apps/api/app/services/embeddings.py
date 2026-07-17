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


# fastembed (ONNX Runtime) instead of sentence-transformers (PyTorch) — torch
# alone carries ~200-300MB of baseline runtime overhead before a model is even
# loaded, which is what blew past Render's free-tier 512MB cap. This ships the
# exact same model (sentence-transformers/all-MiniLM-L6-v2) as an ONNX graph;
# verified the two runtimes produce cosine-similarity 1.0 (max abs diff ~1e-7)
# on real query text, so every embedding already sitting in Qdrant is still
# valid — nothing needs re-indexing.
@lru_cache
def _get_model():
    from fastembed import TextEmbedding

    settings = get_settings()
    return TextEmbedding(model_name=settings.embedding_model_name)


async def warm_model() -> None:
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, _get_model)


async def embed(text: str) -> list[float]:
    loop = asyncio.get_running_loop()

    def _encode() -> list[float]:
        vector = next(iter(_get_model().embed([text])))
        return vector.tolist()

    return await loop.run_in_executor(None, _encode)
