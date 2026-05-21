"""Synchronous MongoDB access for Celery tasks.

Celery workers are synchronous, so they use a plain (sync) pymongo client
instead of the async Motor/Beanie stack the API uses. Both operate on the same
``labs`` collection; this module only touches the fields the provisioning task
needs to read/update.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from pymongo import MongoClient

from app.core.config import settings

_client: MongoClient | None = None


def _labs():  # type: ignore[no-untyped-def]
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_url, uuidRepresentation="standard")
    return _client[settings.mongodb_db]["labs"]


def get_lab(lab_id: str) -> dict[str, Any] | None:
    return _labs().find_one({"_id": ObjectId(lab_id)})


def update_lab(lab_id: str, **fields: Any) -> None:
    fields["updated_at"] = datetime.now(UTC)
    _labs().update_one({"_id": ObjectId(lab_id)}, {"$set": fields})
