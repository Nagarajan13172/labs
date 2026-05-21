"""Generate Traefik dynamic config (file provider) for lab routing.

Each lab gets one YAML file in the watched dynamic directory describing a router
(Host rules for the auto subdomain + any verified custom domains) and a service
pointing at the lab container's IP. Traefik hot-reloads the file, so domains can
be added/removed at runtime without recreating containers or restarting Traefik.

These functions are synchronous file I/O: the worker calls them directly; the
async API calls them via ``asyncio.to_thread``.
"""

from __future__ import annotations

import os

import yaml

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("traefik")


def _file_path(user_id: str) -> str:
    return os.path.join(settings.traefik_dynamic_dir, f"lab-{user_id}.yml")


def auto_host(username: str) -> str:
    return f"{username}.{settings.lab_domain_base}"


def lab_hosts(username: str, domains: list[str]) -> list[str]:
    return [auto_host(username), *domains]


def _build_config(user_id: str, hosts: list[str], internal_ip: str) -> dict:
    name = f"lab-{user_id}"
    rule = " || ".join(f"Host(`{h}`)" for h in hosts)
    return {
        "http": {
            "routers": {
                name: {
                    "rule": rule,
                    "service": name,
                    "entryPoints": [settings.traefik_entrypoint],
                }
            },
            "services": {
                name: {
                    "loadBalancer": {
                        "servers": [{"url": f"http://{internal_ip}:{settings.lab_internal_port}"}]
                    }
                }
            },
        }
    }


def write_lab_route(user_id: str, username: str, internal_ip: str, domains: list[str]) -> None:
    """Create/update the Traefik route file for a running lab."""
    os.makedirs(settings.traefik_dynamic_dir, exist_ok=True)
    config = _build_config(user_id, lab_hosts(username, domains), internal_ip)
    path = _file_path(user_id)
    tmp = f"{path}.tmp"
    with open(tmp, "w") as f:
        yaml.safe_dump(config, f, default_flow_style=False)
    os.replace(tmp, path)  # atomic so Traefik never reads a partial file
    log.info("traefik.route_written", user_id=user_id, hosts=lab_hosts(username, domains))


def remove_lab_route(user_id: str) -> None:
    """Remove a lab's route file (e.g. stopped/destroyed)."""
    path = _file_path(user_id)
    if os.path.exists(path):
        os.remove(path)
        log.info("traefik.route_removed", user_id=user_id)
