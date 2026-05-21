"""Atomic IP address management for the lab and VPN networks.

Index 0 is the network address and index 1 is reserved for the gateway/server,
so allocation starts at index 2. Allocation and release are atomic
``find_one_and_update`` operations, so two concurrent operations can never
receive the same address — this replaces the original project's racy
read-modify-write ``baselist`` allocator.
"""

from __future__ import annotations

import ipaddress

from pymongo import ReturnDocument

from app.core.config import settings
from app.core.exceptions import AppError
from app.models.counter import Counter

_LAB_COUNTER = "lab_ip"
_VPN_COUNTER = "vpn_ip"
_FIRST_INDEX = 2  # skip network (.0) and gateway/server (.1)

IPNetwork = ipaddress.IPv4Network | ipaddress.IPv6Network


class IPPoolExhaustedError(AppError):
    status_code = 503
    message = "No IP addresses available"


def _network(cidr: str) -> IPNetwork:
    return ipaddress.ip_network(cidr, strict=False)


def _index_to_ip(network: IPNetwork, index: int) -> str:
    if index >= network.num_addresses - 1:  # last addr is broadcast
        raise IPPoolExhaustedError()
    return str(network[index])


async def _allocate(counter_name: str, cidr: str) -> str:
    network = _network(cidr)
    coll = Counter.get_motor_collection()

    # 1) Try to reclaim a previously released index (atomic pop).
    doc = await coll.find_one_and_update(
        {"name": counter_name, "released.0": {"$exists": True}},
        {"$pop": {"released": -1}},
        projection={"released": {"$slice": 1}},
        return_document=ReturnDocument.BEFORE,
    )
    if doc and doc.get("released"):
        return _index_to_ip(network, doc["released"][0])

    # 2) Otherwise hand out the next monotonic index (atomic upsert + inc).
    doc = await coll.find_one_and_update(
        {"name": counter_name},
        {"$inc": {"next_index": 1}, "$setOnInsert": {"released": []}},
        upsert=True,
        return_document=ReturnDocument.AFTER,
    )
    # next_index starts at 0; offset so the first allocation yields _FIRST_INDEX.
    return _index_to_ip(network, _FIRST_INDEX - 1 + doc["next_index"])


async def _release(counter_name: str, cidr: str, ip: str) -> None:
    network = _network(cidr)
    addr = ipaddress.ip_address(ip)
    if addr not in network:
        return  # not part of this network; nothing to release
    index = int(addr) - int(network.network_address)
    coll = Counter.get_motor_collection()
    await coll.update_one({"name": counter_name}, {"$addToSet": {"released": index}}, upsert=True)


# --- Lab network ---
async def allocate_lab_ip() -> str:
    return await _allocate(_LAB_COUNTER, settings.lab_network_subnet)


async def release_lab_ip(ip: str) -> None:
    await _release(_LAB_COUNTER, settings.lab_network_subnet, ip)


# --- VPN network ---
async def allocate_vpn_ip() -> str:
    return await _allocate(_VPN_COUNTER, settings.vpn_subnet)


async def release_vpn_ip(ip: str) -> None:
    await _release(_VPN_COUNTER, settings.vpn_subnet, ip)
