"""Tests for auth/security.py — password hashing and JWT management."""

import os
import time
from datetime import timedelta

import pytest

# Ensure JWT secret is set before importing
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from auth.security import (
    _get_secret_key,
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)

# === Password hashing ===


class TestPasswordHashing:
    def test_hash_password_returns_bcrypt_string(self):
        h = get_password_hash("MyP@ssw0rd!")
        assert h.startswith("$2b$") or h.startswith("$2a$")

    def test_hash_is_different_each_time(self):
        h1 = get_password_hash("SamePassword1!")
        h2 = get_password_hash("SamePassword1!")
        assert h1 != h2  # bcrypt uses random salt

    def test_verify_correct_password(self):
        h = get_password_hash("CorrectHorse!")
        assert verify_password("CorrectHorse!", h) is True

    def test_verify_wrong_password(self):
        h = get_password_hash("CorrectHorse!")
        assert verify_password("WrongHorse!", h) is False

    def test_verify_empty_password(self):
        h = get_password_hash("")
        assert verify_password("", h) is True
        assert verify_password("not-empty", h) is False

    def test_verify_unicode_password(self):
        pwd = "Mot_de_passe_@vec_accents_eaiu!"
        h = get_password_hash(pwd)
        assert verify_password(pwd, h) is True

    def test_verify_long_password(self):
        pwd = "A" * 72 + "!1a"  # bcrypt truncates at 72 bytes
        h = get_password_hash(pwd)
        assert verify_password(pwd, h) is True


# === JWT secret key ===


class TestGetSecretKey:
    def test_returns_key_when_set(self):
        key = _get_secret_key()
        assert key == "test-secret-key-for-unit-tests-only"

    def test_raises_when_empty(self, monkeypatch):
        monkeypatch.setenv("JWT_SECRET_KEY", "")
        with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
            _get_secret_key()

    def test_raises_when_missing(self, monkeypatch):
        monkeypatch.delenv("JWT_SECRET_KEY", raising=False)
        with pytest.raises(ValueError, match="JWT_SECRET_KEY"):
            _get_secret_key()


# === JWT creation and decoding ===


class TestJWT:
    def test_create_and_decode_token(self):
        token = create_access_token(data={"sub": "42", "email": "a@b.com"})
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "42"
        assert payload["email"] == "a@b.com"
        assert "exp" in payload

    def test_token_with_custom_expiry(self):
        token = create_access_token(
            data={"sub": "1"},
            expires_delta=timedelta(hours=2),
        )
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["sub"] == "1"

    def test_expired_token_returns_none(self):
        token = create_access_token(
            data={"sub": "1"},
            expires_delta=timedelta(seconds=-1),
        )
        payload = decode_access_token(token)
        assert payload is None

    def test_invalid_token_returns_none(self):
        assert decode_access_token("not-a-valid-jwt") is None

    def test_tampered_token_returns_none(self):
        token = create_access_token(data={"sub": "1"})
        # Tamper with the token payload
        parts = token.split(".")
        parts[1] = parts[1][:-3] + "abc"
        tampered = ".".join(parts)
        assert decode_access_token(tampered) is None

    def test_token_with_wrong_secret_returns_none(self, monkeypatch):
        token = create_access_token(data={"sub": "1"})
        monkeypatch.setenv("JWT_SECRET_KEY", "different-secret-key")
        assert decode_access_token(token) is None

    def test_empty_payload(self):
        token = create_access_token(data={})
        payload = decode_access_token(token)
        assert payload is not None
        assert "exp" in payload

    def test_token_preserves_extra_claims(self):
        token = create_access_token(data={"sub": "1", "is_guest": True, "role": "admin"})
        payload = decode_access_token(token)
        assert payload["is_guest"] is True
        assert payload["role"] == "admin"

    def test_default_expiry_is_set(self):
        token = create_access_token(data={"sub": "1"})
        payload = decode_access_token(token)
        assert payload is not None
        # exp should be in the future
        assert payload["exp"] > time.time()
