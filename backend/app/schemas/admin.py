"""Admin console schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.user import UserRole


class AdminStats(BaseModel):
    users_total: int
    users_verified: int
    labs_total: int
    labs_running: int
    peers_total: int
    databases_total: int


class AdminUserOut(BaseModel):
    id: str
    email: str
    username: str
    role: UserRole
    is_verified: bool
    is_active: bool
    created_at: datetime
    labs: int
    peers: int
    databases: int


class RoleUpdate(BaseModel):
    role: UserRole


class ActiveUpdate(BaseModel):
    is_active: bool
