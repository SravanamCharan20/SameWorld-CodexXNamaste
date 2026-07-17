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
    for field_name in ("status", "contact_intent"):
        await client.create_payload_index(
            collection_name=settings.qdrant_collection,
            field_name=field_name,
            field_schema=models.PayloadSchemaType.KEYWORD,
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


async def search_candidates(vector: list[float], limit: int = 30) -> list[models.ScoredPoint]:
    settings = get_settings()
    client = get_qdrant_client()
    result = await client.query_points(
        collection_name=settings.qdrant_collection,
        query=vector,
        limit=limit,
        query_filter=models.Filter(
            must=[models.FieldCondition(key="status", match=models.MatchValue(value="active"))],
            must_not=[
                models.FieldCondition(
                    key="contact_intent", match=models.MatchValue(value="just_sharing")
                )
            ],
        ),
    )
    return result.points
