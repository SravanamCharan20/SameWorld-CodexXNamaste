from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db.qdrant import ensure_collection
from app.routers import auth, connections, conversations, globe, health, profile, search, signals
from app.services.embeddings import warm_model

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.qdrant_url:
        await ensure_collection()
    await warm_model()
    yield


app = FastAPI(title="SameWorld API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(signals.router)
app.include_router(search.router)
app.include_router(globe.router)
app.include_router(profile.router)
app.include_router(connections.router)
app.include_router(conversations.router)
