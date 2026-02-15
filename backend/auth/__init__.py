"""Authentication module for the CV SaaS application."""

from auth.dependencies import get_current_user
from auth.schemas import Token, TokenData, UserCreate, UserLogin, UserResponse
from auth.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)

__all__ = [
    "verify_password",
    "get_password_hash",
    "create_access_token",
    "decode_access_token",
    "get_current_user",
    "Token",
    "TokenData",
    "UserCreate",
    "UserLogin",
    "UserResponse",
]
