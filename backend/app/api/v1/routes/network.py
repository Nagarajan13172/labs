"""WireGuard network / peer endpoints (Phase 3)."""

from __future__ import annotations

from fastapi import APIRouter, Response, status

from app.dependencies import CurrentUser
from app.models.peer import DeviceType
from app.schemas.common import ResponseEnvelope, ok
from app.schemas.network import DomainCreate, DomainList, PeerCreate, PeerOut, PeerStatus
from app.services import domain_service, peer_service

router = APIRouter(prefix="/network", tags=["Network"])


@router.post(
    "/peers", response_model=ResponseEnvelope[PeerOut], status_code=status.HTTP_201_CREATED
)
async def create_peer(data: PeerCreate, user: CurrentUser) -> ResponseEnvelope[PeerOut]:
    peer = await peer_service.create_peer(user, data.device_name, DeviceType.USER)
    return ok("Peer created", data=PeerOut.from_doc(peer))


@router.get("/peers", response_model=ResponseEnvelope[list[PeerStatus]])
async def list_peers(user: CurrentUser) -> ResponseEnvelope[list[PeerStatus]]:
    peers = await peer_service.list_peers_with_stats(user)
    return ok("Peers", data=[PeerStatus(**p) for p in peers])


@router.get("/peers/{peer_id}/config")
async def get_peer_config(peer_id: str, user: CurrentUser) -> Response:
    config = await peer_service.build_config(user, peer_id)
    return Response(
        content=config,
        media_type="text/plain",
        headers={"Content-Disposition": 'attachment; filename="wg0.conf"'},
    )


@router.get("/peers/{peer_id}/qr")
async def get_peer_qr(peer_id: str, user: CurrentUser) -> Response:
    png = await peer_service.build_qr_png(user, peer_id)
    return Response(content=png, media_type="image/png")


@router.delete("/peers/{peer_id}", response_model=ResponseEnvelope[None])
async def delete_peer(peer_id: str, user: CurrentUser) -> ResponseEnvelope[None]:
    await peer_service.delete_peer(user, peer_id)
    return ok("Peer deleted")


# --- Custom domains (Phase 4) ---
@router.get("/domains", response_model=ResponseEnvelope[DomainList])
async def list_domains(user: CurrentUser) -> ResponseEnvelope[DomainList]:
    data = await domain_service.list_domains(user)
    return ok("Domains", data=DomainList(**data))


@router.post(
    "/domains", response_model=ResponseEnvelope[DomainList], status_code=status.HTTP_201_CREATED
)
async def add_domain(data: DomainCreate, user: CurrentUser) -> ResponseEnvelope[DomainList]:
    result = await domain_service.add_domain(user, data.domain_name)
    return ok("Domain added", data=DomainList(**result))


@router.delete("/domains/{domain_name}", response_model=ResponseEnvelope[None])
async def remove_domain(domain_name: str, user: CurrentUser) -> ResponseEnvelope[None]:
    await domain_service.remove_domain(user, domain_name)
    return ok("Domain removed")
