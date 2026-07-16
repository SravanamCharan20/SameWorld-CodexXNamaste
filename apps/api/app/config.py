from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongodb_uri: str = ""
    mongodb_db_name: str = "sameworld"

    qdrant_url: str = ""
    qdrant_api_key: str = ""
    qdrant_collection: str = "signals"

    upstash_redis_url: str = ""
    upstash_redis_token: str = ""

    groq_api_key: str = ""
    # Comma-separated extra keys, tried in order when the primary key hits its
    # rate limit — round-robins across all keys before falling back to waiting.
    groq_fallback_api_keys: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    embedding_model_name: str = "sentence-transformers/all-MiniLM-L6-v2"
    embedding_dim: int = 384

    # Re-calibrated per §5 against the combined score (similarity + boosts), full
    # 140-signal corpus — see scripts/calibrate_threshold.py and .env for the note
    # on why 0.45, not the naive dissimilar-max formula output.
    similarity_threshold: float = 0.45

    cors_origins: list[str] = ["http://localhost:3000"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
