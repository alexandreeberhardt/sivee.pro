"""Tests for auth/schemas.py — Pydantic validation models."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from pydantic import ValidationError

from auth.schemas import MIN_PASSWORD_LENGTH, GuestUpgrade, UserCreate

VALID_PASSWORD = "TestPass123!@#"


class TestUserCreateValidation:
    def test_valid_user(self):
        user = UserCreate(email="a@b.com", password=VALID_PASSWORD)
        assert user.email == "a@b.com"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            UserCreate(email="not-an-email", password=VALID_PASSWORD)

    def test_password_too_short(self):
        with pytest.raises(ValidationError, match="at least"):
            UserCreate(email="a@b.com", password="Ab1!")

    def test_password_no_uppercase(self):
        with pytest.raises(ValidationError, match="uppercase"):
            UserCreate(email="a@b.com", password="testpass123!@#")

    def test_password_no_lowercase(self):
        with pytest.raises(ValidationError, match="lowercase"):
            UserCreate(email="a@b.com", password="TESTPASS123!@#")

    def test_password_no_digit(self):
        with pytest.raises(ValidationError, match="digit"):
            UserCreate(email="a@b.com", password="TestPassword!@#")

    def test_password_no_special_char(self):
        with pytest.raises(ValidationError, match="special"):
            UserCreate(email="a@b.com", password="TestPassword123")

    def test_password_exactly_min_length(self):
        pwd = "A" * (MIN_PASSWORD_LENGTH - 3) + "a1!"
        user = UserCreate(email="a@b.com", password=pwd)
        assert user.password == pwd

    def test_password_one_below_min_length(self):
        pwd = "A" * (MIN_PASSWORD_LENGTH - 4) + "a1!"
        with pytest.raises(ValidationError, match="at least"):
            UserCreate(email="a@b.com", password=pwd)


class TestGuestUpgradeValidation:
    def test_valid_upgrade(self):
        gu = GuestUpgrade(email="new@email.com", password=VALID_PASSWORD)
        assert gu.email == "new@email.com"

    def test_invalid_email(self):
        with pytest.raises(ValidationError):
            GuestUpgrade(email="bad", password=VALID_PASSWORD)

    def test_weak_password(self):
        with pytest.raises(ValidationError):
            GuestUpgrade(email="a@b.com", password="weak")
