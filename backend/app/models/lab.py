"""Lab document (Beanie/MongoDB) — one provisioned container per user."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

from beanie import Document, Indexed
from pydantic import Field


class LabStatus(StrEnum):
    PENDING = "pending"  # queued, not yet built
    PROVISIONING = "provisioning"  # worker is building/starting
    RUNNING = "running"
    STOPPED = "stopped"
    FAILED = "failed"


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Lab(Document):
    user_id: Indexed(str, unique=True)  # type: ignore[valid-type]  # one lab per user
    username: str
    name: str = "Ubuntu Lab"
    image: str
    status: LabStatus = LabStatus.PENDING

    # Networking / runtime (filled in as provisioning progresses)
    internal_ip: str
    container_id: str | None = None
    container_name: str
    volume_name: str
    host_port: int | None = None  # published code-server port (dev/Phase-2)

    # Access
    code_server_password: str

    status_message: str | None = None
    created_at: datetime = Field(default_factory=_utcnow)
    updated_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "labs"

    def touch(self) -> None:
        self.updated_at = _utcnow()
