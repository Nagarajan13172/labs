"""User-facing business logic."""

from __future__ import annotations

from app.models.user import User
from app.repositories import user_repo
from app.schemas.user import UserUpdate


async def update_profile(user: User, data: UserUpdate) -> User:
    if data.phone is not None:
        user.phone = data.phone
    return await user_repo.save(user)
