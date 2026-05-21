"""Redis client used for the JWT blocklist, one-time tokens, and caching."""

from __future__ import annotations

from collections.abc import Awaitable
from typing import cast

import redis.asyncio as aioredis

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("redis")

_redis: aioredis.Redis | None = None


async def init_redis() -> None:
    global _redis
    _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    await cast("Awaitable[bool]", _redis.ping())
    log.info("redis.connected")


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None
        log.info("redis.closed")


def get_redis() -> aioredis.Redis:
    if _redis is None:
        raise RuntimeError("Redis is not initialized")
    return _redis


async def ping_redis() -> bool:
    if _redis is None:
        return False
    return bool(await cast("Awaitable[bool]", _redis.ping()))
