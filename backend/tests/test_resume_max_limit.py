"""Tests for resume creation and download limits (guest / email / premium tiers)."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from datetime import UTC, datetime

from sqlalchemy import JSON

from database.models import Resume, User
from tests.conftest import auth_header, create_authenticated_user

Resume.__table__.c.json_content.type = JSON()

SAMPLE_JSON_CONTENT = {
    "personal": {"name": "Test User", "title": "Developer"},
    "sections": [],
}


def _make_premium(client, db, token):
    """Set a user as premium directly in the database."""
    from auth.security import decode_access_token

    payload = decode_access_token(token)
    user_id = int(payload["sub"])
    user = db.query(User).filter(User.id == user_id).first()
    user.is_premium = True
    db.commit()
    return user


class TestGuestResumeLimit:
    """Guest accounts are limited to 1 resume."""

    def test_guest_can_create_up_to_limit(self, client):
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 201
        token = resp.json()["access_token"]
        headers = auth_header(token)

        resp = client.post("/api/resumes", json={"name": "CV 0"}, headers=headers)
        assert resp.status_code == 201

    def test_guest_blocked_at_limit(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        headers = auth_header(token)

        client.post("/api/resumes", json={"name": "CV 0"}, headers=headers)

        # 2nd should fail
        resp = client.post("/api/resumes", json={"name": "CV 1"}, headers=headers)
        assert resp.status_code == 429
        assert "Guest" in resp.json()["detail"]

    def test_guest_can_create_after_deleting(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        headers = auth_header(token)

        resp = client.post("/api/resumes", json={"name": "CV 0"}, headers=headers)
        resume_id = resp.json()["id"]

        resp = client.delete(f"/api/resumes/{resume_id}", headers=headers)
        assert resp.status_code == 204

        resp = client.post("/api/resumes", json={"name": "New CV"}, headers=headers)
        assert resp.status_code == 201


class TestRegularUserResumeLimit:
    """Regular (email) users are limited to 3 resumes."""

    def test_regular_user_can_create_up_to_limit(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)

        for i in range(3):
            resp = client.post("/api/resumes", json={"name": f"CV {i}"}, headers=headers)
            assert resp.status_code == 201, f"Failed on resume {i}: {resp.text}"

    def test_regular_user_429_at_limit(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)

        for i in range(3):
            resp = client.post("/api/resumes", json={"name": f"CV {i}"}, headers=headers)
            assert resp.status_code == 201, f"Failed on resume {i}: {resp.text}"

        # 4th should fail
        resp = client.post("/api/resumes", json={"name": "CV 4"}, headers=headers)
        assert resp.status_code == 429
        assert "Maximum" in resp.json()["detail"]
        assert "Premium" in resp.json()["detail"]


class TestPremiumUserResumeLimit:
    """Premium users are limited to 100 resumes."""

    def test_premium_can_create_more_than_regular(self, client, db):
        token = create_authenticated_user(client)
        headers = auth_header(token)
        _make_premium(client, db, token)

        # Premium user should be able to create more than 3
        for i in range(5):
            resp = client.post("/api/resumes", json={"name": f"CV {i}"}, headers=headers)
            assert resp.status_code == 201, f"Failed on resume {i}: {resp.text}"


class TestDownloadLimits:
    """Download (PDF generation) limits per tier per month."""

    def _create_resume_with_content(self, client, headers):
        """Helper to create a resume with valid content for PDF generation."""
        resp = client.post(
            "/api/resumes",
            json={"name": "Test CV", "json_content": SAMPLE_JSON_CONTENT},
            headers=headers,
        )
        assert resp.status_code == 201
        return resp.json()["id"]

    def test_guest_download_limit(self, client, db):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        headers = auth_header(token)

        resume_id = self._create_resume_with_content(client, headers)

        # First download should work (mocked — we test the limit check, not LaTeX)
        # We directly manipulate the download counter to test the limit
        from auth.security import decode_access_token

        payload = decode_access_token(token)
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        user.download_count = 1
        user.download_count_reset_at = datetime.now(UTC)
        db.commit()

        # Should be blocked
        resp = client.post(f"/api/resumes/{resume_id}/generate", headers=headers)
        assert resp.status_code == 429
        assert "Guest" in resp.json()["detail"]

    def test_regular_user_download_limit(self, client, db):
        token = create_authenticated_user(client)
        headers = auth_header(token)

        resume_id = self._create_resume_with_content(client, headers)

        from auth.security import decode_access_token

        payload = decode_access_token(token)
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        user.download_count = 3
        user.download_count_reset_at = datetime.now(UTC)
        db.commit()

        resp = client.post(f"/api/resumes/{resume_id}/generate", headers=headers)
        assert resp.status_code == 429
        assert "Premium" in resp.json()["detail"]

    def test_premium_user_higher_download_limit(self, client, db):
        token = create_authenticated_user(client)
        headers = auth_header(token)
        _make_premium(client, db, token)

        resume_id = self._create_resume_with_content(client, headers)

        from auth.security import decode_access_token

        payload = decode_access_token(token)
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        # Premium with 3 downloads should still be allowed (limit is 1000)
        user.download_count = 3
        user.download_count_reset_at = datetime.now(UTC)
        db.commit()

        # This will fail at LaTeX compilation (no TexLive in test), but should NOT
        # fail with 429, proving the limit check passed
        resp = client.post(f"/api/resumes/{resume_id}/generate", headers=headers)
        assert resp.status_code != 429

    def test_monthly_counter_reset(self, client, db):
        """Download counter resets when a new month begins."""
        token = create_authenticated_user(client)
        headers = auth_header(token)

        resume_id = self._create_resume_with_content(client, headers)

        from auth.security import decode_access_token

        payload = decode_access_token(token)
        user = db.query(User).filter(User.id == int(payload["sub"])).first()
        # Set counter to limit, but from a previous month
        user.download_count = 3
        user.download_count_reset_at = datetime(2025, 1, 15, tzinfo=UTC)
        db.commit()

        # Should NOT be blocked because the counter should reset (new month)
        # Will fail at LaTeX compilation, but NOT with 429
        resp = client.post(f"/api/resumes/{resume_id}/generate", headers=headers)
        assert resp.status_code != 429
