"""Shared fixtures for API integration tests."""

import os
import unittest.mock

# Set test environment variables BEFORE importing app modules
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-unit-tests-only"
os.environ["DATABASE_URL"] = "sqlite://"  # won't be used, but prevents ValueError
os.environ["ZEPTOMAIL_API_KEY"] = ""  # disable real email sending in tests

import fakeredis
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import JSON, StaticPool, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

import auth.routes as auth_routes_module
from app import app
from auth.routes import _reset_rate_limit_state
from database.db_config import get_db
from database.models import Base, Resume, User

# SQLite doesn't support PostgreSQL's JSONB type natively.
# Re-map the JSONB column to JSON for test compatibility.
Resume.__table__.c.json_content.type = JSON()


# Single shared engine for all tests — SQLite in-memory with cross-thread support.
# StaticPool ensures a single connection is reused (required for in-memory SQLite
# to keep tables visible across threads used by TestClient).
_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(_engine, "connect")
def _set_sqlite_pragma(dbapi_conn, connection_record):
    cursor = dbapi_conn.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


_TestSession = sessionmaker(bind=_engine)


@pytest.fixture(autouse=True)
def _mock_redis(monkeypatch):
    """Replace the Redis client with an in-memory FakeRedis for every test.

    Yields the FakeRedis instance so individual tests can inspect or pre-seed
    Redis state (e.g. set keys with specific TTLs) by requesting this fixture.
    """
    fake = fakeredis.FakeRedis(decode_responses=True)
    monkeypatch.setattr(auth_routes_module, "_redis_client", fake)
    yield fake


@pytest.fixture(autouse=True)
def _mock_email():
    """Prevent any real email sending during tests."""
    with unittest.mock.patch("core.email.send_email"):
        yield


@pytest.fixture(autouse=True)
def _reset_auth_rate_limiter(_mock_redis):
    """Ensure auth rate limiter state is isolated between tests.

    Depends on _mock_redis so the fake client is always in place before the
    rate-limit keys are cleared.
    """
    _reset_rate_limit_state()
    yield
    _reset_rate_limit_state()


@pytest.fixture(autouse=True)
def _auto_verify():
    """Auto-verify non-guest users on insert so tests can log in immediately."""

    def _set_verified(mapper, connection, target):
        if not target.is_guest:
            target.is_verified = True

    event.listen(User, "before_insert", _set_verified)
    yield
    event.remove(User, "before_insert", _set_verified)


@pytest.fixture()
def db():
    """Create tables before each test, drop them after."""
    Base.metadata.create_all(bind=_engine)
    session = _TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=_engine)


@pytest.fixture()
def client(db: Session):
    """FastAPI TestClient with the test database injected."""

    def override_get_db():
        try:
            yield db
        finally:
            pass  # session lifecycle managed by the db fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# --- Auth helpers ---

VALID_PASSWORD = "TestPass123!@#"


def register_user(
    client: TestClient, email: str = "test@example.com", password: str = VALID_PASSWORD
) -> None:
    """Register a user (sends verification email; auto-verified in tests)."""
    resp = client.post("/api/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    assert "message" in resp.json()


def login_user(
    client: TestClient, email: str = "test@example.com", password: str = VALID_PASSWORD
) -> str:
    """Login and return the access token from cookie storage."""
    resp = client.post("/api/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = client.cookies.get("access_token")
    assert token
    return token


def auth_header(token: str) -> dict:
    """Build an Authorization header from a token."""
    return {"Authorization": f"Bearer {token}"}


def get_cookie_access_token(client: TestClient) -> str:
    """Return current access token from the TestClient cookie jar."""
    token = client.cookies.get("access_token")
    assert token
    return token


def create_authenticated_user(client: TestClient, email: str = "test@example.com") -> str:
    """Register + login, return the token."""
    register_user(client, email=email)
    return login_user(client, email=email)
