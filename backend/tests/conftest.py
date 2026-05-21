"""Test fixtures.

- MongoDB: a real, ephemeral instance via testcontainers (requires Docker).
- Redis: in-memory via fakeredis.
- Email & MQTT: stubbed; verification/reset tokens are captured so the full
  auth flow can be exercised end-to-end.
"""

from __future__ import annotations

import os
import uuid

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-not-for-production-use-only")
os.environ.setdefault("ENVIRONMENT", "development")
os.environ.setdefault("ALLOWED_EMAIL_DOMAINS", "")  # allow any domain in tests

import app.db.mongo as mongo_mod
import app.db.redis as redis_mod
import fakeredis.aioredis
import pytest
import pytest_asyncio
from app.models.user import User
from beanie import init_beanie
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from testcontainers.mongodb import MongoDbContainer


@pytest.fixture(scope="session")
def mongo_url() -> str:
    """Start a throwaway MongoDB for the whole test session."""
    with MongoDbContainer("mongo:7") as mongo:
        yield mongo.get_connection_url()


@pytest_asyncio.fixture
async def captured() -> dict[str, str]:
    return {}


@pytest_asyncio.fixture
async def client(
    monkeypatch: pytest.MonkeyPatch, captured: dict[str, str], mongo_url: str
) -> AsyncClient:
    # --- fake redis ---
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    redis_mod._redis = fake_redis

    # --- real mongo (isolated db per test) via Beanie ---
    motor_client: AsyncIOMotorClient = AsyncIOMotorClient(mongo_url, uuidRepresentation="standard")
    db_name = f"test_{uuid.uuid4().hex}"
    mongo_mod._client = motor_client
    await init_beanie(database=motor_client[db_name], document_models=[User])

    # --- stub outbound email, capturing the tokens ---
    async def _capture_verify(recipient: str, token: str) -> None:
        captured["verify"] = token

    async def _capture_reset(recipient: str, token: str) -> None:
        captured["reset"] = token

    monkeypatch.setattr("app.services.email_service.send_verification_email", _capture_verify)
    monkeypatch.setattr("app.services.email_service.send_password_reset_email", _capture_reset)

    from app.main import create_app

    application = create_app()
    application.state.limiter.enabled = False  # don't hit redis storage for limits

    transport = ASGITransport(app=application)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    await motor_client.drop_database(db_name)
    motor_client.close()
    await fake_redis.aclose()
    redis_mod._redis = None
    mongo_mod._client = None
