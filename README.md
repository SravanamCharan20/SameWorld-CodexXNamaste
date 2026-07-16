# SameWorld

Find the human you need, when you need them. Search humans, not profiles.

Built for the OpenAI Codex Hackathon — NamasteDev, July 2026.

## Structure

```
apps/
  web/   Next.js 14 + TypeScript frontend (Tailwind, Framer Motion, react-globe.gl)
  api/   FastAPI backend (MongoDB Atlas, Qdrant Cloud, Upstash Redis, Groq)
```

## Running locally

**Backend**
```
cd apps/api
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend**
```
cd apps/web
npm run dev
```

Visit `http://localhost:3000` — the home page is a live system-status dashboard
that polls the backend `/health` endpoint and shows connection status for every
service as credentials are added to `apps/api/.env`.

## Environment

Copy `apps/api/.env.example` to `apps/api/.env` and fill in:
- `MONGODB_URI` — MongoDB Atlas connection string
- `QDRANT_URL` / `QDRANT_API_KEY` — Qdrant Cloud cluster
- `UPSTASH_REDIS_URL` / `UPSTASH_REDIS_TOKEN` — Upstash Redis REST credentials
- `GROQ_API_KEY` — Groq API key

The backend runs with `--reload`, so newly added credentials take effect
without a manual restart — just refresh the status page.
