"""Celery application (Redis broker + result backend)."""

from __future__ import annotations

from celery import Celery

from app.core.config import settings

celery_app = Celery(
    "youngstorage",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_time_limit=60 * 30,
    task_soft_time_limit=60 * 25,
    worker_max_tasks_per_child=100,
    result_expires=60 * 60,
)
