"""MongoDB access for the ManagedDatabase document."""

from __future__ import annotations

from beanie import PydanticObjectId

from app.models.database import ManagedDatabase
from app.services.db_engines import DatabaseEngine


async def list_for_user(user_id: str) -> list[ManagedDatabase]:
    return await ManagedDatabase.find(ManagedDatabase.user_id == user_id).to_list()


async def count_for_user(user_id: str) -> int:
    return await ManagedDatabase.find(ManagedDatabase.user_id == user_id).count()


async def get_for_user(db_id: str, user_id: str) -> ManagedDatabase | None:
    try:
        doc = await ManagedDatabase.get(PydanticObjectId(db_id))
    except Exception:
        return None
    return doc if doc and doc.user_id == user_id else None


async def exists(engine: DatabaseEngine, db_name: str) -> bool:
    return (
        await ManagedDatabase.find(
            ManagedDatabase.engine == engine, ManagedDatabase.db_name == db_name
        ).count()
        > 0
    )


async def create(doc: ManagedDatabase) -> ManagedDatabase:
    return await doc.insert()


async def delete(doc: ManagedDatabase) -> None:
    await doc.delete()
