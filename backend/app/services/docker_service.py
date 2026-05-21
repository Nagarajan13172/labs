"""Thin, synchronous wrapper around the Docker SDK.

All functions are blocking (the Docker SDK is sync). They are called directly
from the Celery worker, and from the async API via ``asyncio.to_thread`` (see
``lab_service``). Talking to Docker requires ``/var/run/docker.sock`` mounted
into the api and worker containers.
"""

from __future__ import annotations

import contextlib
import re
from typing import Any

import docker
from docker.errors import APIError, NotFound
from docker.models.containers import Container

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("docker")

_client: docker.DockerClient | None = None


def get_client() -> docker.DockerClient:
    global _client
    if _client is None:
        _client = docker.from_env()
    return _client


def sanitize(name: str) -> str:
    """Make a Docker-safe name fragment from a username."""
    cleaned = re.sub(r"[^a-zA-Z0-9_.-]", "-", name).strip("-._")
    return cleaned.lower() or "lab"


def container_name(username: str) -> str:
    return f"lab-{sanitize(username)}"


def volume_name(username: str) -> str:
    return f"lab_{sanitize(username)}"


def ensure_network() -> None:
    """Create the labs bridge network (with our subnet) if it doesn't exist."""
    client = get_client()
    try:
        client.networks.get(settings.lab_network_name)
        return
    except NotFound:
        pass
    ipam_pool = docker.types.IPAMPool(subnet=settings.lab_network_subnet)
    ipam_config = docker.types.IPAMConfig(pool_configs=[ipam_pool])
    client.networks.create(
        settings.lab_network_name, driver="bridge", ipam=ipam_config, check_duplicate=True
    )
    log.info("docker.network_created", name=settings.lab_network_name)


def ensure_image(image: str) -> None:
    """Pull the image if it isn't present locally (low-level API won't auto-pull)."""
    client = get_client()
    try:
        client.images.get(image)
    except NotFound:
        log.info("docker.pulling_image", image=image)
        client.images.pull(image)


def _remove_if_exists(name: str) -> None:
    try:
        existing = get_client().containers.get(name)
        existing.remove(force=True)
        log.info("docker.removed_existing", name=name)
    except NotFound:
        pass


def run_lab_container(username: str, internal_ip: str, code_server_password: str) -> dict[str, Any]:
    """(Re)create and start a lab container with a static IP. Returns runtime details.

    Uses the low-level API because the high-level ``containers.run`` cannot
    assign a static IPv4 on a user-defined network.
    """
    client = get_client()
    ensure_network()
    ensure_image(settings.lab_base_image)
    name = container_name(username)
    _remove_if_exists(name)
    api = client.api
    port = settings.lab_internal_port

    host_config = api.create_host_config(
        binds={volume_name(username): {"bind": settings.lab_home_path, "mode": "rw"}},
        port_bindings={port: None},  # publish to a random host port
        mem_limit=settings.lab_mem_limit,
        nano_cpus=int(settings.lab_cpus * 1_000_000_000),
        cap_add=["NET_ADMIN"],
        restart_policy={"Name": "unless-stopped"},
    )
    networking_config = api.create_networking_config(
        {settings.lab_network_name: api.create_endpoint_config(ipv4_address=internal_ip)}
    )
    created = api.create_container(
        image=settings.lab_base_image,
        name=name,
        hostname="youngstorage",
        environment={"PASSWORD": code_server_password},
        ports=[port],
        labels={"youngstorage.lab": "true", "youngstorage.user": sanitize(username)},
        host_config=host_config,
        networking_config=networking_config,
        detach=True,
    )
    container_id = created["Id"]
    api.start(container_id)
    container = client.containers.get(container_id)
    return {"container_id": container.id, "host_port": _published_port(container)}


def _published_port(container: Container) -> int | None:
    ports = container.attrs.get("NetworkSettings", {}).get("Ports") or {}
    binding = ports.get(f"{settings.lab_internal_port}/tcp")
    if binding:
        return int(binding[0]["HostPort"])
    return None


def stop_container(container_id: str) -> None:
    with contextlib.suppress(NotFound):
        get_client().containers.get(container_id).stop()


def start_container(container_id: str) -> int | None:
    container = get_client().containers.get(container_id)
    container.start()
    container.reload()
    return _published_port(container)


def remove_container(username: str, *, remove_volume: bool = True) -> None:
    client = get_client()
    _remove_if_exists(container_name(username))
    if remove_volume:
        with contextlib.suppress(NotFound, APIError):
            client.volumes.get(volume_name(username)).remove(force=True)


def get_status(container_id: str) -> str:
    """Return the Docker container state, or 'missing' if it's gone."""
    try:
        return str(get_client().containers.get(container_id).status)
    except NotFound:
        return "missing"
