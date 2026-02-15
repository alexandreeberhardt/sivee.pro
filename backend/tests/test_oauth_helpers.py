"""Tests for OAuth helper functions in auth/routes.py."""

import os
import time

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")


from auth.routes import (
    _cleanup_expired_codes,
    _exchange_oauth_code,
    _oauth_code_store,
    _store_oauth_code,
)


class TestOAuthCodeStore:
    """Detailed tests for the OAuth temporary code exchange mechanism."""

    def setup_method(self):
        """Clear the store before each test."""
        _oauth_code_store.clear()

    def test_store_returns_unique_codes(self):
        code1 = _store_oauth_code("token1")
        code2 = _store_oauth_code("token2")
        assert code1 != code2

    def test_store_and_retrieve(self):
        code = _store_oauth_code("my-jwt-token")
        token = _exchange_oauth_code(code)
        assert token == "my-jwt-token"

    def test_code_is_one_time_use(self):
        code = _store_oauth_code("jwt-abc")
        _exchange_oauth_code(code)
        # Second exchange should fail
        assert _exchange_oauth_code(code) is None

    def test_invalid_code_returns_none(self):
        assert _exchange_oauth_code("nonexistent") is None

    def test_expired_code_returns_none(self):
        """Simulate an expired code."""
        code = "test-expired-code"
        _oauth_code_store[code] = ("jwt-token", time.time() - 10)
        assert _exchange_oauth_code(code) is None

    def test_cleanup_removes_expired(self):
        _oauth_code_store["expired1"] = ("token1", time.time() - 100)
        _oauth_code_store["expired2"] = ("token2", time.time() - 50)
        _oauth_code_store["valid"] = ("token3", time.time() + 100)

        _cleanup_expired_codes()

        assert "expired1" not in _oauth_code_store
        assert "expired2" not in _oauth_code_store
        assert "valid" in _oauth_code_store

    def test_multiple_codes_independent(self):
        code1 = _store_oauth_code("token-a")
        code2 = _store_oauth_code("token-b")

        assert _exchange_oauth_code(code1) == "token-a"
        assert _exchange_oauth_code(code2) == "token-b"

    def test_store_triggers_cleanup(self):
        """_store_oauth_code calls _cleanup_expired_codes internally."""
        _oauth_code_store["old"] = ("token", time.time() - 200)

        _store_oauth_code("new-token")

        assert "old" not in _oauth_code_store


class TestExtractS3Key:
    """Additional tests for _extract_s3_key_from_url."""

    def test_standard_s3_url(self):
        from auth.routes import _extract_s3_key_from_url

        url = "https://mybucket.s3.eu-west-3.amazonaws.com/users/1/resume.pdf"
        assert _extract_s3_key_from_url(url) == "users/1/resume.pdf"

    def test_nested_path(self):
        from auth.routes import _extract_s3_key_from_url

        url = "https://bucket.s3.amazonaws.com/a/b/c/d.pdf"
        assert _extract_s3_key_from_url(url) == "a/b/c/d.pdf"

    def test_url_with_special_characters(self):
        from auth.routes import _extract_s3_key_from_url

        url = "https://bucket.s3.amazonaws.com/resumes/my%20resume.pdf"
        key = _extract_s3_key_from_url(url)
        assert key is not None
        assert "resume" in key
