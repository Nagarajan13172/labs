"""Custom domain API tests (Phase 4)."""

from __future__ import annotations

import pytest
import yaml
from app.core.config import settings
from app.models.lab import LabStatus
from app.repositories import lab_repo
from app.services import domain_service
from httpx import AsyncClient

SIGNUP = {"email": "domainuser@gmail.com", "password": "Passw0rd!", "phone": "3334445555"}


async def _auth(client: AsyncClient, captured: dict[str, str]) -> dict[str, str]:
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    await client.get("/api/v1/auth/verify-email", params={"token": captured["verify"]})
    r = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    return {"Authorization": f"Bearer {r.json()['data']['access_token']}"}


@pytest.fixture(autouse=True)
def _no_enqueue(monkeypatch: pytest.MonkeyPatch) -> None:
    async def _noop(lab_id: str) -> None:
        return None

    monkeypatch.setattr("app.services.lab_service._enqueue_provision", _noop)


async def _deploy(client: AsyncClient, headers: dict[str, str]) -> None:
    await client.post("/api/v1/labs/deploy", headers=headers)


async def test_domain_requires_lab(client: AsyncClient, captured: dict[str, str]) -> None:
    headers = await _auth(client, captured)
    resp = await client.post(
        "/api/v1/network/domains", json={"domain_name": "app.example.com"}, headers=headers
    )
    assert resp.status_code == 404  # no lab yet


async def test_add_list_remove_domain(client: AsyncClient, captured: dict[str, str]) -> None:
    headers = await _auth(client, captured)
    await _deploy(client, headers)

    added = await client.post(
        "/api/v1/network/domains", json={"domain_name": "App.Example.com"}, headers=headers
    )
    assert added.status_code == 201, added.text
    data = added.json()["data"]
    assert "app.example.com" in data["domains"]
    assert data["auto_host"].endswith(".lab.localhost")

    listed = await client.get("/api/v1/network/domains", headers=headers)
    assert listed.json()["data"]["domains"] == ["app.example.com"]

    removed = await client.request(
        "DELETE", "/api/v1/network/domains/app.example.com", headers=headers
    )
    assert removed.status_code == 200
    again = await client.get("/api/v1/network/domains", headers=headers)
    assert again.json()["data"]["domains"] == []


async def test_invalid_domain_rejected(client: AsyncClient, captured: dict[str, str]) -> None:
    headers = await _auth(client, captured)
    await _deploy(client, headers)
    resp = await client.post(
        "/api/v1/network/domains", json={"domain_name": "not a domain"}, headers=headers
    )
    assert resp.status_code == 422


async def test_max_domains_enforced(
    client: AsyncClient, captured: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "max_domains", 2)
    headers = await _auth(client, captured)
    await _deploy(client, headers)
    for i in range(2):
        r = await client.post(
            "/api/v1/network/domains", json={"domain_name": f"d{i}.example.com"}, headers=headers
        )
        assert r.status_code == 201
    over = await client.post(
        "/api/v1/network/domains", json={"domain_name": "extra.example.com"}, headers=headers
    )
    assert over.status_code == 409


async def test_dns_verification_blocks_unresolvable(
    client: AsyncClient, captured: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(settings, "dns_verification_enabled", True)
    monkeypatch.setattr(settings, "server_public_ip", "203.0.113.10")

    async def _resolve(domain: str) -> str | None:
        return "198.51.100.1"  # points elsewhere

    monkeypatch.setattr(domain_service, "_resolve", _resolve)
    headers = await _auth(client, captured)
    await _deploy(client, headers)
    resp = await client.post(
        "/api/v1/network/domains", json={"domain_name": "wrong.example.com"}, headers=headers
    )
    assert resp.status_code == 422


async def test_running_lab_domain_updates_traefik_file(
    client: AsyncClient, captured: dict[str, str], monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:  # type: ignore[no-untyped-def]
    monkeypatch.setattr(settings, "traefik_dynamic_dir", str(tmp_path))
    headers = await _auth(client, captured)
    await _deploy(client, headers)

    # Simulate a provisioned, running lab.
    me = await client.get("/api/v1/users/me", headers=headers)
    lab = await lab_repo.get_by_user(me.json()["data"]["id"])
    assert lab is not None
    lab.status = LabStatus.RUNNING
    lab.container_id = "c-1"
    lab.internal_ip = "172.30.0.7"
    await lab_repo.save(lab)

    await client.post(
        "/api/v1/network/domains", json={"domain_name": "live.example.com"}, headers=headers
    )
    route_file = tmp_path / f"lab-{lab.user_id}.yml"
    assert route_file.exists()
    config = yaml.safe_load(route_file.read_text())
    rule = next(iter(config["http"]["routers"].values()))["rule"]
    assert "Host(`live.example.com`)" in rule
