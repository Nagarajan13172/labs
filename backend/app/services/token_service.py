"""Token issuance, rotation and revocation.

- Access/refresh tokens are signed JWTs (see ``core.security``).
- Refresh and one-time (email/reset) tokens are tracked in Redis by ``jti`` so
  they can be revoked and used exactly once.
- A blocklist set holds revoked ``jti`` values until their natural expiry.
"""

from __future__ import annotations

import math
from datetime import UTC, datetime

from app.core.security import TokenType, create_token, decode_token
from app.db.redis import get_redis
from app.schemas.auth import TokenPair

# Redis key helpers
_BLOCKLIST = "auth:blocklist:{jti}"
_ONETIME = "auth:onetime:{jti}"


def _ttl_seconds(expires_at: datetime) -> int:
    return max(1, math.ceil((expires_at - datetime.now(UTC)).total_seconds()))


async def issue_token_pair(user_id: str) -> TokenPair:
    access, _, _ = create_token(user_id, TokenType.ACCESS)
    refresh, jti, exp = create_token(user_id, TokenType.REFRESH)
    # Register the refresh jti as a live, single-use credential.
    await get_redis().set(_ONETIME.format(jti=jti), user_id, ex=_ttl_seconds(exp))
    return TokenPair(access_token=access, refresh_token=refresh)


async def issue_onetime_token(user_id: str, token_type: TokenType) -> str:
    token, jti, exp = create_token(user_id, token_type)
    await get_redis().set(_ONETIME.format(jti=jti), user_id, ex=_ttl_seconds(exp))
    return token


async def is_blocklisted(jti: str) -> bool:
    return bool(await get_redis().exists(_BLOCKLIST.format(jti=jti)))


async def revoke(jti: str, expires_at: datetime) -> None:
    await get_redis().set(_BLOCKLIST.format(jti=jti), "1", ex=_ttl_seconds(expires_at))


async def consume_onetime(jti: str) -> bool:
    """Atomically use a one-time token; returns True if it was still valid."""
    deleted = await get_redis().delete(_ONETIME.format(jti=jti))
    return bool(deleted)


async def rotate_refresh(refresh_token: str) -> tuple[str, TokenPair]:
    """Validate a refresh token, revoke it, and issue a fresh pair.

    Returns ``(user_id, new_pair)``. Raises ``jwt.PyJWTError`` /
    ``ValueError`` on invalid or already-used tokens.
    """
    payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)
    jti = payload["jti"]
    user_id = payload["sub"]
    exp = datetime.fromtimestamp(payload["exp"], tz=UTC)

    if await is_blocklisted(jti) or not await consume_onetime(jti):
        raise ValueError("Refresh token is no longer valid")

    await revoke(jti, exp)
    new_pair = await issue_token_pair(user_id)
    return user_id, new_pair
