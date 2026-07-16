from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.qdrant import ensure_collection
from app.routers import health

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.qdrant_url:
        await ensure_collection()
    yield


app = FastAPI(title="SameWorld API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
