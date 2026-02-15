"""Tests for Google OAuth routes (mocked external calls)."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from unittest.mock import patch

from sqlalchemy import JSON

from database.models import Resume
from tests.conftest import auth_header, create_authenticated_user

Resume.__table__.c.json_content.type = JSON()


class TestGoogleLogin:
    def test_google_login_not_configured(self, client):
        """When GOOGLE_CLIENT_ID is not set, should return 500."""
        with (
            patch("auth.routes.GOOGLE_CLIENT_ID", ""),
            patch("auth.routes.GOOGLE_REDIRECT_URI", ""),
        ):
            resp = client.get("/api/auth/google/login")
            assert resp.status_code == 500
            assert "not configured" in resp.json()["detail"]

    def test_google_login_redirects(self, client):
        """When configured, should redirect to Google."""
        with (
            patch("auth.routes.GOOGLE_CLIENT_ID", "test-client-id"),
            patch("auth.routes.GOOGLE_REDIRECT_URI", "https://sivee.pro/api/auth/google/callback"),
        ):
            resp = client.get("/api/auth/google/login", follow_redirects=False)
            assert resp.status_code == 307
            assert "accounts.google.com" in resp.headers["location"]
            assert "test-client-id" in resp.headers["location"]


class TestGoogleCallback:
    def test_callback_not_configured(self, client):
        with (
            patch("auth.routes.GOOGLE_CLIENT_ID", ""),
            patch("auth.routes.GOOGLE_CLIENT_SECRET", ""),
            patch("auth.routes.GOOGLE_REDIRECT_URI", ""),
        ):
            resp = client.get("/api/auth/google/callback", params={"code": "test", "state": "test"})
            assert resp.status_code == 500

    def test_callback_invalid_state(self, client):
        with (
            patch("auth.routes.GOOGLE_CLIENT_ID", "id"),
            patch("auth.routes.GOOGLE_CLIENT_SECRET", "secret"),
            patch("auth.routes.GOOGLE_REDIRECT_URI", "https://example.com/cb"),
        ):
            resp = client.get(
                "/api/auth/google/callback", params={"code": "test", "state": "invalid-jwt"}
            )
            assert resp.status_code == 400
            assert "state token" in resp.json()["detail"]


class TestOAuthCodeExchange:
    def test_exchange_invalid_code(self, client):
        resp = client.post("/api/auth/google/exchange", params={"code": "nonexistent"})
        assert resp.status_code == 400
        assert "Invalid" in resp.json()["detail"]

    def test_exchange_valid_code(self, client):
        """Store a code and exchange it."""
        from auth.routes import _store_oauth_code

        code = _store_oauth_code("test-jwt-token-here")

        resp = client.post("/api/auth/google/exchange", params={"code": code})
        assert resp.status_code == 200
        assert resp.json()["access_token"] == "test-jwt-token-here"

    def test_exchange_code_consumed(self, client):
        """Code can only be used once."""
        from auth.routes import _store_oauth_code

        code = _store_oauth_code("test-jwt")

        # First exchange succeeds
        resp = client.post("/api/auth/google/exchange", params={"code": code})
        assert resp.status_code == 200

        # Second exchange fails
        resp = client.post("/api/auth/google/exchange", params={"code": code})
        assert resp.status_code == 400

    def test_exchange_expired_code(self, client):
        """Expired codes should fail."""
        import time

        from auth.routes import _oauth_code_store

        code = "test-expired-code"
        _oauth_code_store[code] = ("jwt-token", time.time() - 1)  # Already expired

        resp = client.post("/api/auth/google/exchange", params={"code": code})
        assert resp.status_code == 400


class TestDeleteAccountWithS3:
    """Test account deletion including S3 cleanup."""

    def test_delete_account_no_resumes(self, client):
        token = create_authenticated_user(client)
        resp = client.delete("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 204

        # Verify user is gone
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 401

    def test_delete_account_with_resumes(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)

        # Create some resumes
        client.post("/api/resumes", json={"name": "CV 1"}, headers=headers)
        client.post("/api/resumes", json={"name": "CV 2"}, headers=headers)

        # Delete account
        resp = client.delete("/api/auth/me", headers=headers)
        assert resp.status_code == 204

    def test_delete_account_s3_failure_ignored(self, client, db):
        """S3 deletion failures should not prevent account deletion."""
        token = create_authenticated_user(client)
        headers = auth_header(token)

        # Create a resume
        resp = client.post("/api/resumes", json={"name": "CV"}, headers=headers)
        resume_id = resp.json()["id"]

        # Manually set an S3 URL on the resume
        resume = db.get(Resume, resume_id)
        resume.s3_url = "https://bucket.s3.region.amazonaws.com/test/file.pdf"
        db.commit()

        # Delete should succeed even if S3 fails (StorageManager not configured in test)
        resp = client.delete("/api/auth/me", headers=headers)
        assert resp.status_code == 204
