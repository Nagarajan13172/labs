"""MongoDB access for the Peer document."""

from __future__ import annotations

from beanie import PydanticObjectId

from app.models.peer import DeviceType, Peer


async def list_for_user(user_id: str) -> list[Peer]:
    return await Peer.find(Peer.user_id == user_id).to_list()


async def count_for_user(user_id: str, device_type: DeviceType) -> int:
    return await Peer.find(Peer.user_id == user_id, Peer.device_type == device_type).count()


async def get_for_user(peer_id: str, user_id: str) -> Peer | None:
    try:
        peer = await Peer.get(PydanticObjectId(peer_id))
    except Exception:
        return None
    return peer if peer and peer.user_id == user_id else None


async def create(peer: Peer) -> Peer:
    return await peer.insert()


async def delete(peer: Peer) -> None:
    await peer.delete()
