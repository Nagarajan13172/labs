"""WireGuard key generation tests."""

from __future__ import annotations

import base64

from app.services import wg_keys


def test_generated_keypair_is_valid_wireguard_format() -> None:
    kp = wg_keys.generate_keypair()
    assert wg_keys.is_valid_key(kp.private_key)
    assert wg_keys.is_valid_key(kp.public_key)
    # 32 raw bytes each
    assert len(base64.b64decode(kp.private_key)) == 32
    assert len(base64.b64decode(kp.public_key)) == 32
    assert kp.private_key != kp.public_key


def test_keypairs_are_unique() -> None:
    keys = {wg_keys.generate_keypair().public_key for _ in range(50)}
    assert len(keys) == 50


def test_preshared_key_is_valid() -> None:
    psk = wg_keys.generate_preshared_key()
    assert wg_keys.is_valid_key(psk)


def test_invalid_keys_rejected() -> None:
    assert not wg_keys.is_valid_key("not-a-key")
    assert not wg_keys.is_valid_key("")
    assert not wg_keys.is_valid_key("AAAA")  # too short
