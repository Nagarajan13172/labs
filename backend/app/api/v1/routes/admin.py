"""Admin console endpoints — restricted to admin / superadmin roles."""

from __future__ import annotations

from fastapi import APIRouter

from app.dependencies import AdminUser
from app.schemas.admin import ActiveUpdate, AdminStats, AdminUserOut, RoleUpdate
from app.schemas.common import ResponseEnvelope, ok
from app.services import admin_service

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/stats", response_model=ResponseEnvelope[AdminStats])
async def stats(admin: AdminUser) -> ResponseEnvelope[AdminStats]:
    return ok("Admin stats", data=AdminStats(**await admin_service.get_stats()))


@router.get("/users", response_model=ResponseEnvelope[list[AdminUserOut]])
async def list_users(admin: AdminUser) -> ResponseEnvelope[list[AdminUserOut]]:
    rows = await admin_service.list_users()
    return ok("Users", data=[AdminUserOut(**r) for r in rows])


@router.patch("/users/{user_id}/role", response_model=ResponseEnvelope[AdminUserOut])
async def set_role(
    user_id: str, body: RoleUpdate, admin: AdminUser
) -> ResponseEnvelope[AdminUserOut]:
    user = await admin_service.set_role(admin, user_id, body.role)
    return ok("Role updated", data=_row(user))


@router.patch("/users/{user_id}/active", response_model=ResponseEnvelope[AdminUserOut])
async def set_active(
    user_id: str, body: ActiveUpdate, admin: AdminUser
) -> ResponseEnvelope[AdminUserOut]:
    user = await admin_service.set_active(admin, user_id, body.is_active)
    return ok("User updated", data=_row(user))


def _row(user) -> AdminUserOut:  # type: ignore[no-untyped-def]
    # Counts aren't needed on a single-user mutation response.
    return AdminUserOut(
        id=str(user.id),
        email=user.email,
        username=user.username,
        role=user.role,
        is_verified=user.is_verified,
        is_active=user.is_active,
        created_at=user.created_at,
        labs=0,
        peers=0,
        databases=0,
    )
