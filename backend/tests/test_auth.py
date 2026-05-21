"""Full authentication flow tests."""

from __future__ import annotations

from httpx import AsyncClient

SIGNUP = {"email": "alice@gmail.com", "password": "Passw0rd!", "phone": "1234567890"}


async def _signup_and_verify(client: AsyncClient, captured: dict[str, str]) -> None:
    resp = await client.post("/api/v1/auth/signup", json=SIGNUP)
    assert resp.status_code == 201, resp.text
    token = captured["verify"]
    resp = await client.get("/api/v1/auth/verify-email", params={"token": token})
    assert resp.status_code == 200, resp.text


async def test_signup_requires_strong_password(client: AsyncClient) -> None:
    resp = await client.post(
        "/api/v1/auth/signup",
        json={"email": "bob@gmail.com", "password": "weak", "phone": "1234567890"},
    )
    assert resp.status_code == 422


async def test_duplicate_signup_conflicts(client: AsyncClient, captured: dict[str, str]) -> None:
    await _signup_and_verify(client, captured)
    resp = await client.post("/api/v1/auth/signup", json=SIGNUP)
    assert resp.status_code == 409


async def test_signin_blocked_until_verified(client: AsyncClient) -> None:
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    resp = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    assert resp.status_code == 401  # not verified yet


async def test_full_flow_signin_me_refresh_logout(
    client: AsyncClient, captured: dict[str, str]
) -> None:
    await _signup_and_verify(client, captured)

    # signin
    resp = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    assert resp.status_code == 200
    pair = resp.json()["data"]
    access, refresh = pair["access_token"], pair["refresh_token"]

    # /me with access token
    resp = await client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {access}"})
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == SIGNUP["email"]

    # refresh rotates the pair; old refresh becomes invalid
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 200
    new_refresh = resp.json()["data"]["refresh_token"]
    assert new_refresh != refresh

    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 401  # reuse of rotated refresh is rejected

    # logout revokes the new refresh
    resp = await client.post("/api/v1/auth/logout", json={"refresh_token": new_refresh})
    assert resp.status_code == 200
    resp = await client.post("/api/v1/auth/refresh", json={"refresh_token": new_refresh})
    assert resp.status_code == 401


async def test_me_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401


async def test_password_reset_flow(client: AsyncClient, captured: dict[str, str]) -> None:
    await _signup_and_verify(client, captured)

    resp = await client.post("/api/v1/auth/forgot-password", json={"email": SIGNUP["email"]})
    assert resp.status_code == 200
    reset_token = captured["reset"]

    new_password = "N3wPassw0rd!"
    resp = await client.post(
        "/api/v1/auth/reset-password", json={"token": reset_token, "password": new_password}
    )
    assert resp.status_code == 200

    # one-time token cannot be reused
    resp = await client.post(
        "/api/v1/auth/reset-password", json={"token": reset_token, "password": new_password}
    )
    assert resp.status_code == 401

    # sign in with the new password works
    resp = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": new_password}
    )
    assert resp.status_code == 200
