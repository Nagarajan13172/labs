"""WireGuard network/peer API tests (gateway mocked)."""

from __future__ import annotations

import pytest
from app.services import wg_gateway_client, wg_keys
from httpx import AsyncClient

SIGNUP = {"email": "vpnuser@gmail.com", "password": "Passw0rd!", "phone": "7778889999"}


async def _auth(client: AsyncClient, captured: dict[str, str]) -> dict[str, str]:
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    await client.get("/api/v1/auth/verify-email", params={"token": captured["verify"]})
    r = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    return {"Authorization": f"Bearer {r.json()['data']['access_token']}"}


@pytest.fixture
def mock_gateway(monkeypatch: pytest.MonkeyPatch) -> dict[str, list]:
    calls: dict[str, list] = {"added": [], "removed": []}
    server_key = wg_keys.generate_keypair().public_key

    async def add_peer(public_key: str, allowed_ip: str, preshared_key: str | None) -> None:
        calls["added"].append((public_key, allowed_ip))

    async def remove_peer(public_key: str) -> None:
        calls["removed"].append(public_key)

    async def list_peer_stats() -> dict:
        return {}

    async def get_server_info() -> dict:
        return {
            "public_key": server_key,
            "endpoint": "localhost:51820",
            "listen_port": 51820,
            "address": "10.8.0.1/24",
        }

    monkeypatch.setattr(wg_gateway_client, "add_peer", add_peer)
    monkeypatch.setattr(wg_gateway_client, "remove_peer", remove_peer)
    monkeypatch.setattr(wg_gateway_client, "list_peer_stats", list_peer_stats)
    monkeypatch.setattr(wg_gateway_client, "get_server_info", get_server_info)
    return calls


async def test_create_peer(
    client: AsyncClient, captured: dict[str, str], mock_gateway: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    resp = await client.post(
        "/api/v1/network/peers", json={"device_name": "phone"}, headers=headers
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["address"] == "10.8.0.2"
    assert wg_keys.is_valid_key(data["public_key"])
    assert len(mock_gateway["added"]) == 1
    assert mock_gateway["added"][0][1] == "10.8.0.2"


async def test_max_peers_enforced(
    client: AsyncClient, captured: dict[str, str], mock_gateway: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    for i in range(3):  # MAX_CLIENT_PEERS default = 3
        r = await client.post(
            "/api/v1/network/peers", json={"device_name": f"dev{i}"}, headers=headers
        )
        assert r.status_code == 201
    over = await client.post(
        "/api/v1/network/peers", json={"device_name": "extra"}, headers=headers
    )
    assert over.status_code == 409


async def test_config_and_qr(
    client: AsyncClient, captured: dict[str, str], mock_gateway: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    created = await client.post(
        "/api/v1/network/peers", json={"device_name": "laptop"}, headers=headers
    )
    peer_id = created.json()["data"]["id"]

    config = await client.get(f"/api/v1/network/peers/{peer_id}/config", headers=headers)
    assert config.status_code == 200
    body = config.text
    assert "[Interface]" in body and "[Peer]" in body
    assert "PrivateKey =" in body and "Endpoint = localhost:51820" in body
    assert "10.8.0.0/24" in body  # pushed route

    qr = await client.get(f"/api/v1/network/peers/{peer_id}/qr", headers=headers)
    assert qr.status_code == 200
    assert qr.headers["content-type"] == "image/png"
    assert qr.content[:8] == b"\x89PNG\r\n\x1a\n"  # PNG magic


async def test_list_and_delete(
    client: AsyncClient, captured: dict[str, str], mock_gateway: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    created = await client.post(
        "/api/v1/network/peers", json={"device_name": "tablet"}, headers=headers
    )
    peer_id = created.json()["data"]["id"]

    listed = await client.get("/api/v1/network/peers", headers=headers)
    assert len(listed.json()["data"]) == 1
    assert listed.json()["data"][0]["device_name"] == "tablet"

    deleted = await client.request("DELETE", f"/api/v1/network/peers/{peer_id}", headers=headers)
    assert deleted.status_code == 200
    assert mock_gateway["removed"]  # gateway removal invoked

    empty = await client.get("/api/v1/network/peers", headers=headers)
    assert empty.json()["data"] == []


async def test_network_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/network/peers")
    assert resp.status_code == 401
