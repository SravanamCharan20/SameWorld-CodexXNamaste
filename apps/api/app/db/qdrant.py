from functools import lru_cache

from qdrant_client import AsyncQdrantClient, models

from app.config import get_settings


@lru_cache
def get_qdrant_client() -> AsyncQdrantClient:
    settings = get_settings()
    return AsyncQdrantClient(url=settings.qdrant_url, api_key=settings.qdrant_api_key)


async def ensure_collection() -> None:
    settings = get_settings()
    client = get_qdrant_client()
    exists = await client.collection_exists(settings.qdrant_collection)
    if not exists:
        await client.create_collection(
            collection_name=settings.qdrant_collection,
            vectors_config=models.VectorParams(
                size=settings.embedding_dim, distance=models.Distance.COSINE
            ),
        )


async def ping_qdrant() -> bool:
    client = get_qdrant_client()
    await client.get_collections()
    return True


async def upsert_signal_point(point_id: str, vector: list[float], payload: dict) -> None:
    settings = get_settings()
    client = get_qdrant_client()
    await client.upsert(
        collection_name=settings.qdrant_collection,
        points=[models.PointStruct(id=point_id, vector=vector, payload=payload)],
    )


async def delete_signal_point(point_id: str) -> None:
    settings = get_settings()
    client = get_qdrant_client()
    await client.delete(
        collection_name=settings.qdrant_collection,
        points_selector=models.PointIdsList(points=[point_id]),
    )
