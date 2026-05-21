# syntax=docker/dockerfile:1
# WireGuard gateway image: the same app code + the wg/iproute/iptables tooling
# the privileged control plane needs. Kept separate so the api/worker image
# stays slim and unprivileged.

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
RUN uv pip install --no-cache .

# ---- runtime: wireguard-capable ----
FROM python:3.12-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    wireguard-tools iproute2 iptables procps \
    && rm -rf /var/lib/apt/lists/*

ENV VIRTUAL_ENV=/opt/venv \
    PATH=/opt/venv/bin:$PATH \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY --from=builder /opt/venv /opt/venv
WORKDIR /app
COPY app ./app

EXPOSE 8001
EXPOSE 51820/udp

# Runs as root: it owns the WG interface (NET_ADMIN). Its API surface is tiny.
CMD ["uvicorn", "app.gateway.main:app", "--host", "0.0.0.0", "--port", "8001"]
