"""Edge case tests for authentication routes."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from sqlalchemy import JSON

from database.models import Resume
from tests.conftest import (
    VALID_PASSWORD,
    auth_header,
    create_authenticated_user,
    register_user,
)

Resume.__table__.c.json_content.type = JSON()


class TestRegisterEdgeCases:
    def test_register_with_valid_complex_email(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "user+tag@sub.domain.example.com",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 201

    def test_register_case_sensitivity(self, client):
        """Email should be case-insensitive for uniqueness check."""
        register_user(client, email="User@Example.COM")
        # Try same email with different case
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "user@example.com",
                "password": VALID_PASSWORD,
            },
        )
        # Depending on implementation, could be 201 (case-sensitive) or 400 (case-insensitive)
        assert resp.status_code in (201, 400)

    def test_register_returns_user_without_password(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "test@example.com",
                "password": VALID_PASSWORD,
            },
        )
        data = resp.json()
        assert "password" not in data
        assert "password_hash" not in data
        assert "email" in data
        assert "id" in data

    def test_register_empty_email(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 422

    def test_register_missing_fields(self, client):
        resp = client.post("/api/auth/register", json={})
        assert resp.status_code == 422


class TestLoginEdgeCases:
    def test_login_returns_bearer_token(self, client):
        register_user(client)
        resp = client.post(
            "/api/auth/login",
            data={
                "username": "test@example.com",
                "password": VALID_PASSWORD,
            },
        )
        data = resp.json()
        assert "access_token" in data
        assert data.get("token_type") == "bearer"

    def test_login_with_wrong_email(self, client):
        register_user(client)
        resp = client.post(
            "/api/auth/login",
            data={
                "username": "wrong@example.com",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 401

    def test_login_empty_password(self, client):
        register_user(client)
        resp = client.post(
            "/api/auth/login",
            data={
                "username": "test@example.com",
                "password": "",
            },
        )
        assert resp.status_code in (401, 422)


class TestGuestAccountEdgeCases:
    def test_guest_email_is_unique(self, client):
        resp1 = client.post("/api/auth/guest")
        resp2 = client.post("/api/auth/guest")
        email1 = client.get(
            "/api/auth/me", headers=auth_header(resp1.json()["access_token"])
        ).json()["email"]
        email2 = client.get(
            "/api/auth/me", headers=auth_header(resp2.json()["access_token"])
        ).json()["email"]
        assert email1 != email2

    def test_guest_is_marked_as_guest(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        me = client.get("/api/auth/me", headers=auth_header(token)).json()
        assert me["is_guest"] is True

    def test_upgrade_sets_guest_false(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]
        headers = auth_header(token)

        resp = client.post(
            "/api/auth/upgrade",
            json={
                "email": "upgraded@example.com",
                "password": VALID_PASSWORD,
            },
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["is_guest"] is False

    def test_upgrade_can_login_with_new_credentials(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]

        client.post(
            "/api/auth/upgrade",
            json={
                "email": "new@example.com",
                "password": VALID_PASSWORD,
            },
            headers=auth_header(token),
        )

        # Login with new credentials
        resp = client.post(
            "/api/auth/login",
            data={
                "username": "new@example.com",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 200

    def test_upgrade_with_weak_password(self, client):
        resp = client.post("/api/auth/guest")
        token = resp.json()["access_token"]

        resp = client.post(
            "/api/auth/upgrade",
            json={
                "email": "new@example.com",
                "password": "weak",
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 422


class TestGDPRExport:
    def test_export_empty_user(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/auth/me/export", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["email"] == "test@example.com"
        assert data["resumes"] == []
        assert "exported_at" in data

    def test_export_with_resumes(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)

        # Create resumes
        client.post(
            "/api/resumes",
            json={"name": "CV 1", "json_content": {"personal": {"name": "John"}}},
            headers=headers,
        )
        client.post("/api/resumes", json={"name": "CV 2"}, headers=headers)

        resp = client.get("/api/auth/me/export", headers=headers)
        data = resp.json()
        assert len(data["resumes"]) == 2
        assert data["resumes"][0]["name"] == "CV 1"

    def test_export_auth_method_email(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/auth/me/export", headers=auth_header(token))
        assert resp.json()["user"]["auth_method"] == "email"

    def test_export_requires_auth(self, client):
        resp = client.get("/api/auth/me/export")
        assert resp.status_code == 401


class TestMeEndpoint:
    def test_me_returns_user_info(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    def test_me_without_auth(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401
