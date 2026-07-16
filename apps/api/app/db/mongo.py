from functools import lru_cache

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import get_settings


@lru_cache
def get_mongo_client() -> AsyncIOMotorClient:
    settings = get_settings()
    return AsyncIOMotorClient(settings.mongodb_uri)


def get_db() -> AsyncIOMotorDatabase:
    settings = get_settings()
    return get_mongo_client()[settings.mongodb_db_name]


async def ping_mongo() -> bool:
    await get_mongo_client().admin.command("ping")
    return True
