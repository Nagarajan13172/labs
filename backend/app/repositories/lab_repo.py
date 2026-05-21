"""MongoDB access for the Lab document."""

from __future__ import annotations

from beanie import PydanticObjectId

from app.models.lab import Lab


async def get_by_user(user_id: str) -> Lab | None:
    return await Lab.find_one(Lab.user_id == user_id)


async def get_by_id(lab_id: str) -> Lab | None:
    try:
        return await Lab.get(PydanticObjectId(lab_id))
    except Exception:
        return None


async def create(lab: Lab) -> Lab:
    return await lab.insert()


async def save(lab: Lab) -> Lab:
    lab.touch()
    return await lab.save()


async def delete(lab: Lab) -> None:
    await lab.delete()
