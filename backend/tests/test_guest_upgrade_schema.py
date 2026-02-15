"""Tests for GuestUpgrade password validator in auth/schemas.py."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from pydantic import ValidationError

from auth.schemas import MIN_PASSWORD_LENGTH, GuestUpgrade, UserCreate


class TestGuestUpgradePasswordValidation:
    """Test password validation rules for GuestUpgrade schema."""

    def test_valid_password_accepted(self):
        upgrade = GuestUpgrade(email="test@example.com", password="StrongPass123!@#")
        assert upgrade.password == "StrongPass123!@#"

    def test_too_short_rejected(self):
        with pytest.raises(ValidationError, match="at least"):
            GuestUpgrade(email="test@example.com", password="Short1!")

    def test_exactly_min_length_accepted(self):
        # 12 chars with all requirements: upper, lower, digit, special
        pwd = "Abcdefghij1!"
        assert len(pwd) == MIN_PASSWORD_LENGTH
        upgrade = GuestUpgrade(email="test@example.com", password=pwd)
        assert upgrade.password == pwd

    def test_no_uppercase_rejected(self):
        with pytest.raises(ValidationError, match="uppercase"):
            GuestUpgrade(email="test@example.com", password="alllowercase1!!")

    def test_no_lowercase_rejected(self):
        with pytest.raises(ValidationError, match="lowercase"):
            GuestUpgrade(email="test@example.com", password="ALLUPPERCASE1!!")

    def test_no_digit_rejected(self):
        with pytest.raises(ValidationError, match="digit"):
            GuestUpgrade(email="test@example.com", password="NoDigitsHere!@#$")

    def test_no_special_char_rejected(self):
        with pytest.raises(ValidationError, match="special"):
            GuestUpgrade(email="test@example.com", password="NoSpecialChar123")

    def test_invalid_email_rejected(self):
        with pytest.raises(ValidationError):
            GuestUpgrade(email="not-an-email", password="StrongPass123!@#")

    def test_various_special_chars_accepted(self):
        specials = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"]
        for char in specials:
            pwd = f"TestPassword1{char}"
            upgrade = GuestUpgrade(email="test@example.com", password=pwd)
            assert upgrade.password == pwd


class TestUserCreatePasswordValidation:
    """Verify UserCreate has the same validation (regression)."""

    def test_valid_password(self):
        user = UserCreate(email="test@example.com", password="StrongPass123!@#")
        assert user.password == "StrongPass123!@#"

    def test_weak_password_rejected(self):
        with pytest.raises(ValidationError):
            UserCreate(email="test@example.com", password="weak")
