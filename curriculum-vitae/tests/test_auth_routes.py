"""Integration tests for authentication API routes."""

from auth.security import create_access_token
from conftest import (
    VALID_PASSWORD,
    auth_header,
    create_authenticated_user,
    get_cookie_access_token,
    register_user,
)
from database.models import User


class TestRegister:
    def test_register_success(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "new@example.com",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "message" in data

    def test_register_duplicate_email(self, client):
        register_user(client, email="dup@example.com")
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "dup@example.com",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 200
        assert "message" in resp.json()

    def test_register_weak_password_too_short(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "a@b.com",
                "password": "Short1!",
            },
        )
        assert resp.status_code == 422

    def test_register_weak_password_no_special_char(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "a@b.com",
                "password": "NoSpecialChar123",
            },
        )
        assert resp.status_code == 422

    def test_register_invalid_email(self, client):
        resp = client.post(
            "/api/auth/register",
            json={
                "email": "not-an-email",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 422


class TestLogin:
    def test_login_success(self, client):
        register_user(client)
        resp = client.post(
            "/api/auth/login",
            data={
                "username": "test@example.com",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Authenticated session established"
        assert resp.cookies.get("access_token")

    def test_login_wrong_password(self, client):
        register_user(client)
        resp = client.post(
            "/api/auth/login",
            data={
                "username": "test@example.com",
                "password": "WrongPassword123!",
            },
        )
        assert resp.status_code == 401

    def test_login_unknown_email(self, client):
        resp = client.post(
            "/api/auth/login",
            data={
                "username": "nobody@example.com",
                "password": VALID_PASSWORD,
            },
        )
        assert resp.status_code == 401

    def test_login_oauth_only_user_returns_401(self, client, db):
        oauth_user = User(email="oauth-only@example.com", google_id="google-abc", is_verified=True)
        db.add(oauth_user)
        db.commit()

        resp = client.post(
            "/api/auth/login",
            data={
                "username": "oauth-only@example.com",
                "password": "SomePassword123!",
            },
        )
        assert resp.status_code == 401


class TestGuestAccount:
    def test_create_guest(self, client):
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 201
        data = resp.json()
        assert data["message"] == "Guest session established"
        assert resp.cookies.get("access_token")

    def test_guest_can_access_me(self, client):
        client.post("/api/auth/guest")
        token = get_cookie_access_token(client)
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["is_guest"] is True

    def test_upgrade_guest(self, client):
        client.post("/api/auth/guest")
        token = get_cookie_access_token(client)
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
        assert resp.json()["email"] == "upgraded@example.com"
        assert resp.json()["is_guest"] is False
        assert resp.json()["is_verified"] is False

        me = client.get("/api/auth/me", headers=headers)
        assert me.status_code == 200
        assert me.json()["email"] == "upgraded@example.com"
        assert me.json()["is_guest"] is False

    def test_upgrade_non_guest_fails(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/auth/upgrade",
            json={
                "email": "new@example.com",
                "password": VALID_PASSWORD,
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 400

    def test_upgrade_to_existing_email_fails(self, client):
        register_user(client, email="taken@example.com")
        client.post("/api/auth/guest")
        token = get_cookie_access_token(client)
        resp = client.post(
            "/api/auth/upgrade",
            json={
                "email": "taken@example.com",
                "password": VALID_PASSWORD,
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 409


class TestMe:
    def test_get_me(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    def test_get_me_without_token(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401


class TestGDPR:
    def test_export_data(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/auth/me/export", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert "user" in data
        assert "resumes" in data
        assert "feedbacks" in data
        assert "exported_at" in data

    def test_delete_account(self, client):
        token = create_authenticated_user(client)
        resp = client.delete("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 204
        # User should no longer exist
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 401


class TestEmailVerification:
    def test_verify_email_success_with_post_body(self, client, db):
        user = User(email="verify@example.com", password_hash="hash", is_verified=False)
        db.add(user)
        db.commit()
        db.refresh(user)

        token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "type": "email_verification"}
        )
        resp = client.post("/api/auth/verify-email", json={"token": token})
        assert resp.status_code == 200
        assert "verified" in resp.json()["message"].lower()

    def test_verify_email_rejects_invalid_token(self, client):
        resp = client.post("/api/auth/verify-email", json={"token": "invalid"})
        assert resp.status_code == 400
