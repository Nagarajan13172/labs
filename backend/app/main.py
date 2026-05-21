"""FastAPI application factory and lifespan wiring."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1.router import api_router
from app.api.v1.routes import health
from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import RequestContextMiddleware, configure_logging, get_logger
from app.core.ratelimit import limiter
from app.db.mongo import close_mongo, init_mongo
from app.db.redis import close_redis, init_redis

log = get_logger("app")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    await init_mongo()
    await init_redis()
    log.info("app.startup", environment=settings.environment)
    yield
    await close_redis()
    await close_mongo()
    log.info("app.shutdown")


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url=None if settings.is_production else "/docs",
        redoc_url=None,
        lifespan=lifespan,
    )

    # Rate limiting
    app.state.limiter = limiter
    # slowapi's handler signature is narrower than Starlette's generic type.
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    # Middleware
    app.add_middleware(RequestContextMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Error handlers (custom envelope)
    register_exception_handlers(app)

    # Routes
    app.include_router(health.router)
    app.include_router(api_router, prefix=settings.api_v1_prefix)

    # Metrics at /metrics
    Instrumentator().instrument(app).expose(app, include_in_schema=False)

    return app


app = create_app()
