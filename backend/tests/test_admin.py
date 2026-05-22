"""Admin API tests (role-gated)."""

from __future__ import annotations

from app.models.user import UserRole
from app.repositories import user_repo
from httpx import AsyncClient

ADMIN = {"email": "boss@gmail.com", "password": "Passw0rd!", "phone": "1112223333"}
MEMBER = {"email": "member@gmail.com", "password": "Passw0rd!", "phone": "4445556677"}


async def _signup_signin(client: AsyncClient, captured: dict[str, str], who: dict) -> str:
    await client.post("/api/v1/auth/signup", json=who)
    await client.get("/api/v1/auth/verify-email", params={"token": captured["verify"]})
    r = await client.post(
        "/api/v1/auth/signin", json={"email": who["email"], "password": who["password"]}
    )
    return r.json()["data"]["access_token"]


def _hdr(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _elevate(email: str, role: UserRole) -> None:
    user = await user_repo.get_by_email(email)
    assert user is not None
    user.role = role
    await user_repo.save(user)


async def test_non_admin_forbidden(client: AsyncClient, captured: dict[str, str]) -> None:
    token = await _signup_signin(client, captured, MEMBER)
    resp = await client.get("/api/v1/admin/stats", headers=_hdr(token))
    assert resp.status_code == 403


async def test_admin_stats_and_users(client: AsyncClient, captured: dict[str, str]) -> None:
    member_token = await _signup_signin(client, captured, MEMBER)  # noqa: F841 (seeds a user)
    admin_token = await _signup_signin(client, captured, ADMIN)
    await _elevate(ADMIN["email"], UserRole.ADMIN)

    stats = await client.get("/api/v1/admin/stats", headers=_hdr(admin_token))
    assert stats.status_code == 200
    assert stats.json()["data"]["users_total"] >= 2

    users = await client.get("/api/v1/admin/users", headers=_hdr(admin_token))
    assert users.status_code == 200
    emails = {u["email"] for u in users.json()["data"]}
    assert ADMIN["email"] in emails and MEMBER["email"] in emails


async def test_admin_changes_member_role(client: AsyncClient, captured: dict[str, str]) -> None:
    await _signup_signin(client, captured, MEMBER)
    admin_token = await _signup_signin(client, captured, ADMIN)
    await _elevate(ADMIN["email"], UserRole.ADMIN)

    member = await user_repo.get_by_email(MEMBER["email"])
    assert member is not None
    resp = await client.patch(
        f"/api/v1/admin/users/{member.id}/role",
        json={"role": "admin"},
        headers=_hdr(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["role"] == "admin"


async def test_admin_cannot_change_own_role(client: AsyncClient, captured: dict[str, str]) -> None:
    admin_token = await _signup_signin(client, captured, ADMIN)
    await _elevate(ADMIN["email"], UserRole.ADMIN)
    me = await user_repo.get_by_email(ADMIN["email"])
    assert me is not None
    resp = await client.patch(
        f"/api/v1/admin/users/{me.id}/role",
        json={"role": "user"},
        headers=_hdr(admin_token),
    )
    assert resp.status_code == 403


async def test_admin_suspend_member(client: AsyncClient, captured: dict[str, str]) -> None:
    await _signup_signin(client, captured, MEMBER)
    admin_token = await _signup_signin(client, captured, ADMIN)
    await _elevate(ADMIN["email"], UserRole.ADMIN)

    member = await user_repo.get_by_email(MEMBER["email"])
    assert member is not None
    resp = await client.patch(
        f"/api/v1/admin/users/{member.id}/active",
        json={"is_active": False},
        headers=_hdr(admin_token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_active"] is False
