"""Liveness and readiness probes."""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.db.mongo import ping_mongo
from app.db.redis import ping_redis
from app.messaging.mqtt import ping_mqtt
from app.schemas.common import ResponseEnvelope, ok

router = APIRouter(tags=["Health"])


@router.get("/healthz", response_model=ResponseEnvelope[None])
async def healthz() -> ResponseEnvelope[None]:
    """Liveness: the process is up."""
    return ok("ok")


@router.get("/readyz", response_model=ResponseEnvelope[dict])
async def readyz(response: Response) -> ResponseEnvelope[dict]:
    """Readiness: all critical dependencies reachable."""
    checks = {
        "mongo": await _safe(ping_mongo),
        "redis": await _safe(ping_redis),
        "mqtt": await _safe(ping_mqtt),
    }
    healthy = all(checks.values())
    if not healthy:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return ResponseEnvelope[dict](
        message="ready" if healthy else "degraded", status=healthy, data=checks
    )


async def _safe(check) -> bool:  # type: ignore[no-untyped-def]
    try:
        return bool(await check())
    except Exception:
        return False
