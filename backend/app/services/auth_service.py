"""Authentication business logic (orchestrates repo, tokens, email)."""

from __future__ import annotations

from datetime import UTC, datetime

import jwt

from app.core.exceptions import AuthError, ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.security import (
    TokenType,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories import user_repo
from app.schemas.auth import (
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SigninRequest,
    SignupRequest,
    TokenPair,
)
from app.services import email_service, token_service

log = get_logger("auth")


async def signup(data: SignupRequest) -> User:
    existing = await user_repo.get_by_email_or_phone(data.email, data.phone)
    if existing is not None:
        if existing.email == data.email:
            raise ConflictError("Email already registered")
        raise ConflictError("Phone number already registered")

    user = User(
        email=data.email,
        phone=data.phone,
        username=data.email.split("@", 1)[0],
        hashed_password=hash_password(data.password),
    )
    user = await user_repo.create(user)

    token = await token_service.issue_onetime_token(str(user.id), TokenType.EMAIL)
    await email_service.send_verification_email(user.email, token)
    log.info("auth.signup", user_id=str(user.id))
    return user


async def verify_email(token: str) -> None:
    try:
        payload = decode_token(token, expected_type=TokenType.EMAIL)
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired verification link") from exc

    if not await token_service.consume_onetime(payload["jti"]):
        raise AuthError("Verification link already used or expired")

    user = await user_repo.get_by_id(payload["sub"])
    if user is None:
        raise NotFoundError("User not found")
    user.is_verified = True
    await user_repo.save(user)
    log.info("auth.verified", user_id=str(user.id))


async def signin(data: SigninRequest) -> TokenPair:
    user = await user_repo.get_by_email(data.email)
    if user is None or not verify_password(data.password, user.hashed_password):
        raise AuthError("Invalid credentials")
    if not user.is_active:
        raise AuthError("Account is disabled")
    if not user.is_verified:
        raise AuthError("Please verify your email first")
    log.info("auth.signin", user_id=str(user.id))
    return await token_service.issue_token_pair(str(user.id))


async def refresh(refresh_token: str) -> TokenPair:
    try:
        _, pair = await token_service.rotate_refresh(refresh_token)
    except (jwt.PyJWTError, ValueError) as exc:
        raise AuthError("Invalid or expired refresh token") from exc
    return pair


async def logout(refresh_token: str) -> None:
    try:
        payload = decode_token(refresh_token, expected_type=TokenType.REFRESH)
    except jwt.PyJWTError:
        return  # nothing to revoke
    exp = datetime.fromtimestamp(payload["exp"], tz=UTC)
    await token_service.consume_onetime(payload["jti"])
    await token_service.revoke(payload["jti"], exp)


async def forgot_password(data: ForgotPasswordRequest) -> None:
    user = await user_repo.get_by_email(data.email)
    # Do not reveal whether the email exists.
    if user is not None:
        token = await token_service.issue_onetime_token(str(user.id), TokenType.RESET)
        await email_service.send_password_reset_email(user.email, token)
        log.info("auth.reset_requested", user_id=str(user.id))


async def reset_password(data: ResetPasswordRequest) -> None:
    try:
        payload = decode_token(data.token, expected_type=TokenType.RESET)
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired reset link") from exc

    if not await token_service.consume_onetime(payload["jti"]):
        raise AuthError("Reset link already used or expired")

    user = await user_repo.get_by_id(payload["sub"])
    if user is None:
        raise NotFoundError("User not found")
    user.hashed_password = hash_password(data.password)
    await user_repo.save(user)
    log.info("auth.reset_done", user_id=str(user.id))
