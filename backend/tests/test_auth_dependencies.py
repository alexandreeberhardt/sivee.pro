"""Tests for auth/dependencies.py — get_current_user dependency."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

from datetime import timedelta

import pytest
from sqlalchemy import JSON

from auth.security import create_access_token
from database.models import Base, Resume
from tests.conftest import (
    _engine,
    _TestSession,
    auth_header,
    create_authenticated_user,
    register_user,
)

# Re-map JSONB for SQLite tests
Resume.__table__.c.json_content.type = JSON()


class TestGetCurrentUserViaAPI:
    """Test get_current_user through the /api/auth/me endpoint."""

    @pytest.fixture(autouse=True)
    def setup_db(self):
        Base.metadata.create_all(bind=_engine)
        self.session = _TestSession()
        yield
        self.session.close()
        Base.metadata.drop_all(bind=_engine)

    @pytest.fixture()
    def client(self):
        from fastapi.testclient import TestClient

        from app import app
        from database.db_config import get_db

        def override():
            try:
                yield self.session
            finally:
                pass

        app.dependency_overrides[get_db] = override
        with TestClient(app) as c:
            yield c
        app.dependency_overrides.clear()

    def test_valid_token_returns_user(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 200
        assert resp.json()["email"] == "test@example.com"

    def test_missing_token_returns_401(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401

    def test_invalid_token_returns_401(self, client):
        resp = client.get("/api/auth/me", headers=auth_header("garbage.token.here"))
        assert resp.status_code == 401

    def test_expired_token_returns_401(self, client):
        register_user(client)
        # Create a token that already expired
        token = create_access_token(
            data={"sub": "1", "email": "test@example.com"},
            expires_delta=timedelta(seconds=-10),
        )
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 401

    def test_token_with_nonexistent_user_returns_401(self, client):
        # Create token for user ID that doesn't exist
        token = create_access_token(data={"sub": "9999"})
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 401

    def test_token_without_sub_returns_401(self, client):
        token = create_access_token(data={"email": "test@example.com"})
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 401

    def test_token_with_non_numeric_sub_returns_401(self, client):
        token = create_access_token(data={"sub": "not-a-number"})
        resp = client.get("/api/auth/me", headers=auth_header(token))
        assert resp.status_code == 401
