"""Demo job endpoints showcasing the Celery + MQTT progress seam.

These exist to prove the background-job pipeline end-to-end during the
foundation phase; real provisioning endpoints will replace them in Phase 2.
"""

from __future__ import annotations

from celery.result import AsyncResult
from fastapi import APIRouter

from app.dependencies import CurrentUser
from app.schemas.common import ResponseEnvelope, ok
from app.workers.celery_app import celery_app
from app.workers.tasks import sample_long_task

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("/sample", response_model=ResponseEnvelope[dict])
async def start_sample_job(user: CurrentUser) -> ResponseEnvelope[dict]:
    """Enqueue the sample task; watch progress on MQTT topic /topic/<username>."""
    result = sample_long_task.delay(user.username)
    return ok("Job enqueued", data={"task_id": result.id, "topic": f"/topic/{user.username}"})


@router.get("/{task_id}", response_model=ResponseEnvelope[dict])
async def get_job_status(task_id: str, user: CurrentUser) -> ResponseEnvelope[dict]:
    result = AsyncResult(task_id, app=celery_app)
    payload = result.result if result.successful() else None
    return ok("Job status", data={"task_id": task_id, "state": result.state, "result": payload})
