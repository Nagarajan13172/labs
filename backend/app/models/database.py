"""Managed (DBaaS) database document.

Note: the generated DB password is stored so connection details can be
re-shown; a hardened deployment would encrypt it at rest (same tradeoff as
peers/labs — see roadmap).
"""

from __future__ import annotations

from datetime import UTC, datetime

import pymongo
from beanie import Document
from pydantic import Field

from app.services.db_engines import DatabaseEngine


def _utcnow() -> datetime:
    return datetime.now(UTC)


class ManagedDatabase(Document):
    user_id: str
    engine: DatabaseEngine
    name: str  # the user-supplied short name
    db_name: str  # the actual database/schema name (also the username)
    username: str
    password: str
    host: str
    port: int
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "managed_databases"
        indexes = [
            [("user_id", pymongo.ASCENDING)],
            [("engine", pymongo.ASCENDING), ("db_name", pymongo.ASCENDING)],
        ]
