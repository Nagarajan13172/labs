"""FastAPI dependencies: current-user resolution and role guards."""

from __future__ import annotations

from collections.abc import Callable, Coroutine
from typing import Annotated, Any

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.exceptions import AuthError, ForbiddenError
from app.core.security import TokenType, decode_token
from app.models.user import User, UserRole
from app.repositories import user_repo
from app.services import token_service

_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> User:
    if credentials is None:
        raise AuthError("Not authenticated")
    try:
        payload = decode_token(credentials.credentials, expected_type=TokenType.ACCESS)
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired token") from exc

    if await token_service.is_blocklisted(payload["jti"]):
        raise AuthError("Token has been revoked")

    user = await user_repo.get_by_id(payload["sub"])
    if user is None or not user.is_active:
        raise AuthError("User not found or inactive")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_role(*roles: UserRole) -> Callable[[User], Coroutine[Any, Any, User]]:
    """Dependency factory: allow only users holding one of ``roles``."""

    async def _guard(user: CurrentUser) -> User:
        if user.role not in roles:
            raise ForbiddenError("Insufficient permissions")
        return user

    return _guard


# Acting admin (admin or superadmin) — yields the user so routes can run guards.
AdminUser = Annotated[User, Depends(require_role(UserRole.ADMIN, UserRole.SUPERADMIN))]
