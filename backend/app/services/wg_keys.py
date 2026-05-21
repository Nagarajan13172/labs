"""Pure-Python WireGuard key generation.

WireGuard keys are Curve25519 (X25519) keypairs encoded as base64 of 32 raw
bytes; the preshared key is base64 of 32 random bytes. Generating them in
Python (via ``cryptography``) means the unprivileged API never has to shell out
to the ``wg`` binary — that lives only in the privileged gateway.
"""

from __future__ import annotations

import base64
import binascii
import os
import re

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.x25519 import X25519PrivateKey

# A WireGuard key is base64 of 32 bytes -> 44 chars ending in '='.
WG_KEY_RE = re.compile(r"^[A-Za-z0-9+/]{43}=$")


class WireGuardKeyPair:
    def __init__(self, private_key: str, public_key: str) -> None:
        self.private_key = private_key
        self.public_key = public_key


def generate_keypair() -> WireGuardKeyPair:
    private = X25519PrivateKey.generate()
    priv_raw = private.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption(),
    )
    pub_raw = private.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw,
    )
    return WireGuardKeyPair(
        private_key=base64.b64encode(priv_raw).decode("ascii"),
        public_key=base64.b64encode(pub_raw).decode("ascii"),
    )


def generate_preshared_key() -> str:
    return base64.b64encode(os.urandom(32)).decode("ascii")


def is_valid_key(key: str) -> bool:
    """Validate a base64-encoded 32-byte WireGuard key."""
    if not WG_KEY_RE.match(key):
        return False
    try:
        return len(base64.b64decode(key, validate=True)) == 32
    except (ValueError, binascii.Error):
        return False
