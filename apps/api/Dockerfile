# fastembed (ONNX Runtime) instead of sentence-transformers (PyTorch) means
# no C compiler toolchain is needed for any dependency here, so a single
# stage is already lean — no more multi-stage build/CPU-only-wheel dance.
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Bake the embedding model into the image at build time instead of
# downloading it on first request — fast, predictable cold starts, and no
# runtime dependency on Hugging Face Hub being reachable. Cached under /app
# (not /tmp) — some platforms (Render confirmed) remount /tmp as fresh
# ephemeral scratch space at container start, which silently wipes anything
# written there during the build. embeddings.py reads this same env var, so
# build-time and run-time always agree on the path.
ENV FASTEMBED_CACHE_DIR=/app/.fastembed_cache
RUN python -c "from fastembed import TextEmbedding; import os; TextEmbedding(model_name='sentence-transformers/all-MiniLM-L6-v2', cache_dir=os.environ['FASTEMBED_CACHE_DIR'])"

COPY . .

ENV PYTHONUNBUFFERED=1

# Hugging Face Spaces (Docker SDK) expects the container to listen on 7860
# by default; Render sets $PORT at runtime. Defaulting to 7860 and reading
# $PORT if present covers both without any platform-specific branching.
ENV PORT=7860
EXPOSE 7860

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
