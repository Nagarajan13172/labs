"""WireGuard gateway — a minimal, token-authenticated control plane.

This is the only privileged component (NET_ADMIN, owns the WG interface). It
exposes a deliberately tiny surface: add/remove/list peers and report server
info. The main API talks to it over the internal network with a shared token;
it never runs ``wg`` or holds elevated privileges itself.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, status

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.gateway import wg
from app.gateway.schemas import PeerIn, PeerStat, ServerInfo

log = get_logger("gateway")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    configure_logging()
    wg.ensure_interface()
    log.info("gateway.ready")
    yield


def require_token(x_gateway_token: str = Header(default="")) -> None:
    if x_gateway_token != settings.gateway_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid gateway token"
        )


app = FastAPI(title="WireGuard Gateway", version="0.1.0", lifespan=lifespan)
_auth = [Depends(require_token)]


@app.get("/healthz")
def healthz() -> dict:
    return {"status": "ok"}


@app.get("/server", dependencies=_auth, response_model=ServerInfo)
def get_server() -> ServerInfo:
    return ServerInfo(**wg.server_info())


@app.get("/peers", dependencies=_auth, response_model=list[PeerStat])
def list_peers() -> list[PeerStat]:
    return [PeerStat(**p) for p in wg.list_peers()]


@app.post("/peers", dependencies=_auth, status_code=status.HTTP_201_CREATED)
def add_peer(peer: PeerIn) -> dict:
    try:
        wg.add_peer(peer.public_key, peer.allowed_ip, peer.preshared_key)
    except wg.WgError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "added"}


@app.delete("/peers", dependencies=_auth)
def remove_peer(public_key: str) -> dict:
    # public_key is a query param (base64 contains '/' and '=', unsafe in a path).
    try:
        wg.remove_peer(public_key)
    except wg.WgError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"status": "removed"}
