"""Shared fixtures for API integration tests."""

import os

# Set test environment variables BEFORE importing app modules
os.environ["JWT_SECRET_KEY"] = "test-secret-key-for-unit-tests-only"
os.environ["DATABASE_URL"] = "sqlite://"  # won't be used, but prevents ValueError

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import JSON, StaticPool, create_engine, event
from sqlalchemy.orm import Session, sessionmaker

from app import app
from database.db_config import get_db
from database.models import Base, Resume

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
) -> dict:
    """Register a user and return the response JSON."""
    resp = client.post("/api/auth/register", json={"email": email, "password": password})
    assert resp.status_code == 201, resp.text
    return resp.json()


def login_user(
    client: TestClient, email: str = "test@example.com", password: str = VALID_PASSWORD
) -> str:
    """Login and return the access token."""
    resp = client.post("/api/auth/login", data={"username": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def auth_header(token: str) -> dict:
    """Build an Authorization header from a token."""
    return {"Authorization": f"Bearer {token}"}


def create_authenticated_user(client: TestClient, email: str = "test@example.com") -> str:
    """Register + login, return the token."""
    register_user(client, email=email)
    return login_user(client, email=email)
