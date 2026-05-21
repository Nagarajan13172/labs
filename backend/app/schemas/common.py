"""Shared response envelope: ``{"message", "status", "data"}``.

Kept compatible with the original API contract so an existing frontend can
consume responses unchanged.
"""

from __future__ import annotations

from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ResponseEnvelope(BaseModel, Generic[T]):
    message: str
    status: bool = True
    data: T | None = None


def ok(message: str, data: T | None = None) -> ResponseEnvelope[T]:
    return ResponseEnvelope[T](message=message, status=True, data=data)
