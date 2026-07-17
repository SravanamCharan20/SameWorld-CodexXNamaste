# Multi-stage build — build-essential and pip's own caches/wheels only exist
# in the builder stage; the final image just gets the installed packages,
# which meaningfully shrinks what actually ships (torch + transformers are
# heavy enough on their own without also carrying a C compiler toolchain).
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# CPU-only torch — the default PyPI wheel bundles CUDA and is several times
# larger for zero benefit on a CPU-only deploy target (Render/HF Spaces free
# tiers have no GPU).
RUN pip install --no-cache-dir --prefix=/install torch==2.13.0 --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Bake the embedding model into the image at build time instead of
# downloading it on first request — makes cold starts fast and removes a
# runtime dependency on Hugging Face Hub being reachable.
ENV PYTHONPATH=/install/lib/python3.12/site-packages
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')" \
    && mkdir -p /install/cache && cp -r /root/.cache/huggingface /install/cache/huggingface

FROM python:3.12-slim

WORKDIR /app

COPY --from=builder /install /usr/local
COPY --from=builder /install/cache/huggingface /root/.cache/huggingface
COPY . .

ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces (Docker SDK) expects the container to listen on 7860
# by default; Render sets $PORT at runtime. Defaulting to 7860 and reading
# $PORT if present covers both without any platform-specific branching.
ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
