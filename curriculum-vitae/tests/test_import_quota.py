"""Tests for CV import quota enforcement (_enforce_import_quota + API endpoints)."""

import os
from types import SimpleNamespace

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app import (
    MAX_IMPORTS_PER_GUEST,
    MAX_IMPORTS_PER_PREMIUM,
    MAX_IMPORTS_PER_USER,
    _enforce_import_quota,
)
from conftest import auth_header, create_authenticated_user
from database.models import User


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _user(
    *,
    is_guest: bool = False,
    is_premium: bool = False,
    import_count: int = 0,
    bonus_imports: int = 0,
) -> SimpleNamespace:
    return SimpleNamespace(
        is_guest=is_guest,
        is_premium=is_premium,
        import_count=import_count,
        bonus_imports=bonus_imports,
    )


# ---------------------------------------------------------------------------
# Unit tests – _enforce_import_quota (pure function, no DB needed)
# ---------------------------------------------------------------------------


class TestEnforceImportQuotaGuest:
    """Guest: limit is MAX_IMPORTS_PER_GUEST (1)."""

    def test_under_limit_passes(self):
        _enforce_import_quota(_user(is_guest=True, import_count=0), db=None)

    def test_at_limit_raises_429(self):
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(
                _user(is_guest=True, import_count=MAX_IMPORTS_PER_GUEST), db=None
            )
        assert exc_info.value.status_code == 429
        assert "Guest" in exc_info.value.detail

    def test_over_limit_raises_429(self):
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(
                _user(is_guest=True, import_count=MAX_IMPORTS_PER_GUEST + 5), db=None
            )
        assert exc_info.value.status_code == 429


class TestEnforceImportQuotaFreeUser:
    """Free user: limit is MAX_IMPORTS_PER_USER (3)."""

    def test_zero_imports_passes(self):
        _enforce_import_quota(_user(import_count=0), db=None)

    def test_one_below_limit_passes(self):
        _enforce_import_quota(_user(import_count=MAX_IMPORTS_PER_USER - 1), db=None)

    def test_at_limit_raises_429(self):
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(_user(import_count=MAX_IMPORTS_PER_USER), db=None)
        assert exc_info.value.status_code == 429
        assert "Upgrade" in exc_info.value.detail

    def test_over_limit_raises_429(self):
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(_user(import_count=MAX_IMPORTS_PER_USER + 10), db=None)
        assert exc_info.value.status_code == 429


class TestEnforceImportQuotaPremium:
    """Premium: limit is MAX_IMPORTS_PER_PREMIUM (50)."""

    def test_under_limit_passes(self):
        _enforce_import_quota(
            _user(is_premium=True, import_count=MAX_IMPORTS_PER_PREMIUM - 1), db=None
        )

    def test_at_limit_raises_429(self):
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(
                _user(is_premium=True, import_count=MAX_IMPORTS_PER_PREMIUM), db=None
            )
        assert exc_info.value.status_code == 429

    def test_over_limit_raises_429(self):
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(
                _user(is_premium=True, import_count=MAX_IMPORTS_PER_PREMIUM + 1), db=None
            )
        assert exc_info.value.status_code == 429


class TestEnforceImportQuotaBonus:
    """bonus_imports extends the effective limit for all tiers."""

    def test_bonus_extends_free_limit(self):
        # 3 used, but 3 bonus → effective limit 6 → should pass
        _enforce_import_quota(
            _user(import_count=MAX_IMPORTS_PER_USER, bonus_imports=3), db=None
        )

    def test_bonus_at_extended_limit_raises(self):
        bonus = 3
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(
                _user(import_count=MAX_IMPORTS_PER_USER + bonus, bonus_imports=bonus),
                db=None,
            )
        assert exc_info.value.status_code == 429

    def test_bonus_extends_premium_limit(self):
        bonus = 10
        _enforce_import_quota(
            _user(is_premium=True, import_count=MAX_IMPORTS_PER_PREMIUM, bonus_imports=bonus),
            db=None,
        )

    def test_bonus_at_extended_premium_limit_raises(self):
        bonus = 10
        with pytest.raises(HTTPException) as exc_info:
            _enforce_import_quota(
                _user(
                    is_premium=True,
                    import_count=MAX_IMPORTS_PER_PREMIUM + bonus,
                    bonus_imports=bonus,
                ),
                db=None,
            )
        assert exc_info.value.status_code == 429

    def test_zero_bonus_does_not_extend(self):
        """Explicitly confirm bonus_imports=0 doesn't change behaviour."""
        with pytest.raises(HTTPException):
            _enforce_import_quota(
                _user(import_count=MAX_IMPORTS_PER_USER, bonus_imports=0), db=None
            )


