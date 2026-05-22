"""Lab provisioning API tests (Docker layer mocked)."""

from __future__ import annotations

import pytest
from app.models.lab import LabStatus
from app.repositories import lab_repo
from app.services import docker_service
from httpx import AsyncClient

SIGNUP = {"email": "labuser@gmail.com", "password": "Passw0rd!", "phone": "4445556666"}


async def _auth(client: AsyncClient, captured: dict[str, str]) -> dict[str, str]:
    await client.post("/api/v1/auth/signup", json=SIGNUP)
    await client.get("/api/v1/auth/verify-email", params={"token": captured["verify"]})
    r = await client.post(
        "/api/v1/auth/signin", json={"email": SIGNUP["email"], "password": SIGNUP["password"]}
    )
    return {"Authorization": f"Bearer {r.json()['data']['access_token']}"}


@pytest.fixture
def mock_docker(monkeypatch: pytest.MonkeyPatch) -> dict[str, list]:
    calls: dict[str, list] = {"enqueued": [], "stopped": [], "started": [], "removed": []}

    async def fake_enqueue(lab_id: str) -> None:
        calls["enqueued"].append(lab_id)

    def fake_start(cid: str) -> int:
        calls["started"].append(cid)
        return 49152

    monkeypatch.setattr("app.services.lab_service._enqueue_provision", fake_enqueue)
    monkeypatch.setattr(docker_service, "stop_container", lambda cid: calls["stopped"].append(cid))
    monkeypatch.setattr(docker_service, "start_container", fake_start)
    monkeypatch.setattr(
        docker_service, "remove_container", lambda username, **kw: calls["removed"].append(username)
    )
    monkeypatch.setattr(docker_service, "get_status", lambda cid: "running")
    # Isolate from Traefik file I/O (covered by its own tests).
    monkeypatch.setattr("app.services.traefik_service.write_lab_route", lambda *a, **k: None)
    monkeypatch.setattr("app.services.traefik_service.remove_lab_route", lambda *a, **k: None)
    return calls


async def _user_id(client: AsyncClient, headers: dict[str, str]) -> str:
    me = await client.get("/api/v1/users/me", headers=headers)
    return me.json()["data"]["id"]


async def test_deploy_creates_lab_and_enqueues(
    client: AsyncClient, captured: dict[str, str], mock_docker: dict[str, list]
) -> None:
    headers = await _auth(client, captured)

    empty = await client.get("/api/v1/labs", headers=headers)
    assert empty.json()["data"] is None

    resp = await client.post("/api/v1/labs/deploy", headers=headers)
    assert resp.status_code == 202, resp.text
    data = resp.json()["data"]
    assert data["status"] == "pending"
    assert data["internal_ip"] == "172.30.0.2"
    assert len(mock_docker["enqueued"]) == 1

    creds = await client.get("/api/v1/labs/credentials", headers=headers)
    assert creds.status_code == 200
    assert creds.json()["data"]["code_server_password"]


async def test_stop_start_cycle(
    client: AsyncClient, captured: dict[str, str], mock_docker: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    await client.post("/api/v1/labs/deploy", headers=headers)

    # Simulate the worker having provisioned the container.
    lab = await lab_repo.get_by_user(await _user_id(client, headers))
    assert lab is not None
    lab.container_id = "container-abc"
    await lab_repo.save(lab)

    stopped = await client.post("/api/v1/labs/stop", headers=headers)
    assert stopped.json()["data"]["status"] == "stopped"
    assert mock_docker["stopped"] == ["container-abc"]

    started = await client.post("/api/v1/labs/start", headers=headers)
    body = started.json()["data"]
    assert body["status"] == "running"
    assert body["host_port"] == 49152
    assert mock_docker["started"] == ["container-abc"]


async def test_start_before_provision_conflicts(
    client: AsyncClient, captured: dict[str, str], mock_docker: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    await client.post("/api/v1/labs/deploy", headers=headers)  # container_id still None
    resp = await client.post("/api/v1/labs/start", headers=headers)
    assert resp.status_code == 409


async def test_destroy_removes_lab(
    client: AsyncClient, captured: dict[str, str], mock_docker: dict[str, list]
) -> None:
    headers = await _auth(client, captured)
    await client.post("/api/v1/labs/deploy", headers=headers)

    resp = await client.request("DELETE", "/api/v1/labs", headers=headers)
    assert resp.status_code == 200
    assert mock_docker["removed"]  # docker cleanup invoked

    gone = await client.get("/api/v1/labs", headers=headers)
    assert gone.json()["data"] is None


async def test_lab_stats(
    client: AsyncClient,
    captured: dict[str, str],
    mock_docker: dict[str, list],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    headers = await _auth(client, captured)

    # No lab yet -> null
    empty = await client.get("/api/v1/labs/stats", headers=headers)
    assert empty.status_code == 200
    assert empty.json()["data"] is None

    # Simulate a provisioned, running lab.
    await client.post("/api/v1/labs/deploy", headers=headers)
    lab = await lab_repo.get_by_user(await _user_id(client, headers))
    assert lab is not None
    lab.container_id = "c1"
    lab.status = LabStatus.RUNNING
    await lab_repo.save(lab)

    snapshot = {
        "cpu_percent": 12.5,
        "mem_used": 100,
        "mem_limit": 1000,
        "mem_percent": 10.0,
        "rx_bytes": 2048,
        "tx_bytes": 4096,
    }
    monkeypatch.setattr(docker_service, "get_stats", lambda cid: snapshot)

    resp = await client.get("/api/v1/labs/stats", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["cpu_percent"] == 12.5
    assert data["mem_limit"] == 1000
    assert data["rx_bytes"] == 2048


async def test_labs_require_auth(client: AsyncClient) -> None:
    resp = await client.get("/api/v1/labs")
    assert resp.status_code == 401
