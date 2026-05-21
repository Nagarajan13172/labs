"""Atomic IP address management for the lab network.

IPs are allocated from ``settings.lab_network_subnet``. Index 0 is the network
address and index 1 is reserved for the gateway, so allocation starts at 2.
Allocation and release are atomic ``find_one_and_update`` operations, so two
concurrent provisions can never receive the same address — this replaces the
original project's racy read-modify-write ``baselist`` allocator.
"""

from __future__ import annotations

import ipaddress

from pymongo import ReturnDocument

from app.core.config import settings
from app.core.exceptions import AppError
from app.models.counter import Counter

_COUNTER_NAME = "lab_ip"
_FIRST_INDEX = 2  # skip network (.0) and gateway (.1)


class IPPoolExhaustedError(AppError):
    status_code = 503
    message = "No lab IP addresses available"


def _network() -> ipaddress.IPv4Network | ipaddress.IPv6Network:
    return ipaddress.ip_network(settings.lab_network_subnet, strict=False)


def index_to_ip(index: int) -> str:
    network = _network()
    if index >= network.num_addresses - 1:  # last addr is broadcast
        raise IPPoolExhaustedError()
    return str(network[index])


async def allocate_ip() -> str:
    """Reserve and return the next free IP (reusing released ones first)."""
    coll = Counter.get_motor_collection()

    # 1) Try to reclaim a previously released index (atomic pop).
    doc = await coll.find_one_and_update(
        {"name": _COUNTER_NAME, "released.0": {"$exists": True}},
        {"$pop": {"released": -1}},
        projection={"released": {"$slice": 1}},
        return_document=ReturnDocument.BEFORE,
    )
    if doc and doc.get("released"):
        return index_to_ip(doc["released"][0])

    # 2) Otherwise hand out the next monotonic index (atomic upsert + inc).
    doc = await coll.find_one_and_update(
        {"name": _COUNTER_NAME},
        {"$inc": {"next_index": 1}, "$setOnInsert": {"released": []}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    raw_index = doc["next_index"]
    # next_index starts at 0; offset so the first allocation yields _FIRST_INDEX.
    return index_to_ip(_FIRST_INDEX - 1 + raw_index)


async def release_ip(ip: str) -> None:
    """Return an IP to the pool so it can be reused."""
    network = _network()
    addr = ipaddress.ip_address(ip)
    if addr not in network:
        return  # not part of this network; nothing to release
    index = int(addr) - int(network.network_address)
    coll = Counter.get_motor_collection()
    await coll.update_one(
        {"name": _COUNTER_NAME},
        {"$addToSet": {"released": index}},
        upsert=True,
    )
