"""DBaaS engine helper tests (no real engines)."""

from __future__ import annotations

import pytest
from app.core.config import settings
from app.core.exceptions import ValidationError
from app.services import db_engines
from app.services.db_engines import DatabaseEngine


def test_valid_identifiers() -> None:
    db_engines.validate_identifier("demo_app")
    db_engines.validate_identifier("a")
    db_engines.validate_identifier("u123_x")


@pytest.mark.parametrize(
    "bad",
    ["", "1abc", "Demo", "a-b", "a b", "drop;table", "a" * 33, "x'y"],
)
def test_invalid_identifiers(bad: str) -> None:
    with pytest.raises(ValidationError):
        db_engines.validate_identifier(bad)


def test_enabled_engines_respects_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "dbaas_engines_enabled", ["mysql", "mongodb"])
    enabled = db_engines.enabled_engines()
    assert DatabaseEngine.MYSQL in enabled
    assert DatabaseEngine.MONGODB in enabled
    assert DatabaseEngine.MARIADB not in enabled


def test_get_spec_rejects_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "dbaas_engines_enabled", ["mysql"])
    with pytest.raises(ValidationError):
        db_engines.get_spec(DatabaseEngine.MARIADB)


def test_spec_ports() -> None:
    assert db_engines.get_spec(DatabaseEngine.MYSQL).public_port == 3306
    assert db_engines.get_spec(DatabaseEngine.MARIADB).public_port == 3307
    assert db_engines.get_spec(DatabaseEngine.MONGODB).public_port == 27018
