"""Authentication routes for the CV SaaS application."""
import os
import secrets
import time
from datetime import timedelta
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth.schemas import Token, UserCreate, UserResponse
from auth.security import create_access_token, decode_access_token, get_password_hash, verify_password
from database.db_config import get_db
from database.models import User

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

# Google OAuth2 Configuration
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "")
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

# OAuth state token expiration (5 minutes)
OAUTH_STATE_EXPIRE_MINUTES = 5

# SECURITY: Temporary code store for OAuth token exchange
# In production, consider using Redis for multi-instance deployments
_oauth_code_store: dict[str, tuple[str, float]] = {}
OAUTH_CODE_EXPIRE_SECONDS = 60  # Code expires in 1 minute


def _cleanup_expired_codes() -> None:
    """Remove expired OAuth codes from the store."""
    now = time.time()
    expired = [code for code, (_, exp) in _oauth_code_store.items() if now > exp]
    for code in expired:
        _oauth_code_store.pop(code, None)


def _store_oauth_code(jwt_token: str) -> str:
    """Store JWT token and return a temporary code for exchange."""
    _cleanup_expired_codes()
    code = secrets.token_urlsafe(32)
    _oauth_code_store[code] = (jwt_token, time.time() + OAUTH_CODE_EXPIRE_SECONDS)
    return code


def _exchange_oauth_code(code: str) -> str | None:
    """Exchange temporary code for JWT token. Returns None if invalid/expired."""
    _cleanup_expired_codes()
    if code not in _oauth_code_store:
        return None
    jwt_token, expiry = _oauth_code_store.pop(code)
    if time.time() > expiry:
        return None
    return jwt_token


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Register a new user.

    Args:
        user_data: User registration data (email, password).
        db: Database session.

    Returns:
        The created user (without password).

    Raises:
        HTTPException: 400 if email already exists.
    """
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create new user with hashed password
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        password_hash=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=Token)
async def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    """Authenticate user and return JWT token (OAuth2 Password Flow).

    Note: OAuth2PasswordRequestForm expects 'username' field, but we use email.
    Send email as 'username' in the form data.

    Args:
        form_data: OAuth2 form with username (email) and password.
        db: Database session.

    Returns:
        JWT access token.

    Raises:
        HTTPException: 401 if credentials are invalid.
    """
    # Find user by email (OAuth2 uses 'username' field)
    user = db.query(User).filter(User.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token with user ID as subject (must be string per JWT spec)
    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    return Token(access_token=access_token)


@router.get("/google/login")
async def google_login() -> RedirectResponse:
    """Redirect to Google OAuth2 login page.

    Returns:
        Redirect to Google's OAuth2 consent page.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth2 not configured",
        )

    # Generate a signed state token to prevent CSRF attacks
    state_nonce = secrets.token_urlsafe(32)
    state_token = create_access_token(
        data={"nonce": state_nonce, "type": "oauth_state"},
        expires_delta=timedelta(minutes=OAUTH_STATE_EXPIRE_MINUTES),
    )

    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state_token,
    }

    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/google/callback")
async def google_callback(
    code: str,
    state: str,
    db: Annotated[Session, Depends(get_db)],
) -> RedirectResponse:
    """Handle Google OAuth2 callback.

    Args:
        code: Authorization code from Google.
        state: State token for CSRF protection.
        db: Database session.

    Returns:
        Redirect to frontend with JWT token.
    """
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET or not GOOGLE_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth2 not configured",
        )

    # Verify state token to prevent CSRF attacks
    state_payload = decode_access_token(state)
    if not state_payload or state_payload.get("type") != "oauth_state":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired state token",
        )

    # Exchange authorization code for tokens
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": GOOGLE_REDIRECT_URI,
            },
        )

        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange authorization code",
            )

        token_data = token_response.json()
        access_token = token_data.get("access_token")

        # Get user info from Google
        userinfo_response = await client.get(
            GOOGLE_USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google",
            )

        userinfo = userinfo_response.json()

    google_id = userinfo.get("id")
    email = userinfo.get("email")

    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user info from Google",
        )

    # Find or create user
    user = db.query(User).filter(User.google_id == google_id).first()

    if not user:
        # Check if email already exists (user registered with password)
        existing_user = db.query(User).filter(User.email == email).first()
        if existing_user:
            # Link Google account to existing user
            existing_user.google_id = google_id
            db.commit()
            user = existing_user
        else:
            # Create new user
            user = User(
                email=email,
                google_id=google_id,
                password_hash=None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # Create JWT token
    jwt_token = create_access_token(data={"sub": str(user.id), "email": user.email})

    # SECURITY: Store token and redirect with temporary code instead of exposing JWT in URL
    # This prevents the JWT from being logged in browser history, server logs, or referrer headers
    temp_code = _store_oauth_code(jwt_token)

    frontend_url = os.environ.get("FRONTEND_URL", "https://sivee.pro")
    redirect_url = f"{frontend_url}?code={temp_code}"

    return RedirectResponse(url=redirect_url)


@router.post("/google/exchange", response_model=Token)
async def exchange_oauth_code(code: str) -> Token:
    """Exchange temporary OAuth code for JWT token.

    SECURITY: This endpoint allows the frontend to securely retrieve the JWT token
    after OAuth callback, without exposing the token in URLs or logs.

    Args:
        code: Temporary code received from OAuth callback.

    Returns:
        JWT access token.

    Raises:
        HTTPException: 400 if code is invalid or expired.
    """
    jwt_token = _exchange_oauth_code(code)

    if not jwt_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code",
        )

    return Token(access_token=jwt_token)
