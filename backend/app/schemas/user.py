"""User response/update schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import User, UserRole
from app.schemas.auth import PHONE_REGEX


class UserOut(BaseModel):
    id: str
    email: EmailStr
    username: str
    phone: str
    role: UserRole
    is_verified: bool
    is_active: bool
    created_at: datetime

    @classmethod
    def from_doc(cls, user: User) -> UserOut:
        return cls(
            id=str(user.id),
            email=user.email,
            username=user.username,
            phone=user.phone,
            role=user.role,
            is_verified=user.is_verified,
            is_active=user.is_active,
            created_at=user.created_at,
        )


class UserUpdate(BaseModel):
    phone: str | None = None

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str | None) -> str | None:
        if value is not None and not PHONE_REGEX.match(value):
            raise ValueError("Phone must be 10 digits")
        return value
