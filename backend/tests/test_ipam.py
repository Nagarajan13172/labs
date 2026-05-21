"""Atomic IP allocator tests."""

from __future__ import annotations

import asyncio

from app.services import ipam_service
from httpx import AsyncClient


async def test_allocations_are_sequential_and_skip_reserved(client: AsyncClient) -> None:
    # client fixture initializes Beanie; the HTTP client itself is unused here.
    first = await ipam_service.allocate_ip()
    second = await ipam_service.allocate_ip()
    assert first == "172.30.0.2"  # .0 network and .1 gateway are skipped
    assert second == "172.30.0.3"


async def test_concurrent_allocations_are_unique(client: AsyncClient) -> None:
    ips = await asyncio.gather(*(ipam_service.allocate_ip() for _ in range(25)))
    assert len(set(ips)) == 25  # no collisions under concurrency


async def test_released_ip_is_reused(client: AsyncClient) -> None:
    a = await ipam_service.allocate_ip()
    b = await ipam_service.allocate_ip()
    await ipam_service.release_ip(a)
    reused = await ipam_service.allocate_ip()
    assert reused == a  # released address comes back before a fresh one
    assert b != reused
