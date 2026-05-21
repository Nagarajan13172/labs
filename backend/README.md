# Youngstorage Backend

A professional, from-scratch rebuild of the Youngstorage labs-platform backend.
This repository currently contains the **Foundation phase**: a production-grade
FastAPI skeleton with infrastructure, configuration, authentication, users,
observability, background jobs, tests, and CI. The harder orchestration (lab
containers, WireGuard, Traefik domains, DB-as-a-service) is deferred to later
phases — the architecture leaves clean seams for it.

## Stack

| Concern            | Choice                                   |
|--------------------|------------------------------------------|
| Web framework      | FastAPI (async) + Uvicorn/Gunicorn       |
| Database           | MongoDB via Beanie (async ODM on Motor)  |
| Cache / blocklist  | Redis                                    |
| Background jobs    | Celery (+ Flower UI), Redis broker       |
| Real-time          | RabbitMQ MQTT (`aiomqtt`)                |
| Auth               | Custom JWT (access + refresh), bcrypt    |
| Email (dev)        | MailHog                                  |
| Reverse proxy      | Traefik                                  |
| Config             | pydantic-settings (typed, fail-fast)     |
| Logging            | structlog (JSON) + request-id middleware |
| Tests / quality    | pytest, ruff, black, mypy, pre-commit    |

## Quick start

```bash
cp .env.example .env          # then set JWT_SECRET_KEY
make up                       # build & start the whole stack
curl localhost:8000/healthz   # -> {"message":"ok","status":true,...}
curl localhost:8000/readyz    # checks Mongo / Redis / RabbitMQ
```

Interactive API docs (dev only): http://localhost:8000/docs

### Dashboards (dev)

| Service   | URL                       |
|-----------|---------------------------|
| API docs  | http://localhost:8000/docs |
| MailHog   | http://localhost:8025     |
| Flower    | http://localhost:5555     |
| RabbitMQ  | http://localhost:15672    |
| Traefik   | http://localhost:8080     |

## Auth flow

1. `POST /api/v1/auth/signup` → creates user, emails a verification link (see MailHog).
2. Click the link → `GET /api/v1/auth/verify-email?token=...`.
3. `POST /api/v1/auth/signin` → returns `{access_token, refresh_token}`.
4. Call protected routes with `Authorization: Bearer <access_token>`.
5. `POST /api/v1/auth/refresh` → rotates the token pair (old refresh revoked).
6. `POST /api/v1/auth/logout` → revokes the current refresh token.
7. `POST /api/v1/auth/forgot-password` → emails a one-time reset link.
8. `POST /api/v1/auth/reset-password` → consumes the one-time token.

## Local development (without Docker)

```bash
make install      # uv pip install -e ".[dev]"
make lint         # ruff + black --check + mypy
make test         # pytest
```

## Project layout

See `app/` — layered as `api → services → repositories → models`, with `core`
(config/security/logging/exceptions), `db` (mongo/redis), `messaging` (mqtt),
and `workers` (celery).

## Labs (Phase 2 — container provisioning)

Each user gets one lab: a container (default `codercom/code-server`, browser VS
Code) on the `youngstorage_labs` bridge network with an atomically-allocated
static IP, a persistent home volume, and resource limits. Builds/starts run in a
Celery task that streams progress to MQTT topic `/topic/<username>`.

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/labs/deploy` | Create or redeploy the lab (async; returns 202) |
| `GET /api/v1/labs` | Lab + live container status |
| `GET /api/v1/labs/credentials` | code-server password + published host port |
| `POST /api/v1/labs/stop` · `/start` | Stop / start the container |
| `DELETE /api/v1/labs` | Destroy container + volume, release the IP |

> The api and worker mount `/var/run/docker.sock` and run as root in dev so they
> can drive Docker. Production should use a Docker socket proxy or rootless setup.

## Roadmap

- **Phase 2 — DONE** ✅ Lab container provisioning (Celery + Docker SDK), atomic IP allocator.
- **Phase 3** — WireGuard peers via a scoped privileged helper (no root password in app).
- **Phase 4** — Traefik dynamic domains + DNS verification (route labs by hostname instead of host port).
- **Phase 5** — DB-as-a-service (MySQL/MariaDB/MongoDB).
