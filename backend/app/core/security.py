"""Password hashing and JWT creation/decoding.

Tokens carry a ``jti`` (unique id) so they can be revoked via the Redis
blocklist, a ``type`` claim to distinguish access/refresh/email/reset tokens,
and standard ``sub``/``exp``/``iat`` claims.
"""

from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import bcrypt
import jwt

from app.core.config import settings

# bcrypt operates on at most 72 bytes; longer inputs are pre-hashed (see below).
_BCRYPT_MAX_BYTES = 72


class TokenType(StrEnum):
    ACCESS = "access"
    REFRESH = "refresh"
    EMAIL = "email"
    RESET = "reset"


def _prepare(password: str) -> bytes:
    """Encode a password for bcrypt, pre-hashing if it exceeds 72 bytes.

    bcrypt silently truncates at 72 bytes; SHA-256 pre-hashing removes that
    limit without weakening shorter passwords.
    """
    raw = password.encode("utf-8")
    if len(raw) > _BCRYPT_MAX_BYTES:
        return hashlib.sha256(raw).hexdigest().encode("ascii")
    return raw


def hash_password(password: str) -> str:
    return bcrypt.hashpw(_prepare(password), bcrypt.gensalt()).decode("ascii")


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(_prepare(password), hashed.encode("ascii"))
    except ValueError:
        return False


def _expiry_minutes(token_type: TokenType) -> int:
    return {
        TokenType.ACCESS: settings.access_token_expire_minutes,
        TokenType.REFRESH: settings.refresh_token_expire_minutes,
        TokenType.EMAIL: settings.email_token_expire_minutes,
        TokenType.RESET: settings.reset_token_expire_minutes,
    }[token_type]


def create_token(
    subject: str,
    token_type: TokenType,
    extra_claims: dict[str, Any] | None = None,
) -> tuple[str, str, datetime]:
    """Return ``(encoded_token, jti, expires_at)``."""
    now = datetime.now(UTC)
    expires_at = now + timedelta(minutes=_expiry_minutes(token_type))
    jti = str(uuid.uuid4())
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type.value,
        "jti": jti,
        "iat": now,
        "exp": expires_at,
    }
    if extra_claims:
        payload.update(extra_claims)
    token = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return token, jti, expires_at


def decode_token(token: str, expected_type: TokenType | None = None) -> dict[str, Any]:
    """Decode and validate a token. Raises ``jwt.PyJWTError`` on failure."""
    payload: dict[str, Any] = jwt.decode(
        token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
    )
    if expected_type is not None and payload.get("type") != expected_type.value:
        raise jwt.InvalidTokenError("Unexpected token type")
    return payload


def new_jti() -> str:
    return str(uuid.uuid4())


def generate_password(length: int = 16) -> str:
    """Generate a URL-safe random password (for code-server, etc.)."""
    return secrets.token_urlsafe(length)
