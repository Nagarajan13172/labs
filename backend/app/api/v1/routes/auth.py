"""Authentication endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Request, status

from app.core.ratelimit import limiter
from app.schemas.auth import (
    ForgotPasswordRequest,
    RefreshRequest,
    ResetPasswordRequest,
    SigninRequest,
    SignupRequest,
    TokenPair,
)
from app.schemas.common import ResponseEnvelope, ok
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/signup", response_model=ResponseEnvelope[None], status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def signup(request: Request, data: SignupRequest) -> ResponseEnvelope[None]:
    await auth_service.signup(data)
    return ok("Signed up. Check your email to verify your account.")


@router.get("/verify-email", response_model=ResponseEnvelope[None])
async def verify_email(token: str) -> ResponseEnvelope[None]:
    await auth_service.verify_email(token)
    return ok("Email verified successfully.")


@router.post("/signin", response_model=ResponseEnvelope[TokenPair])
@limiter.limit("10/minute")
async def signin(request: Request, data: SigninRequest) -> ResponseEnvelope[TokenPair]:
    pair = await auth_service.signin(data)
    return ok("Signed in successfully.", data=pair)


@router.post("/refresh", response_model=ResponseEnvelope[TokenPair])
async def refresh(data: RefreshRequest) -> ResponseEnvelope[TokenPair]:
    pair = await auth_service.refresh(data.refresh_token)
    return ok("Token refreshed.", data=pair)


@router.post("/logout", response_model=ResponseEnvelope[None])
async def logout(data: RefreshRequest) -> ResponseEnvelope[None]:
    await auth_service.logout(data.refresh_token)
    return ok("Logged out.")


@router.post("/forgot-password", response_model=ResponseEnvelope[None])
@limiter.limit("5/minute")
async def forgot_password(request: Request, data: ForgotPasswordRequest) -> ResponseEnvelope[None]:
    await auth_service.forgot_password(data)
    return ok("If that email exists, a reset link has been sent.")


@router.post("/reset-password", response_model=ResponseEnvelope[None])
async def reset_password(data: ResetPasswordRequest) -> ResponseEnvelope[None]:
    await auth_service.reset_password(data)
    return ok("Password updated successfully.")
