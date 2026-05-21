"""WireGuard interface operations for the privileged gateway.

Every shell-out uses an argument list (never a shell string), and all external
input (public keys, IPs) is validated before use — so there is no command
injection surface and no root password anywhere. This is the only component
that touches the ``wg`` binary or holds NET_ADMIN.
"""

from __future__ import annotations

import ipaddress
import os
import subprocess
import tempfile

from app.core.config import settings
from app.core.logging import get_logger
from app.services import wg_keys

log = get_logger("gateway.wg")

IFACE = settings.wg_interface
CONF_PATH = os.path.join(settings.wg_config_dir, f"{IFACE}.conf")


class WgError(Exception):
    """A validation or operational failure in a gateway WG operation."""


def _run(args: list[str], *, input_text: str | None = None) -> str:
    result = subprocess.run(args, capture_output=True, text=True, input=input_text)
    if result.returncode != 0:
        raise WgError(f"{' '.join(args[:2])} failed: {result.stderr.strip()}")
    return result.stdout


def _server_address() -> str:
    net = ipaddress.ip_network(settings.vpn_subnet, strict=False)
    return f"{net[1]}/{net.prefixlen}"  # e.g. 10.8.0.1/24


def validate_public_key(public_key: str) -> None:
    if not wg_keys.is_valid_key(public_key):
        raise WgError("invalid WireGuard public key")


def validate_allowed_ip(ip: str) -> None:
    net = ipaddress.ip_network(settings.vpn_subnet, strict=False)
    try:
        if ipaddress.ip_address(ip) not in net:
            raise WgError("allowed IP outside the VPN subnet")
    except ValueError as exc:
        raise WgError("invalid allowed IP") from exc


# --- interface lifecycle ---
def _is_up() -> bool:
    return subprocess.run(["wg", "show", IFACE], capture_output=True, text=True).returncode == 0


def ensure_interface() -> None:
    os.makedirs(settings.wg_config_dir, exist_ok=True)
    if not os.path.exists(CONF_PATH):
        kp = wg_keys.generate_keypair()
        conf = (
            "[Interface]\n"
            f"Address = {_server_address()}\n"
            f"ListenPort = {settings.wg_listen_port}\n"
            f"PrivateKey = {kp.private_key}\n"
        )
        _write_conf(conf)
        log.info("gateway.server_key_generated")
    if not _is_up():
        _run(["wg-quick", "up", IFACE])
        _setup_nat()
        log.info("gateway.interface_up", iface=IFACE)


def _write_conf(text: str) -> None:
    fd = os.open(CONF_PATH, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(text)


def _default_iface() -> str:
    out = subprocess.run(
        ["ip", "route", "show", "default"], capture_output=True, text=True
    ).stdout.split()
    return out[out.index("dev") + 1] if "dev" in out else "eth0"


def _iptables_ensure(rule: list[str], table: str | None = None) -> None:
    """Add an iptables rule only if it isn't already present (idempotent)."""
    prefix = ["iptables", *(["-t", table] if table else [])]
    check = subprocess.run([*prefix, "-C", *rule], capture_output=True)
    if check.returncode != 0:
        subprocess.run([*prefix, "-A", *rule], check=False)


def _setup_nat() -> None:
    subprocess.run(["sysctl", "-w", "net.ipv4.ip_forward=1"], check=False)
    dev = _default_iface()
    _iptables_ensure(["FORWARD", "-i", IFACE, "-j", "ACCEPT"])
    _iptables_ensure(["FORWARD", "-o", IFACE, "-j", "ACCEPT"])
    _iptables_ensure(["POSTROUTING", "-o", dev, "-j", "MASQUERADE"], table="nat")


def _persist() -> None:
    """Save the running interface state back to the config file."""
    _run(["wg-quick", "save", IFACE])


# --- peer operations ---
def add_peer(public_key: str, allowed_ip: str, preshared_key: str | None = None) -> None:
    validate_public_key(public_key)
    validate_allowed_ip(allowed_ip)
    args = ["wg", "set", IFACE, "peer", public_key, "allowed-ips", f"{allowed_ip}/32"]
    if preshared_key:
        if not wg_keys.is_valid_key(preshared_key):
            raise WgError("invalid preshared key")
        with tempfile.NamedTemporaryFile("w", delete=False) as tmp:
            tmp.write(preshared_key)
            psk_path = tmp.name
        try:
            os.chmod(psk_path, 0o600)
            _run([*args, "preshared-key", psk_path])
        finally:
            os.unlink(psk_path)
    else:
        _run(args)
    _persist()
    log.info("gateway.peer_added", public_key=public_key, allowed_ip=allowed_ip)


def remove_peer(public_key: str) -> None:
    validate_public_key(public_key)
    _run(["wg", "set", IFACE, "peer", public_key, "remove"])
    _persist()
    log.info("gateway.peer_removed", public_key=public_key)


def list_peers() -> list[dict]:
    """Parse ``wg show <iface> dump`` into structured peer stats."""
    out = _run(["wg", "show", IFACE, "dump"])
    lines = out.strip().splitlines()
    peers: list[dict] = []
    for line in lines[1:]:  # first line is the interface itself
        f = line.split("\t")
        if len(f) < 8:
            continue
        peers.append(
            {
                "public_key": f[0],
                "endpoint": None if f[2] == "(none)" else f[2],
                "allowed_ips": f[3],
                "latest_handshake": int(f[4]),
                "rx_bytes": int(f[5]),
                "tx_bytes": int(f[6]),
            }
        )
    return peers


def server_info() -> dict:
    public_key = _run(["wg", "show", IFACE, "public-key"]).strip()
    return {
        "public_key": public_key,
        "endpoint": settings.wg_server_endpoint,
        "listen_port": settings.wg_listen_port,
        "address": _server_address(),
    }
