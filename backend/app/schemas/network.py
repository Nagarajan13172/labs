"""Network/peer request and response schemas."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models.peer import DeviceType, Peer

_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$"
)


class PeerCreate(BaseModel):
    device_name: str = Field(..., min_length=1, max_length=64)


class PeerOut(BaseModel):
    id: str
    device_name: str
    device_type: DeviceType
    address: str
    public_key: str
    created_at: datetime

    @classmethod
    def from_doc(cls, peer: Peer) -> PeerOut:
        return cls(
            id=str(peer.id),
            device_name=peer.device_name,
            device_type=peer.device_type,
            address=peer.address,
            public_key=peer.public_key,
            created_at=peer.created_at,
        )


class PeerStatus(BaseModel):
    id: str
    device_name: str
    device_type: DeviceType
    address: str
    public_key: str
    endpoint: str | None = None
    latest_handshake: int = 0
    rx_bytes: int = 0
    tx_bytes: int = 0
    created_at: datetime


class DomainCreate(BaseModel):
    domain_name: str

    @field_validator("domain_name")
    @classmethod
    def _valid_domain(cls, value: str) -> str:
        value = value.lower().strip()
        if not _DOMAIN_RE.match(value):
            raise ValueError("Invalid domain name")
        return value


class DomainList(BaseModel):
    auto_host: str
    domains: list[str]
