"""Database-as-a-service orchestration.

Each "database" provisions an isolated database plus a dedicated, scoped user
with a generated password on the shared engine server. Engine work runs in a
threadpool (the drivers are synchronous); bookkeeping lives in our Mongo.
"""

from __future__ import annotations

import asyncio

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.core.security import generate_password
from app.models.database import ManagedDatabase
from app.models.user import User
from app.repositories import database_repo
from app.services import db_engines
from app.services.db_engines import DatabaseEngine

log = get_logger("dbaas")


def _sanitize_username(username: str) -> str:
    cleaned = "".join(c if c.isalnum() else "_" for c in username.lower())
    return cleaned.strip("_") or "user"


def list_engines() -> list[dict]:
    out = []
    for engine in db_engines.enabled_engines():
        spec = db_engines.get_spec(engine)
        out.append({"engine": engine.value, "host": spec.public_host, "port": spec.public_port})
    return out


async def list_databases(user: User) -> list[ManagedDatabase]:
    return await database_repo.list_for_user(str(user.id))


async def create_database(user: User, engine: DatabaseEngine, name: str) -> ManagedDatabase:
    spec = db_engines.get_spec(engine)  # raises if engine not enabled

    if await database_repo.count_for_user(str(user.id)) >= settings.dbaas_max_databases:
        raise ConflictError(f"Maximum of {settings.dbaas_max_databases} databases reached")

    db_name = f"{_sanitize_username(user.username)}_{name.lower()}"
    db_engines.validate_identifier(db_name)  # also bounds length for the username

    if await database_repo.exists(engine, db_name):
        raise ConflictError(f"Database '{db_name}' already exists on {engine.value}")

    password = generate_password()
    await asyncio.to_thread(db_engines.create_database, spec, db_name, db_name, password)

    doc = ManagedDatabase(
        user_id=str(user.id),
        engine=engine,
        name=name,
        db_name=db_name,
        username=db_name,
        password=password,
        host=spec.public_host,
        port=spec.public_port,
    )
    doc = await database_repo.create(doc)
    log.info("dbaas.created", db_id=str(doc.id), engine=engine.value, db_name=db_name)
    return doc


async def delete_database(user: User, db_id: str) -> None:
    doc = await database_repo.get_for_user(db_id, str(user.id))
    if doc is None:
        raise NotFoundError("Database not found")
    spec = db_engines.get_spec(doc.engine)
    await asyncio.to_thread(db_engines.drop_database, spec, doc.db_name, doc.username)
    await database_repo.delete(doc)
    log.info("dbaas.deleted", db_id=db_id)


def validate_name(name: str) -> None:
    """Validate the user-supplied short name (before prefixing)."""
    if not name or not name.replace("_", "").isalnum() or len(name) > 24:
        raise ValidationError("Name must be alphanumeric/underscore, max 24 chars")
