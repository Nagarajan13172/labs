"""Lab response schemas."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.lab import Lab, LabStatus


class LabOut(BaseModel):
    id: str
    name: str
    status: LabStatus
    status_message: str | None
    internal_ip: str
    host_port: int | None
    image: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_doc(cls, lab: Lab) -> LabOut:
        return cls(
            id=str(lab.id),
            name=lab.name,
            status=lab.status,
            status_message=lab.status_message,
            internal_ip=lab.internal_ip,
            host_port=lab.host_port,
            image=lab.image,
            created_at=lab.created_at,
            updated_at=lab.updated_at,
        )


class LabCredentials(BaseModel):
    """Returned only to the owner, on demand."""

    code_server_password: str
    host_port: int | None
