"""Request/response schemas for the gateway control API."""

from __future__ import annotations

from pydantic import BaseModel


class PeerIn(BaseModel):
    public_key: str
    allowed_ip: str
    preshared_key: str | None = None


class PeerStat(BaseModel):
    public_key: str
    endpoint: str | None
    allowed_ips: str
    latest_handshake: int
    rx_bytes: int
    tx_bytes: int


class ServerInfo(BaseModel):
    public_key: str
    endpoint: str
    listen_port: int
    address: str
