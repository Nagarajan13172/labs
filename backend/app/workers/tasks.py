"""Celery tasks.

The sample task below demonstrates the exact pattern future provisioning work
(lab image build, WireGuard peer creation, etc.) will follow: a long-running
job that streams staged progress to the user's MQTT topic. Replace the
``time.sleep`` stages with real Docker/WireGuard steps in later phases.
"""

from __future__ import annotations

import time

from app.core.logging import get_logger
from app.messaging.mqtt import publish_sync
from app.messaging.schemas import MqttMsg
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
