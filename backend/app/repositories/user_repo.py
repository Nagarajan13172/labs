"""All MongoDB access for the User document lives here."""

from __future__ import annotations

from beanie import PydanticObjectId
from beanie.operators import Or

from app.models.user import User


async def get_by_id(user_id: str) -> User | None:
    try:
        return await User.get(PydanticObjectId(user_id))
    except Exception:
        return None


async def get_by_email(email: str) -> User | None:
    return await User.find_one(User.email == email.lower())


async def get_by_email_or_phone(email: str, phone: str) -> User | None:
    return await User.find_one(Or(User.email == email.lower(), User.phone == phone))


async def create(user: User) -> User:
    return await user.insert()


async def save(user: User) -> User:
    user.touch()
    return await user.save()