# ---------------------------------------------------------------------------
# Integration tests – quota enforcement via HTTP endpoints
# ---------------------------------------------------------------------------
# These use the full DB-backed TestClient (fixtures from conftest.py).
# The quota check fires before file processing, so a PDF that would fail later
# still returns 429 when the limit is reached.


PDF_BYTES = b"%PDF-1.4 minimal"


class TestImportEndpointQuota:
    """/import endpoint enforces per-tier import quota."""

    def test_guest_at_limit_returns_429(self, client: TestClient, db: Session) -> None:
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 201
        token = resp.cookies.get("access_token")

        assert token

        user = db.query(User).filter(User.is_guest.is_(True)).first()
        assert user is not None
        user.import_count = MAX_IMPORTS_PER_GUEST
        db.commit()

        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code == 429
        assert "Guest" in resp.json()["detail"]

    def test_free_user_at_limit_returns_429(self, client: TestClient, db: Session) -> None:
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.import_count = MAX_IMPORTS_PER_USER
        db.commit()

        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code == 429
        assert "Upgrade" in resp.json()["detail"]

    def test_free_user_under_limit_not_blocked_by_quota(
        self, client: TestClient, db: Session
    ) -> None:
        """Under the limit: quota passes (endpoint may fail for other reasons, but not 429)."""
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.import_count = MAX_IMPORTS_PER_USER - 1
        db.commit()

        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code != 429

    def test_premium_at_limit_returns_429(self, client: TestClient, db: Session) -> None:
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.is_premium = True
        user.import_count = MAX_IMPORTS_PER_PREMIUM
        db.commit()

        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code == 429

    def test_premium_under_limit_not_blocked(self, client: TestClient, db: Session) -> None:
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.is_premium = True
        user.import_count = MAX_IMPORTS_PER_PREMIUM - 1
        db.commit()

        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code != 429

    def test_bonus_imports_lift_free_limit(self, client: TestClient, db: Session) -> None:
        """A free user at base limit but with bonus imports is NOT blocked."""
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.import_count = MAX_IMPORTS_PER_USER
        user.bonus_imports = 3  # effective limit becomes 6
        db.commit()

        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code != 429

    def test_bonus_imports_exhausted_blocks(self, client: TestClient, db: Session) -> None:
        """Once bonus is also exhausted, the request is blocked."""
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.import_count = MAX_IMPORTS_PER_USER + 3
        user.bonus_imports = 3
        db.commit()

        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code == 429


class TestImportStreamEndpointQuota:
    """/import-stream enforces the same quota as /import."""

    def test_free_user_at_limit_returns_429(self, client: TestClient, db: Session) -> None:
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.import_count = MAX_IMPORTS_PER_USER
        db.commit()

        resp = client.post(
            "/import-stream",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code == 429
        assert "Upgrade" in resp.json()["detail"]

    def test_guest_at_limit_returns_429(self, client: TestClient, db: Session) -> None:
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 201
        token = resp.cookies.get("access_token")

        assert token

        user = db.query(User).filter(User.is_guest.is_(True)).first()
        assert user is not None
        user.import_count = MAX_IMPORTS_PER_GUEST
        db.commit()

        resp = client.post(
            "/import-stream",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code == 429

    def test_under_limit_not_blocked_by_quota(self, client: TestClient, db: Session) -> None:
        token = create_authenticated_user(client)

        user = db.query(User).filter(User.email == "test@example.com").first()
        user.import_count = MAX_IMPORTS_PER_USER - 1
        db.commit()

        resp = client.post(
            "/import-stream",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
            headers=auth_header(token),
        )
        assert resp.status_code != 429


class TestImportQuotaUnauthenticated:
    def test_import_without_auth_returns_401(self, client: TestClient) -> None:
        resp = client.post(
            "/import",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
        )
        assert resp.status_code == 401

    def test_import_stream_without_auth_returns_401(self, client: TestClient) -> None:
        resp = client.post(
            "/import-stream",
            files={"file": ("cv.pdf", PDF_BYTES, "application/pdf")},
        )
        assert resp.status_code == 401
