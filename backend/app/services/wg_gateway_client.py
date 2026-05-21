"""Async HTTP client for the WireGuard gateway control plane.

The main API never touches ``wg`` directly — it calls the privileged gateway
over the internal network, authenticated with a shared token.
"""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings
from app.core.exceptions import AppError


class GatewayError(AppError):
    status_code = 502
    message = "WireGuard gateway error"


def _headers() -> dict[str, str]:
    return {"X-Gateway-Token": settings.gateway_token}


async def _request(method: str, path: str, **kwargs: Any) -> httpx.Response:
    url = f"{settings.gateway_url}{path}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.request(method, url, headers=_headers(), **kwargs)
    except httpx.HTTPError as exc:
        raise GatewayError(f"Cannot reach WireGuard gateway: {exc}") from exc
    if resp.status_code >= 400:
        raise GatewayError(f"Gateway returned {resp.status_code}: {resp.text}")
    return resp


async def get_server_info() -> dict[str, Any]:
    resp = await _request("GET", "/server")
    return resp.json()


async def add_peer(public_key: str, allowed_ip: str, preshared_key: str | None) -> None:
    await _request(
        "POST",
        "/peers",
        json={"public_key": public_key, "allowed_ip": allowed_ip, "preshared_key": preshared_key},
    )


async def remove_peer(public_key: str) -> None:
    await _request("DELETE", "/peers", params={"public_key": public_key})


async def list_peer_stats() -> dict[str, dict[str, Any]]:
    """Return live peer stats keyed by public key."""
    resp = await _request("GET", "/peers")
    return {p["public_key"]: p for p in resp.json()}
