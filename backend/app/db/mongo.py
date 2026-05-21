"""MongoDB connection and Beanie initialization."""

from __future__ import annotations

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.logging import get_logger
from app.models.counter import Counter
from app.models.lab import Lab
from app.models.user import User

log = get_logger("mongo")

_client: AsyncIOMotorClient | None = None

# All Beanie documents must be registered here.
DOCUMENT_MODELS = [User, Lab, Counter]


async def init_mongo() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_url, uuidRepresentation="standard")
    await init_beanie(database=_client[settings.mongodb_db], document_models=DOCUMENT_MODELS)
    log.info("mongo.connected", db=settings.mongodb_db)


async def close_mongo() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
        log.info("mongo.closed")


async def ping_mongo() -> bool:
    if _client is None:
        return False
    await _client.admin.command("ping")
    return True
