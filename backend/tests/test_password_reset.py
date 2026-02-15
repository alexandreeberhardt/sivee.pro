"""Integration tests for password reset endpoints (forgot-password & reset-password)."""

from unittest.mock import patch

from conftest import VALID_PASSWORD, register_user

NEW_PASSWORD = "NewSecure456!@#"


class TestForgotPassword:
    """Tests for POST /api/auth/forgot-password."""

    def test_forgot_password_existing_user(self, client):
        """Returns generic message and triggers email for existing user."""
        register_user(client, email="user@example.com")
        with patch("auth.routes.send_password_reset_email") as mock_send:
            resp = client.post(
                "/api/auth/forgot-password",
                json={"email": "user@example.com"},
            )
        assert resp.status_code == 200
        assert "reset link" in resp.json()["message"].lower()
        mock_send.assert_called_once()
        args = mock_send.call_args[0]
        assert args[0] == "user@example.com"
        assert len(args[1]) > 0  # token is non-empty

    def test_forgot_password_nonexistent_email(self, client):
        """Returns same generic message for unknown email (no info leak)."""
        with patch("auth.routes.send_password_reset_email") as mock_send:
            resp = client.post(
                "/api/auth/forgot-password",
                json={"email": "nobody@example.com"},
            )
        assert resp.status_code == 200
        assert "reset link" in resp.json()["message"].lower()
        mock_send.assert_not_called()

    def test_forgot_password_invalid_email_format(self, client):
        """Rejects malformed email with 422."""
        resp = client.post(
            "/api/auth/forgot-password",
            json={"email": "not-an-email"},
        )
        assert resp.status_code == 422

    def test_forgot_password_oauth_user_no_password(self, client, db):
        """Does not send reset email to OAuth-only user (no password_hash)."""
        from database.models import User

        oauth_user = User(email="oauth@example.com", google_id="google-123")
        db.add(oauth_user)
        db.commit()

        with patch("auth.routes.send_password_reset_email") as mock_send:
            resp = client.post(
                "/api/auth/forgot-password",
                json={"email": "oauth@example.com"},
            )
        assert resp.status_code == 200
        mock_send.assert_not_called()


class TestResetPassword:
    """Tests for POST /api/auth/reset-password."""

    def _get_reset_token(self, client, email="user@example.com"):
        """Helper: request a forgot-password and capture the token."""
        with patch("auth.routes.send_password_reset_email") as mock_send:
            client.post("/api/auth/forgot-password", json={"email": email})
        return mock_send.call_args[0][1]

    def test_reset_password_success(self, client):
        """Valid token allows password reset; can login with new password."""
        register_user(client, email="user@example.com")
        token = self._get_reset_token(client)

        resp = client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": NEW_PASSWORD},
        )
        assert resp.status_code == 200
        assert "successfully" in resp.json()["message"].lower()

        # Old password no longer works
        resp_old = client.post(
            "/api/auth/login",
            data={"username": "user@example.com", "password": VALID_PASSWORD},
        )
        assert resp_old.status_code == 401

        # New password works
        resp_new = client.post(
            "/api/auth/login",
            data={"username": "user@example.com", "password": NEW_PASSWORD},
        )
        assert resp_new.status_code == 200
        assert "access_token" in resp_new.json()

    def test_reset_password_invalid_token(self, client):
        """Garbage token is rejected."""
        resp = client.post(
            "/api/auth/reset-password",
            json={"token": "invalid.jwt.token", "password": NEW_PASSWORD},
        )
        assert resp.status_code == 400
        assert "invalid" in resp.json()["detail"].lower()

    def test_reset_password_expired_token(self, client):
        """Expired token is rejected."""
        from datetime import timedelta

        from auth.security import create_access_token

        register_user(client, email="user@example.com")

        token = create_access_token(
            data={
                "sub": "1",
                "email": "user@example.com",
                "type": "password_reset",
                "hash": "x" * 10,
            },
            expires_delta=timedelta(seconds=-1),
        )
        resp = client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": NEW_PASSWORD},
        )
        assert resp.status_code == 400

    def test_reset_password_wrong_token_type(self, client):
        """A regular login token cannot be used for password reset."""
        register_user(client, email="user@example.com")
        # Login gives a regular access token (type != password_reset)
        resp_login = client.post(
            "/api/auth/login",
            data={"username": "user@example.com", "password": VALID_PASSWORD},
        )
        login_token = resp_login.json()["access_token"]

        resp = client.post(
            "/api/auth/reset-password",
            json={"token": login_token, "password": NEW_PASSWORD},
        )
        assert resp.status_code == 400

    def test_reset_password_token_used_twice(self, client):
        """Token cannot be reused after password was already changed."""
        register_user(client, email="user@example.com")
        token = self._get_reset_token(client)

        # First use: succeeds
        resp1 = client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": NEW_PASSWORD},
        )
        assert resp1.status_code == 200

        # Second use: fails (hash prefix changed)
        resp2 = client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": "AnotherPass789!@#"},
        )
        assert resp2.status_code == 400
        assert "already been used" in resp2.json()["detail"].lower()

    def test_reset_password_weak_password_rejected(self, client):
        """New password must pass strength validation."""
        register_user(client, email="user@example.com")
        token = self._get_reset_token(client)

        weak_passwords = [
            "short1!A",  # too short
            "alllowercase123!",  # no uppercase
            "ALLUPPERCASE123!",  # no lowercase
            "NoDigitsHere!!!",  # no digit
            "NoSpecialChar123",  # no special char
        ]
        for pwd in weak_passwords:
            resp = client.post(
                "/api/auth/reset-password",
                json={"token": token, "password": pwd},
            )
            assert resp.status_code == 422, f"Expected 422 for password: {pwd}"

    def test_reset_password_oauth_user(self, client, db):
        """Reset fails for OAuth-only user (no password_hash)."""
        from auth.security import create_access_token
        from database.models import User

        oauth_user = User(email="oauth@example.com", google_id="g-123")
        db.add(oauth_user)
        db.commit()
        db.refresh(oauth_user)

        token = create_access_token(
            data={
                "sub": str(oauth_user.id),
                "email": oauth_user.email,
                "type": "password_reset",
                "hash": "0000000000",
            },
        )
        resp = client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": NEW_PASSWORD},
        )
        assert resp.status_code == 400


class TestResetPasswordSchemas:
    """Schema-level validation for ForgotPasswordRequest / ResetPasswordRequest."""

    def test_forgot_password_missing_email(self, client):
        resp = client.post("/api/auth/forgot-password", json={})
        assert resp.status_code == 422

    def test_reset_password_missing_token(self, client):
        resp = client.post(
            "/api/auth/reset-password",
            json={"password": NEW_PASSWORD},
        )
        assert resp.status_code == 422

    def test_reset_password_missing_password(self, client):
        resp = client.post(
            "/api/auth/reset-password",
            json={"token": "some-token"},
        )
        assert resp.status_code == 422
