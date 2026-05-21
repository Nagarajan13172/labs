"""Custom domain management for a user's lab.

Adding a domain optionally verifies (when ``dns_verification_enabled``) that it
resolves to ``server_public_ip``, then attaches it to the lab and refreshes the
Traefik route so it takes effect immediately.
"""

from __future__ import annotations

import asyncio
import socket

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError, ValidationError
from app.core.logging import get_logger
from app.models.lab import Lab, LabStatus
from app.models.user import User
from app.repositories import lab_repo
from app.services import traefik_service

log = get_logger("domain")


async def _resolve(domain: str) -> str | None:
    try:
        return await asyncio.to_thread(socket.gethostbyname, domain)
    except OSError:
        return None


async def verify_dns(domain: str) -> bool:
    """True if DNS verification is disabled, or the domain points to us."""
    if not settings.dns_verification_enabled:
        return True
    if not settings.server_public_ip:
        return False
    return await _resolve(domain) == settings.server_public_ip


async def _sync_route(lab: Lab) -> None:
    """Refresh the Traefik route file when the lab is running."""
    if lab.status == LabStatus.RUNNING and lab.container_id:
        await asyncio.to_thread(
            traefik_service.write_lab_route,
            str(lab.user_id),
            lab.username,
            lab.internal_ip,
            lab.domains,
        )


async def list_domains(user: User) -> dict:
    lab = await _require_lab(user)
    return {"auto_host": traefik_service.auto_host(lab.username), "domains": lab.domains}


async def add_domain(user: User, domain_name: str) -> dict:
    lab = await _require_lab(user)
    domain_name = domain_name.lower().strip()

    if domain_name in lab.domains:
        raise ConflictError("Domain already added")
    if len(lab.domains) >= settings.max_domains:
        raise ConflictError(f"Maximum of {settings.max_domains} domains reached")
    if not await verify_dns(domain_name):
        raise ValidationError(
            f"Domain does not resolve to this server ({settings.server_public_ip})"
        )

    lab.domains.append(domain_name)
    await lab_repo.save(lab)
    await _sync_route(lab)
    log.info("domain.added", user_id=str(user.id), domain=domain_name)
    return {"auto_host": traefik_service.auto_host(lab.username), "domains": lab.domains}


async def remove_domain(user: User, domain_name: str) -> None:
    lab = await _require_lab(user)
    domain_name = domain_name.lower().strip()
    if domain_name not in lab.domains:
        raise NotFoundError("Domain not found")
    lab.domains.remove(domain_name)
    await lab_repo.save(lab)
    await _sync_route(lab)
    log.info("domain.removed", user_id=str(user.id), domain=domain_name)


async def _require_lab(user: User) -> Lab:
    lab = await lab_repo.get_by_user(str(user.id))
    if lab is None:
        raise NotFoundError("Deploy a lab before managing domains")
    return lab
