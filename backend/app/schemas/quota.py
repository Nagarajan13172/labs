"""User quota / limit schema."""

from __future__ import annotations

from pydantic import BaseModel


class Quota(BaseModel):
    max_client_peers: int
    max_domains: int
    max_databases: int
