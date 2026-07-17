---
title: SameWorld API
emoji: 🌍
colorFrom: indigo
colorTo: yellow
sdk: docker
app_port: 7860
pinned: false
---

# SameWorld API

FastAPI backend for SameWorld — a real-time human-intent search engine.
Talks to MongoDB Atlas, Qdrant Cloud, Upstash Redis, and Groq; embeds queries
locally with `sentence-transformers/all-MiniLM-L6-v2`.

Health check: `GET /health`

Required environment variables (set as Space secrets):

- `MONGODB_URI`, `MONGODB_DB_NAME`
- `QDRANT_URL`, `QDRANT_API_KEY`, `QDRANT_COLLECTION`
- `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`
- `GROQ_API_KEY`, `GROQ_FALLBACK_API_KEYS`, `GROQ_MODEL`
- `EMBEDDING_MODEL_NAME`, `EMBEDDING_DIM`
- `SIMILARITY_THRESHOLD`
- `CORS_ORIGINS` — comma-separated list of allowed frontend origins
