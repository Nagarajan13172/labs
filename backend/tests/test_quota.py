"""Quota endpoint tests."""

from __future__ import annotations

from app.core.config import settings
from httpx import AsyncClient

SIGNUP = {"email": "quota@gmail.com", "password": "Passw0rd!", "phone": "6667778888"}


async def _auth(client: AsyncClient, captured: dict[str, str]) -> dict[str, str]:
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    await client.get("/api/v1/auth/verify-email", params={"token": captured["verify"]})
    r = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    return {"Authorization": f"Bearer {r.json()['data']['access_token']}"}


async def test_quota_returns_configured_caps(client: AsyncClient, captured: dict[str, str]) -> None:
    headers = await _auth(client, captured)
    resp = await client.get("/api/v1/quota", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["max_client_peers"] == settings.max_client_peers
    assert data["max_domains"] == settings.max_domains
    assert data["max_databases"] == settings.dbaas_max_databases


async def test_quota_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/quota")
    assert resp.status_code == 401
