"""WireGuard peer document (Beanie/MongoDB).

Note: the client's private/preshared keys are stored so the config and QR can
be re-served on demand (matching the original UX). A hardened deployment would
either generate keys client-side or encrypt these at rest — see the roadmap.
"""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum

import pymongo
from beanie import Document
from pydantic import Field


class DeviceType(StrEnum):
    USER = "user"  # a user's device (phone/laptop)
    LAB = "lab"  # the user's lab container


def _utcnow() -> datetime:
    return datetime.now(UTC)


class Peer(Document):
    user_id: str
    device_name: str
    device_type: DeviceType = DeviceType.USER
    public_key: str
    private_key: str
    preshared_key: str
    address: str  # allocated VPN IP, e.g. 10.8.0.2
    created_at: datetime = Field(default_factory=_utcnow)

    class Settings:
        name = "peers"
        indexes = [
            [("user_id", pymongo.ASCENDING)],
            [("public_key", pymongo.ASCENDING)],
        ]
