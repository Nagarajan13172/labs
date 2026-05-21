"""Atomic counters (e.g. the lab IP allocator), keyed by name.

A single document per counter holds a monotonic ``next_index`` plus a pool of
``released`` indices. Allocation prefers the released pool, then increments —
both done with atomic ``find_one_and_update`` so concurrent provisions never
collide.
"""

from __future__ import annotations

from beanie import Document


class Counter(Document):
    name: str  # unique key, e.g. "lab_ip"
    next_index: int = 0
    released: list[int] = []

    class Settings:
        name = "counters"
        indexes = ["name"]
