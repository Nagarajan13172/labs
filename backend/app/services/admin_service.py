"""Admin console business logic (platform-wide, role-gated at the route)."""

from __future__ import annotations

from typing import Any

from app.core.exceptions import ForbiddenError, NotFoundError
from app.core.logging import get_logger
from app.models.database import ManagedDatabase
from app.models.lab import Lab, LabStatus
from app.models.peer import Peer
from app.models.user import User, UserRole
from app.repositories import user_repo

log = get_logger("admin")


async def _counts_by_user(collection: Any) -> dict[str, int]:
    """Aggregate document counts grouped by `user_id` (one query per collection)."""
    out: dict[str, int] = {}
    async for row in collection.aggregate([{"$group": {"_id": "$user_id", "n": {"$sum": 1}}}]):
        if row["_id"] is not None:
            out[str(row["_id"])] = int(row["n"])
    return out


async def get_stats() -> dict[str, int]:
    return {
        "users_total": await user_repo.count(),
        "users_verified": await user_repo.count_verified(),
        "labs_total": await Lab.find_all().count(),
        "labs_running": await Lab.find(Lab.status == LabStatus.RUNNING).count(),
        "peers_total": await Peer.find_all().count(),
        "databases_total": await ManagedDatabase.find_all().count(),
    }


async def list_users() -> list[dict[str, Any]]:
    users = await user_repo.list_all()
    labs = await _counts_by_user(Lab.get_motor_collection())
    peers = await _counts_by_user(Peer.get_motor_collection())
    dbs = await _counts_by_user(ManagedDatabase.get_motor_collection())
    rows = []
    for u in users:
        uid = str(u.id)
        rows.append(
            {
                "id": uid,
                "email": u.email,
                "username": u.username,
                "role": u.role,
                "is_verified": u.is_verified,
                "is_active": u.is_active,
                "created_at": u.created_at,
                "labs": labs.get(uid, 0),
                "peers": peers.get(uid, 0),
                "databases": dbs.get(uid, 0),
            }
        )
    return rows


async def _target(acting: User, user_id: str) -> User:
    if str(acting.id) == user_id:
        raise ForbiddenError("You cannot modify your own admin account")
    target = await user_repo.get_by_id(user_id)
    if target is None:
        raise NotFoundError("User not found")
    # Only a superadmin may modify another superadmin.
    if target.role == UserRole.SUPERADMIN and acting.role != UserRole.SUPERADMIN:
        raise ForbiddenError("Only a superadmin can modify a superadmin")
    return target


async def set_role(acting: User, user_id: str, role: UserRole) -> User:
    target = await _target(acting, user_id)
    if role == UserRole.SUPERADMIN and acting.role != UserRole.SUPERADMIN:
        raise ForbiddenError("Only a superadmin can grant superadmin")
    target.role = role
    saved = await user_repo.save(target)
    log.info("admin.role_changed", by=str(acting.id), user=user_id, role=role.value)
    return saved


async def set_active(acting: User, user_id: str, is_active: bool) -> User:
    target = await _target(acting, user_id)
    target.is_active = is_active
    saved = await user_repo.save(target)
    log.info("admin.active_changed", by=str(acting.id), user=user_id, active=is_active)
    return saved
