"""User profile endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.schemas.common import ResponseEnvelope, ok
from app.schemas.user import UserOut, UserUpdate
from app.services import user_service

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=ResponseEnvelope[UserOut])
async def get_me(user: CurrentUser) -> ResponseEnvelope[UserOut]:
    return ok("Current user", data=UserOut.from_doc(user))


@router.patch("/me", response_model=ResponseEnvelope[UserOut])
async def update_me(user: CurrentUser, data: UserUpdate) -> ResponseEnvelope[UserOut]:
    updated = await user_service.update_profile(user, data)
    return ok("Profile updated", data=UserOut.from_doc(updated))
