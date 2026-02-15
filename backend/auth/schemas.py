"""Pydantic schemas for authentication."""

import re

from pydantic import BaseModel, EmailStr, field_validator

# Minimum password length for security compliance
MIN_PASSWORD_LENGTH = 12
# Special characters required for password complexity
SPECIAL_CHARS = r"!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?"


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength with strict security requirements."""
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(f"[{re.escape(SPECIAL_CHARS)}]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*...)")
        return v


class UserLogin(BaseModel):
    """Schema for user login (OAuth2 password flow)."""

    email: EmailStr
    password: str


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for decoded token data."""

    user_id: int | None = None
    email: str | None = None


class UserResponse(BaseModel):
    """Schema for user response (without password)."""

    id: int
    email: str
    is_guest: bool = False
    is_premium: bool = False
    feedback_completed_at: str | None = None

    model_config = {"from_attributes": True}


class GuestUpgrade(BaseModel):
    """Schema for upgrading a guest account to a permanent account."""

    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength with strict security requirements."""
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(f"[{re.escape(SPECIAL_CHARS)}]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*...)")
        return v


class ForgotPasswordRequest(BaseModel):
    """Schema for forgot-password request."""

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Schema for password reset with token."""

    token: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength with strict security requirements."""
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f"Password must be at least {MIN_PASSWORD_LENGTH} characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        if not re.search(f"[{re.escape(SPECIAL_CHARS)}]", v):
            raise ValueError("Password must contain at least one special character (!@#$%^&*...)")
        return v


class FeedbackCreate(BaseModel):
    """Schema for submitting feedback."""

    profile: str | None = None
    target_sector: str | None = None
    source: str | None = None
    ease_rating: int
    time_spent: str | None = None
    obstacles: str | None = None
    alternative: str | None = None
    suggestions: str | None = None
    nps: int | None = None
    future_help: str | None = None

    @field_validator("ease_rating")
    @classmethod
    def validate_ease_rating(cls, v: int) -> int:
        """Validate ease rating is between 1 and 10."""
        if not 1 <= v <= 10:
            raise ValueError("Ease rating must be between 1 and 10")
        return v

    @field_validator("nps")
    @classmethod
    def validate_nps(cls, v: int | None) -> int | None:
        """Validate NPS is between 0 and 10."""
        if v is not None and not 0 <= v <= 10:
            raise ValueError("NPS must be between 0 and 10")
        return v


class FeedbackResponse(BaseModel):
    """Schema for feedback submission response."""

    message: str
    bonus_resumes: int
    bonus_downloads: int


class UserDataExport(BaseModel):
    """Schema for GDPR data export (right to portability)."""

    user: dict
    resumes: list[dict]
    exported_at: str
