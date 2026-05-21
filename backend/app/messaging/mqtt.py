"""MQTT publisher for real-time progress.

Publishes are one-shot (connect, publish, disconnect). This keeps the publisher
usable from both the async API and the synchronous Celery worker without
managing a long-lived shared connection. For the foundation's low message
volume this is more than adequate; a pooled long-lived client can replace it
later if needed.
"""

from __future__ import annotations

import asyncio

import aiomqtt

from app.core.config import settings
from app.core.logging import get_logger
from app.messaging.schemas import MqttMsg

log = get_logger("mqtt")


async def publish_async(topic: str, msg: MqttMsg) -> None:
    """Publish a single message (async, for use inside the API)."""
    try:
        async with aiomqtt.Client(
            hostname=settings.mqtt_host,
            port=settings.mqtt_port,
            username=settings.mqtt_username or None,
            password=settings.mqtt_password or None,
        ) as client:
            await client.publish(topic, payload=msg.to_json())
    except aiomqtt.MqttError as exc:  # never let telemetry break a request
        log.warning("mqtt.publish_failed", topic=topic, error=str(exc))


def publish_sync(topic: str, msg: MqttMsg) -> None:
    """Publish a single message (sync, for use inside Celery tasks)."""
    asyncio.run(publish_async(topic, msg))


async def ping_mqtt() -> bool:
    """Readiness check: can we open an MQTT connection?"""
    try:
        async with aiomqtt.Client(
            hostname=settings.mqtt_host,
            port=settings.mqtt_port,
            username=settings.mqtt_username or None,
            password=settings.mqtt_password or None,
        ):
            return True
    except aiomqtt.MqttError:
        return False
