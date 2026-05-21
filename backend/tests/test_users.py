"""User profile tests."""

from __future__ import annotations

from httpx import AsyncClient

SIGNUP = {"email": "carol@gmail.com", "password": "Passw0rd!", "phone": "5550001111"}


async def _auth_header(client: AsyncClient, captured: dict[str, str]) -> dict[str, str]:
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    await client.get("/api/v1/auth/verify-email", params={"token": captured["verify"]})
    resp = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    access = resp.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {access}"}


async def test_update_profile_phone(client: AsyncClient, captured: dict[str, str]) -> None:
    headers = await _auth_header(client, captured)
    resp = await client.patch("/api/v1/users/me", json={"phone": "9998887777"}, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["data"]["phone"] == "9998887777"


async def test_update_profile_rejects_bad_phone(
    client: AsyncClient, captured: dict[str, str]
) -> None:
    headers = await _auth_header(client, captured)
    resp = await client.patch("/api/v1/users/me", json={"phone": "abc"}, headers=headers)
    assert resp.status_code == 422
