from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.qdrant import ensure_collection
from app.routers import auth, health, search, signals

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
app.include_router(auth.router)
app.include_router(signals.router)
app.include_router(search.router)
