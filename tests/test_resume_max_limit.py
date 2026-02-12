"""Tests for resume creation limits (guest vs regular user)."""
import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from sqlalchemy import JSON
from database.models import Resume
from tests.conftest import create_authenticated_user, auth_header, VALID_PASSWORD

Resume.__table__.c.json_content.type = JSON()


class TestGuestResumeLimit:
    """Guest accounts are limited to 3 resumes."""

    def test_guest_can_create_up_to_limit(self, client):
        # Create guest account
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 201
        token = resp.json()["access_token"]
        headers = auth_header(token)

        # Create 3 resumes (the limit)
        for i in range(3):
            resp = client.post("/api/resumes", json={"name": f"CV {i}"}, headers=headers)
            assert resp.status_code == 201, f"Failed on resume {i}: {resp.text}"

    def test_guest_blocked_at_limit(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        headers = auth_header(token)

        # Create 3 resumes
        for i in range(3):
            client.post("/api/resumes", json={"name": f"CV {i}"}, headers=headers)

        # 4th should fail
        resp = client.post("/api/resumes", json={"name": "CV 4"}, headers=headers)
        assert resp.status_code == 429
        assert "Guest" in resp.json()["detail"]

    def test_guest_can_create_after_deleting(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        headers = auth_header(token)

        # Create 3 resumes
        ids = []
        for i in range(3):
            resp = client.post("/api/resumes", json={"name": f"CV {i}"}, headers=headers)
            ids.append(resp.json()["id"])

        # Delete one
        resp = client.delete(f"/api/resumes/{ids[0]}", headers=headers)
        assert resp.status_code == 204

        # Now we can create one more
        resp = client.post("/api/resumes", json={"name": "New CV"}, headers=headers)
        assert resp.status_code == 201


class TestRegularUserResumeLimit:
    """Regular users are limited to 50 resumes."""

    def test_regular_user_429_at_limit(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)

        # Create 50 resumes
        for i in range(50):
            resp = client.post("/api/resumes", json={"name": f"CV {i}"}, headers=headers)
            assert resp.status_code == 201, f"Failed on resume {i}: {resp.text}"

        # 51st should fail
        resp = client.post("/api/resumes", json={"name": "CV 51"}, headers=headers)
        assert resp.status_code == 429
        assert "Maximum" in resp.json()["detail"]
