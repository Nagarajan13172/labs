"""Celery tasks.

The sample task below demonstrates the exact pattern future provisioning work
(lab image build, WireGuard peer creation, etc.) will follow: a long-running
job that streams staged progress to the user's MQTT topic. Replace the
``time.sleep`` stages with real Docker/WireGuard steps in later phases.
"""

from __future__ import annotations

import time

from app.core.config import settings
from app.core.logging import get_logger
from app.messaging.mqtt import publish_sync
from app.messaging.schemas import MqttMsg
from app.models.lab import LabStatus
from app.services import docker_service
from app.workers import sync_db
from app.workers.celery_app import celery_app

log = get_logger("tasks")


@celery_app.task(name="sample.long_task", bind=True)
def sample_long_task(self, username: str) -> dict:  # type: ignore[no-untyped-def]
    """Simulate a multi-stage provisioning job, streaming progress over MQTT."""
    topic = f"/topic/{username}"
    stages = [
        "Job accepted...",
        "Preparing resources...",
        "Building image...",
        "Starting service...",
    ]
    for i, stage in enumerate(stages, start=1):
        publish_sync(topic, MqttMsg(message=stage, status=True))
        log.info("task.progress", username=username, stage=stage, step=i)
        time.sleep(1)

    publish_sync(topic, MqttMsg(message="Done!", status=True, is_finished=True))
    return {"username": username, "stages": len(stages), "status": "completed"}


@celery_app.task(name="lab.provision", bind=True, max_retries=0)
def provision_lab(self, lab_id: str) -> dict:  # type: ignore[no-untyped-def]
    """Build/start a user's lab container, streaming progress over MQTT.

    Runs in the (synchronous) Celery worker: Docker calls are made directly and
    state is persisted via the sync pymongo helper.
    """
    lab = sync_db.get_lab(lab_id)
    if lab is None:
        log.warning("provision.lab_missing", lab_id=lab_id)
        return {"lab_id": lab_id, "status": "missing"}

    username = lab["username"]
    topic = f"/topic/{username}"

    def progress(message: str) -> None:
        publish_sync(topic, MqttMsg(message=message, status=True))

    try:
        sync_db.update_lab(
            lab_id,
            status=LabStatus.PROVISIONING.value,
            status_message="Provisioning started",
            image=settings.lab_base_image,
        )
        progress("Provisioning started...")

        progress("Preparing lab network...")
        docker_service.ensure_network()

        progress(f"Pulling image {settings.lab_base_image}...")
        progress("Starting your lab container...")
        runtime = docker_service.run_lab_container(
            username=username,
            internal_ip=lab["internal_ip"],
            code_server_password=lab["code_server_password"],
        )

        sync_db.update_lab(
            lab_id,
            status=LabStatus.RUNNING.value,
            status_message="Lab is running",
            container_id=runtime["container_id"],
            host_port=runtime["host_port"],
        )
        log.info("provision.success", lab_id=lab_id, container_id=runtime["container_id"])
        publish_sync(topic, MqttMsg(message="Lab is ready!", status=True, is_finished=True))
        return {"lab_id": lab_id, "status": "running", **runtime}
    except Exception as exc:  # surface failure to the user + DB
        log.exception("provision.failed", lab_id=lab_id)
        sync_db.update_lab(lab_id, status=LabStatus.FAILED.value, status_message=str(exc))
        publish_sync(
            topic,
            MqttMsg(
                message=f"Provisioning failed: {exc}", status=False, is_error=True, is_finished=True
            ),
        )
        return {"lab_id": lab_id, "status": "failed", "error": str(exc)}
