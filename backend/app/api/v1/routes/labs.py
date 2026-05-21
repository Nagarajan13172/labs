"""Lab provisioning endpoints (Phase 2)."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.core.exceptions import NotFoundError
from app.dependencies import CurrentUser
from app.repositories import lab_repo
from app.schemas.common import ResponseEnvelope, ok
from app.schemas.lab import LabCredentials, LabOut
from app.services import lab_service

router = APIRouter(prefix="/labs", tags=["Labs"])


@router.post(
    "/deploy", response_model=ResponseEnvelope[LabOut], status_code=status.HTTP_202_ACCEPTED
)
async def deploy_lab(user: CurrentUser) -> ResponseEnvelope[LabOut]:
    """Create or redeploy the user's lab. Provisioning runs in the background;
    watch progress on MQTT topic ``/topic/<username>``."""
    lab = await lab_service.deploy(user)
    return ok("Lab deployment queued", data=LabOut.from_doc(lab))


@router.get("", response_model=ResponseEnvelope[LabOut | None])
async def get_lab(user: CurrentUser) -> ResponseEnvelope[LabOut | None]:
    lab = await lab_service.get_with_live_status(user)
    return ok("Lab", data=LabOut.from_doc(lab) if lab else None)


@router.get("/credentials", response_model=ResponseEnvelope[LabCredentials])
async def get_credentials(user: CurrentUser) -> ResponseEnvelope[LabCredentials]:
    lab = await lab_repo.get_by_user(str(user.id))
    if lab is None:
        raise NotFoundError("No lab found for this user")
    return ok(
        "Lab credentials",
        data=LabCredentials(code_server_password=lab.code_server_password, host_port=lab.host_port),
    )


@router.post("/stop", response_model=ResponseEnvelope[LabOut])
async def stop_lab(user: CurrentUser) -> ResponseEnvelope[LabOut]:
    lab = await lab_service.stop(user)
    return ok("Lab stopped", data=LabOut.from_doc(lab))


@router.post("/start", response_model=ResponseEnvelope[LabOut])
async def start_lab(user: CurrentUser) -> ResponseEnvelope[LabOut]:
    lab = await lab_service.start(user)
    return ok("Lab started", data=LabOut.from_doc(lab))


@router.delete("", response_model=ResponseEnvelope[None])
async def destroy_lab(user: CurrentUser) -> ResponseEnvelope[None]:
    await lab_service.destroy(user)
    return ok("Lab destroyed")
