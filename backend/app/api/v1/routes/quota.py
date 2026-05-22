"""Quota / limits endpoint — surfaces the per-user caps to clients."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.config import settings
from app.dependencies import CurrentUser
from app.schemas.common import ResponseEnvelope, ok
from app.schemas.quota import Quota

router = APIRouter(prefix="/quota", tags=["Quota"])


@router.get("", response_model=ResponseEnvelope[Quota])
async def get_quota(user: CurrentUser) -> ResponseEnvelope[Quota]:
    return ok(
        "Quota",
        data=Quota(
            max_client_peers=settings.max_client_peers,
            max_domains=settings.max_domains,
            max_databases=settings.dbaas_max_databases,
        ),
    )
