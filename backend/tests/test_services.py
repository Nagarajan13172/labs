"""DBaaS API tests (engine drivers mocked)."""

from __future__ import annotations

import pytest
from app.core.config import settings
from app.services import db_engines
from httpx import AsyncClient

SIGNUP = {"email": "dbuser@gmail.com", "password": "Passw0rd!", "phone": "2223334444"}


async def _auth(client: AsyncClient, captured: dict[str, str]) -> dict[str, str]:
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    await client.get("/api/v1/auth/verify-email", params={"token": captured["verify"]})
    r = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    return {"Authorization": f"Bearer {r.json()['data']['access_token']}"}


@pytest.fixture
def mock_engines(monkeypatch: pytest.MonkeyPatch) -> dict[str, list]:
    calls: dict[str, list] = {"created": [], "dropped": []}

    def create(spec, db_name, username, password):  # type: ignore[no-untyped-def]
        calls["created"].append((spec.engine.value, db_name, username))

    def drop(spec, db_name, username):  # type: ignore[no-untyped-def]
        calls["dropped"].append((spec.engine.value, db_name))

    monkeypatch.setattr(db_engines, "create_database", create)
    monkeypatch.setattr(db_engines, "drop_database", drop)
    return calls


async def test_list_engines(client: AsyncClient, captured: dict[str, str]) -> None:
    headers = await _auth(client, captured)
    resp = await client.get("/api/v1/services/engines", headers=headers)
    assert resp.status_code == 200
    engines = {e["engine"] for e in resp.json()["data"]}
    assert engines == {"mysql", "mariadb", "mongodb"}


async def test_create_list_delete_database(
    client: AsyncClient, captured: dict[str, str], mock_engines: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    resp = await client.post(
        "/api/v1/services/databases",
        json={"engine": "mysql", "name": "shop"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()["data"]
    assert data["db_name"] == "dbuser_shop"
    assert data["username"] == "dbuser_shop"
    assert data["password"]
    assert data["connection_uri"].startswith("mysql://dbuser_shop:")
    assert mock_engines["created"] == [("mysql", "dbuser_shop", "dbuser_shop")]

    listed = await client.get("/api/v1/services/databases", headers=headers)
    assert len(listed.json()["data"]) == 1

    db_id = data["id"]
    deleted = await client.request("DELETE", f"/api/v1/services/databases/{db_id}", headers=headers)
    assert deleted.status_code == 200
    assert mock_engines["dropped"] == [("mysql", "dbuser_shop")]
    again = await client.get("/api/v1/services/databases", headers=headers)
    assert again.json()["data"] == []


async def test_duplicate_database_conflicts(
    client: AsyncClient, captured: dict[str, str], mock_engines: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    body = {"engine": "mysql", "name": "dup"}
    first = await client.post("/api/v1/services/databases", json=body, headers=headers)
    assert first.status_code == 201
    second = await client.post("/api/v1/services/databases", json=body, headers=headers)
    assert second.status_code == 409


async def test_invalid_name_rejected(
    client: AsyncClient, captured: dict[str, str], mock_engines: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    resp = await client.post(
        "/api/v1/services/databases", json={"engine": "mysql", "name": "bad name!"}, headers=headers
    )
    assert resp.status_code == 422


async def test_disabled_engine_rejected(
    client: AsyncClient,
    captured: dict[str, str],
    mock_engines: dict[str, list],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "dbaas_engines_enabled", ["mysql"])
    headers = await _auth(client, captured)
    resp = await client.post(
        "/api/v1/services/databases", json={"engine": "mongodb", "name": "x"}, headers=headers
    )
    assert resp.status_code == 422


async def test_max_databases_enforced(
    client: AsyncClient,
    captured: dict[str, str],
    mock_engines: dict[str, list],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "dbaas_max_databases", 2)
    headers = await _auth(client, captured)
    for i in range(2):
        r = await client.post(
            "/api/v1/services/databases",
            json={"engine": "mysql", "name": f"db{i}"},
            headers=headers,
        )
        assert r.status_code == 201
    over = await client.post(
        "/api/v1/services/databases", json={"engine": "mysql", "name": "extra"}, headers=headers
    )
    assert over.status_code == 409


async def test_services_require_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/services/databases")
    assert resp.status_code == 401
