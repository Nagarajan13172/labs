"""Traefik dynamic-config generation tests."""

from __future__ import annotations

import pytest
import yaml
from app.core.config import settings
from app.services import traefik_service


@pytest.fixture
def dynamic_dir(tmp_path, monkeypatch: pytest.MonkeyPatch):  # type: ignore[no-untyped-def]
    monkeypatch.setattr(settings, "traefik_dynamic_dir", str(tmp_path))
    return tmp_path


def test_write_lab_route_builds_router_and_service(dynamic_dir) -> None:  # type: ignore[no-untyped-def]
    traefik_service.write_lab_route(
        user_id="abc123", username="demo", internal_ip="172.30.0.5", domains=["app.example.com"]
    )
    path = dynamic_dir / "lab-abc123.yml"
    assert path.exists()

    config = yaml.safe_load(path.read_text())
    router = config["http"]["routers"]["lab-abc123"]
    assert "Host(`demo.lab.localhost`)" in router["rule"]
    assert "Host(`app.example.com`)" in router["rule"]
    assert router["service"] == "lab-abc123"

    service = config["http"]["services"]["lab-abc123"]
    assert service["loadBalancer"]["servers"][0]["url"] == "http://172.30.0.5:8080"


def test_remove_lab_route(dynamic_dir) -> None:  # type: ignore[no-untyped-def]
    traefik_service.write_lab_route("abc123", "demo", "172.30.0.5", [])
    assert (dynamic_dir / "lab-abc123.yml").exists()
    traefik_service.remove_lab_route("abc123")
    assert not (dynamic_dir / "lab-abc123.yml").exists()
    # idempotent
    traefik_service.remove_lab_route("abc123")


def test_auto_host(dynamic_dir) -> None:  # type: ignore[no-untyped-def]
    assert traefik_service.auto_host("demo") == "demo.lab.localhost"
