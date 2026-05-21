"""Auth request/response schemas with input validation."""

from __future__ import annotations

import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.config import settings

PASSWORD_REGEX = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,64}$"
)
PHONE_REGEX = re.compile(r"^[0-9]{10}$")


def _validate_password(value: str) -> str:
    if not PASSWORD_REGEX.match(value):
        raise ValueError(
            "Password must be 8-64 chars and include lower, upper, digit and special char"
        )
    return value


class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    phone: str

    @field_validator("email")
    @classmethod
    def _email_domain(cls, value: str) -> str:
        allowed = settings.allowed_email_domains
        if allowed and value.rsplit("@", 1)[-1].lower() not in allowed:
            raise ValueError("Email domain is not allowed")
        return value.lower()

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        return _validate_password(value)

    @field_validator("phone")
    @classmethod
    def _phone(cls, value: str) -> str:
        if not PHONE_REGEX.match(value):
            raise ValueError("Phone must be 10 digits")
        return value


class SigninRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(..., description="New password")

    @field_validator("password")
    @classmethod
    def _password(cls, value: str) -> str:
        return _validate_password(value)
