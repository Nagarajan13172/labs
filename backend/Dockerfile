# syntax=docker/dockerfile:1
# ---- builder: install deps into a venv with uv ----
FROM python:3.12-slim AS builder

COPY --from=ghcr.io/astral-sh/uv:0.5.4 /uv /usr/local/bin/uv

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH

WORKDIR /app
RUN uv venv /opt/venv
COPY pyproject.toml ./
# Resolve & install runtime dependencies into the venv.
RUN uv pip install --no-cache .

# ---- runtime: slim image, non-root ----
FROM python:3.12-slim AS runtime

ENV VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN groupadd --system app && useradd --system --gid app --create-home app

COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY app ./app

USER app
EXPOSE 8000

# Default command runs the API; the worker service overrides this in compose.
CMD ["gunicorn", "app.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "2", "--bind", "0.0.0.0:8000", "--access-logfile", "-"]
