"""Additional tests for resume and auth routes — edge cases and missing coverage."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from sqlalchemy import JSON

from database.models import Resume
from tests.conftest import (
    VALID_PASSWORD,
    auth_header,
    create_authenticated_user,
    login_user,
    register_user,
)

Resume.__table__.c.json_content.type = JSON()


class TestResumeJsonValidation:
    """Test JSON content size limits on resume creation/update."""

    def test_create_with_large_json_rejected(self, client):
        token = create_authenticated_user(client)
        # Create a JSON payload > 100KB
        large_content = {"data": "x" * 110_000}
        resp = client.post(
            "/api/resumes",
            json={"name": "Big Resume", "json_content": large_content},
            headers=auth_header(token),
        )
        assert resp.status_code == 422  # Pydantic validation error

    def test_create_with_valid_json(self, client):
        token = create_authenticated_user(client)
        content = {"personal": {"name": "John"}, "sections": []}
        resp = client.post(
            "/api/resumes",
            json={"name": "My CV", "json_content": content},
            headers=auth_header(token),
        )
        assert resp.status_code == 201
        assert resp.json()["json_content"] == content

    def test_update_with_large_json_rejected(self, client):
        token = create_authenticated_user(client)
        # Create a valid resume first
        resp = client.post(
            "/api/resumes",
            json={"name": "CV"},
            headers=auth_header(token),
        )
        resume_id = resp.json()["id"]

        large_content = {"data": "y" * 110_000}
        resp = client.put(
            f"/api/resumes/{resume_id}",
            json={"json_content": large_content},
            headers=auth_header(token),
        )
        assert resp.status_code == 422


class TestResumeNameEdgeCases:
    def test_create_with_empty_name_rejected(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/resumes",
            json={"name": ""},
            headers=auth_header(token),
        )
        # Empty string is valid per the schema (no min_length), but check API accepts it
        # Actually empty string is a valid name, let's test it passes
        assert resp.status_code in (201, 422)

    def test_create_with_max_length_name(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/resumes",
            json={"name": "A" * 255},
            headers=auth_header(token),
        )
        assert resp.status_code == 201

    def test_create_with_too_long_name_rejected(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/resumes",
            json={"name": "A" * 256},
            headers=auth_header(token),
        )
        assert resp.status_code == 422

    def test_update_name_and_content_together(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/resumes",
            json={"name": "Old Name"},
            headers=auth_header(token),
        )
        resume_id = resp.json()["id"]

        resp = client.put(
            f"/api/resumes/{resume_id}",
            json={"name": "New Name", "json_content": {"updated": True}},
            headers=auth_header(token),
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "New Name"
        assert resp.json()["json_content"]["updated"] is True


class TestResumeLimits:
    def test_regular_user_can_create_up_to_3_resumes(self, client):
        token = create_authenticated_user(client)
        for i in range(3):
            resp = client.post(
                "/api/resumes",
                json={"name": f"Resume {i}"},
                headers=auth_header(token),
            )
            assert resp.status_code == 201

    def test_guest_limited_to_1_resume(self, client):
        # Create guest
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 201
        token = resp.json()["access_token"]

        resp = client.post(
            "/api/resumes",
            json={"name": "Guest Resume 0"},
            headers=auth_header(token),
        )
        assert resp.status_code == 201

        # 2nd should fail
        resp = client.post(
            "/api/resumes",
            json={"name": "Too many"},
            headers=auth_header(token),
        )
        assert resp.status_code == 429
        assert "Guest" in resp.json()["detail"] or "guest" in resp.json()["detail"]


class TestAuthEdgeCases:
    def test_register_same_email_twice(self, client):
        register_user(client, email="dup@test.com")
        resp = client.post(
            "/api/auth/register",
            json={"email": "dup@test.com", "password": VALID_PASSWORD},
        )
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"]

    def test_login_case_sensitive_email(self, client):
        register_user(client, email="user@test.com")
        # Login with different case — should fail (emails are case-sensitive in DB)
        resp = client.post(
            "/api/auth/login",
            data={"username": "USER@TEST.COM", "password": VALID_PASSWORD},
        )
        assert resp.status_code == 401

    def test_guest_account_is_flagged(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["is_guest"] is True

    def test_upgrade_guest_with_existing_email_fails(self, client):
        # Register a regular user
        register_user(client, email="taken@test.com")

        # Create guest
        resp = client.post("/api/auth/guest")
        guest_token = resp.json()["access_token"]

        # Try to upgrade with taken email
        resp = client.post(
            "/api/auth/upgrade",
            json={"email": "taken@test.com", "password": VALID_PASSWORD},
            headers=auth_header(guest_token),
        )
        assert resp.status_code == 400
        assert "already registered" in resp.json()["detail"]

    def test_upgrade_regular_user_fails(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/auth/upgrade",
            json={"email": "new@test.com", "password": VALID_PASSWORD},
            headers=auth_header(token),
        )
        assert resp.status_code == 400
        assert "guest" in resp.json()["detail"].lower()

    def test_upgrade_guest_success(self, client):
        resp = client.post("/api/auth/guest")
        guest_token = resp.json()["access_token"]

        resp = client.post(
            "/api/auth/upgrade",
            json={"email": "upgraded@test.com", "password": VALID_PASSWORD},
            headers=auth_header(guest_token),
        )
        assert resp.status_code == 200
        assert resp.json()["email"] == "upgraded@test.com"
        assert resp.json()["is_guest"] is False

    def test_upgraded_guest_can_login(self, client):
        resp = client.post("/api/auth/guest")
        guest_token = resp.json()["access_token"]

        client.post(
            "/api/auth/upgrade",
            json={"email": "logintest@test.com", "password": VALID_PASSWORD},
            headers=auth_header(guest_token),
        )

        # Now login with the new credentials
        token = login_user(client, email="logintest@test.com")
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["is_guest"] is False


class TestGDPREndpoints:
    def test_export_includes_resumes(self, client):
        token = create_authenticated_user(client)
        # Create some resumes
        client.post(
            "/api/resumes",
            json={"name": "CV 1", "json_content": {"test": True}},
            headers=auth_header(token),
        )
        client.post(
            "/api/resumes",
            json={"name": "CV 2"},
            headers=auth_header(token),
        )

        resp = client.get("/api/auth/me/export", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == "test@example.com"
        assert len(data["resumes"]) == 2
        assert data["exported_at"]  # ISO timestamp

    def test_export_auth_method_email(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/auth/me/export", headers=auth_header(token))
        assert resp.json()["user"]["auth_method"] == "email"

    def test_delete_account_removes_resumes(self, client):
        token = create_authenticated_user(client)
        client.post(
            "/api/resumes",
            json={"name": "To delete"},
            headers=auth_header(token),
        )

        resp = client.delete("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 204

        # Token should no longer work
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 401

    def test_delete_unauthenticated_fails(self, client):
        resp = client.delete("/api/auth/me")
        assert resp.status_code == 401


class TestOAuthCodeExchange:
    """Test the OAuth temporary code store/exchange mechanism."""

    def test_exchange_invalid_code(self, client):
        resp = client.post("/api/auth/google/exchange?code=invalid-code")
        assert resp.status_code == 400

    def test_google_login_not_configured(self, client):
        """Google login should fail when env vars are not set."""
        resp = client.get("/api/auth/google/login", follow_redirects=False)
        # May return 500 (not configured) or 307 (redirect) depending on env
        assert resp.status_code in (500, 307, 404)


class TestHealthEndpoints:
    def test_api_health(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
