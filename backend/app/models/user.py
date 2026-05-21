"""User document (Beanie/MongoDB)."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

from beanie import Document, Indexed
from pydantic import EmailStr, Field


class UserRole(StrEnum):
    USER = "user"
    ADMIN = "admin"
    SUPERADMIN = "superadmin"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class User(Document):
    email: Indexed(EmailStr, unique=True)  # type: ignore[valid-type]
    phone: Indexed(str, unique=True)  # type: ignore[valid-type]
    username: str
    hashed_password: str
    role: UserRole = UserRole.USER
    is_verified: bool = False
    is_active: bool = True
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "users"

    def touch(self) -> None:
        self.updated_at = _utcnow()
