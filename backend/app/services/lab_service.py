"""Lab lifecycle orchestration (used by the async API).

Slow work (building/starting a container) is delegated to a Celery task; quick
operations (stop/start/inspect/destroy) call the Docker SDK directly via a
threadpool so they don't block the event loop.
"""

from __future__ import annotations

import asyncio

from app.core.exceptions import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.core.security import generate_password
from app.models.lab import Lab, LabStatus
from app.models.user import User
from app.repositories import lab_repo
from app.services import docker_service, ipam_service, traefik_service

log = get_logger("lab")


async def _enqueue_provision(lab_id: str) -> None:
    # Imported lazily so the API doesn't import Celery task internals at startup.
    from app.workers.tasks import provision_lab

    provision_lab.delay(lab_id)


async def deploy(user: User) -> Lab:
    """Create a lab (first deploy) or redeploy the existing one. Enqueues build."""
    existing = await lab_repo.get_by_user(str(user.id))
    if existing is None:
        ip = await ipam_service.allocate_lab_ip()
        lab = Lab(
            user_id=str(user.id),
            username=user.username,
            image="",  # set by the worker from settings
            internal_ip=ip,
            container_name=docker_service.container_name(user.username),
            volume_name=docker_service.volume_name(user.username),
            code_server_password=generate_password(),
            status=LabStatus.PENDING,
        )
        lab = await lab_repo.create(lab)
        log.info("lab.created", lab_id=str(lab.id), ip=ip)
    else:
        existing.status = LabStatus.PENDING
        existing.status_message = "Redeploy queued"
        lab = await lab_repo.save(existing)
        log.info("lab.redeploy", lab_id=str(lab.id))

    await _enqueue_provision(str(lab.id))
    return lab


async def get_with_live_status(user: User) -> Lab | None:
    lab = await lab_repo.get_by_user(str(user.id))
    if lab is None or lab.container_id is None:
        return lab
    docker_status = await asyncio.to_thread(docker_service.get_status, lab.container_id)
    # Reconcile DB status with what Docker actually reports.
    if docker_status == "missing" and lab.status == LabStatus.RUNNING:
        lab.status = LabStatus.FAILED
        lab.status_message = "Container not found"
        await lab_repo.save(lab)
    return lab


async def stop(user: User) -> Lab:
    lab = await _require_lab(user)
    if lab.container_id:
        await asyncio.to_thread(docker_service.stop_container, lab.container_id)
    await asyncio.to_thread(traefik_service.remove_lab_route, str(lab.user_id))
    lab.status = LabStatus.STOPPED
    lab.status_message = "Stopped by user"
    return await lab_repo.save(lab)


async def start(user: User) -> Lab:
    lab = await _require_lab(user)
    if lab.container_id is None:
        raise ConflictError("Lab has not been provisioned yet; deploy it first")
    host_port = await asyncio.to_thread(docker_service.start_container, lab.container_id)
    lab.host_port = host_port
    lab.status = LabStatus.RUNNING
    lab.status_message = "Started by user"
    await asyncio.to_thread(
        traefik_service.write_lab_route,
        str(lab.user_id),
        lab.username,
        lab.internal_ip,
        lab.domains,
    )
    return await lab_repo.save(lab)


async def destroy(user: User) -> None:
    lab = await _require_lab(user)
    await asyncio.to_thread(docker_service.remove_container, lab.username)
    await asyncio.to_thread(traefik_service.remove_lab_route, str(lab.user_id))
    await ipam_service.release_lab_ip(lab.internal_ip)
    await lab_repo.delete(lab)
    log.info("lab.destroyed", user_id=str(user.id))


async def _require_lab(user: User) -> Lab:
    lab = await lab_repo.get_by_user(str(user.id))
    if lab is None:
        raise NotFoundError("No lab found for this user")
    return lab
