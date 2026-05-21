"""WireGuard peer lifecycle (used by the network API).

Keys are generated locally (``wg_keys``), an IP is allocated from the VPN pool
(``ipam_service``), and the peer is registered with the privileged gateway
(``wg_gateway_client``). Client config text and QR codes are built here.
"""

from __future__ import annotations

import io
from typing import Any

import qrcode

from app.core.config import settings
from app.core.exceptions import ConflictError, NotFoundError
from app.core.logging import get_logger
from app.models.peer import DeviceType, Peer
from app.models.user import User
from app.repositories import peer_repo
from app.services import ipam_service, wg_gateway_client, wg_keys

log = get_logger("peer")


async def create_peer(user: User, device_name: str, device_type: DeviceType) -> Peer:
    if device_type == DeviceType.USER:
        count = await peer_repo.count_for_user(str(user.id), DeviceType.USER)
        if count >= settings.max_client_peers:
            raise ConflictError(f"Maximum of {settings.max_client_peers} devices reached")

    keypair = wg_keys.generate_keypair()
    psk = wg_keys.generate_preshared_key()
    ip = await ipam_service.allocate_vpn_ip()

    try:
        await wg_gateway_client.add_peer(keypair.public_key, ip, psk)
    except Exception:
        await ipam_service.release_vpn_ip(ip)  # don't leak the address
        raise

    peer = Peer(
        user_id=str(user.id),
        device_name=device_name,
        device_type=device_type,
        public_key=keypair.public_key,
        private_key=keypair.private_key,
        preshared_key=psk,
        address=ip,
    )
    peer = await peer_repo.create(peer)
    log.info("peer.created", peer_id=str(peer.id), address=ip)
    return peer


async def list_peers_with_stats(user: User) -> list[dict[str, Any]]:
    peers = await peer_repo.list_for_user(str(user.id))
    try:
        stats = await wg_gateway_client.list_peer_stats()
    except Exception:
        stats = {}  # degrade gracefully if the gateway is unreachable
    result = []
    for peer in peers:
        stat = stats.get(peer.public_key, {})
        result.append(
            {
                "id": str(peer.id),
                "device_name": peer.device_name,
                "device_type": peer.device_type,
                "address": peer.address,
                "public_key": peer.public_key,
                "latest_handshake": stat.get("latest_handshake", 0),
                "rx_bytes": stat.get("rx_bytes", 0),
                "tx_bytes": stat.get("tx_bytes", 0),
                "endpoint": stat.get("endpoint"),
                "created_at": peer.created_at,
            }
        )
    return result


async def build_config(user: User, peer_id: str) -> str:
    peer = await _require_peer(user, peer_id)
    server = await wg_gateway_client.get_server_info()
    allowed = ", ".join(settings.wg_client_allowed_ips)
    return (
        "[Interface]\n"
        f"PrivateKey = {peer.private_key}\n"
        f"Address = {peer.address}/32\n\n"
        "[Peer]\n"
        f"PublicKey = {server['public_key']}\n"
        f"PresharedKey = {peer.preshared_key}\n"
        f"Endpoint = {server['endpoint']}\n"
        f"AllowedIPs = {allowed}\n"
        "PersistentKeepalive = 25\n"
    )


async def build_qr_png(user: User, peer_id: str) -> bytes:
    config = await build_config(user, peer_id)
    img = qrcode.make(config)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


async def delete_peer(user: User, peer_id: str) -> None:
    peer = await _require_peer(user, peer_id)
    await wg_gateway_client.remove_peer(peer.public_key)
    await ipam_service.release_vpn_ip(peer.address)
    await peer_repo.delete(peer)
    log.info("peer.deleted", peer_id=peer_id)


async def _require_peer(user: User, peer_id: str) -> Peer:
    peer = await peer_repo.get_for_user(peer_id, str(user.id))
    if peer is None:
        raise NotFoundError("Peer not found")
    return peer
