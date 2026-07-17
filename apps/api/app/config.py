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

    # Deployed frontend baked in as a default so CORS works out of the box
    # even if CORS_ORIGINS never gets set on the host. Kept as a plain str
    # (not list[str]): pydantic-settings JSON-decodes env values for list
    # fields *before* any validator runs, so a plain comma-separated env var
    # (the natural format for a dashboard text field) crashes at startup
    # with a SettingsError instead of being parsed — a str field sidesteps
    # that entirely. See cors_origins_list below for the parsed form.
    cors_origins: str = (
        "http://localhost:3000,https://same-world-codex-x-namaste.vercel.app"
    )

    @property
    def cors_origins_list(self) -> list[str]:
        raw = self.cors_origins.strip()
        if raw.startswith("["):
            import json

            return json.loads(raw)
        return [origin.strip() for origin in raw.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
