"""Health/readiness probe tests."""

from __future__ import annotations

from httpx import AsyncClient


async def test_healthz(client: AsyncClient) -> None:
    resp = await client.get("/healthz")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] is True
    assert body["message"] == "ok"


async def test_readyz_reports_dependencies(client: AsyncClient) -> None:
    resp = await client.get("/readyz")
    body = resp.json()
    # Redis is faked and must be reachable; the structure is always present.
    assert set(body["data"].keys()) == {"mongo", "redis", "mqtt"}
    assert body["data"]["redis"] is True
