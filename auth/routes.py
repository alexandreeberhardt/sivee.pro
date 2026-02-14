"""Authentication routes for the CV SaaS application."""

import contextlib
import os
import secrets
import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth.dependencies import CurrentUser
from auth.schemas import (
    FeedbackCreate,
    FeedbackResponse,
    ForgotPasswordRequest,
    GuestUpgrade,
    ResetPasswordRequest,
    Token,
    UserCreate,
    UserDataExport,
    UserResponse,
)
from auth.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from core.email import send_password_reset_email, send_welcome_email
from database.db_config import get_db
from database.models import Feedback, Resume, User

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
    background_tasks: BackgroundTasks,
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

    background_tasks.add_task(send_welcome_email, new_user.email)

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
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "is_premium": user.is_premium,
            "feedback_completed": bool(user.feedback_completed_at),
        }
    )

    return Token(access_token=access_token)


@router.post("/guest", response_model=Token, status_code=status.HTTP_201_CREATED)
async def create_guest_account(
    db: Annotated[Session, Depends(get_db)],
) -> Token:
    """Create an anonymous guest account.

    Creates a guest user with a unique guest email and returns a JWT token.
    Guest accounts are limited to 3 resumes and can be upgraded to full accounts.

    Args:
        db: Database session.

    Returns:
        JWT access token with is_guest claim set to true.
    """
    # Generate unique guest email
    guest_email = f"guest-{uuid.uuid4()}@guest.local"

    # Create guest user (no password needed)
    guest_user = User(
        email=guest_email,
        is_guest=True,
        password_hash=None,
    )

    db.add(guest_user)
    db.commit()
    db.refresh(guest_user)

    # Create access token with guest flag
    access_token = create_access_token(
        data={
            "sub": str(guest_user.id),
            "email": guest_user.email,
            "is_guest": True,
        }
    )

    return Token(access_token=access_token)


@router.post("/upgrade", response_model=UserResponse)
async def upgrade_guest_account(
    upgrade_data: GuestUpgrade,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Upgrade a guest account to a permanent account.

    Converts a guest account to a full account by adding email and password.
    Only guest accounts can be upgraded.

    Args:
        upgrade_data: New email and password for the account.
        current_user: The authenticated guest user.
        db: Database session.

    Returns:
        The upgraded user.

    Raises:
        HTTPException: 400 if user is not a guest or email already exists.
    """
    # Verify this is a guest account
    if not current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only guest accounts can be upgraded",
        )

    # Check if email already exists
    existing_user = db.query(User).filter(User.email == upgrade_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Upgrade the account
    current_user.email = upgrade_data.email
    current_user.password_hash = get_password_hash(upgrade_data.password)
    current_user.is_guest = False

    db.commit()
    db.refresh(current_user)

    background_tasks.add_task(send_welcome_email, current_user.email)

    return current_user


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
    background_tasks: BackgroundTasks,
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
    is_new_user = False

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
            is_new_user = True
            user = User(
                email=email,
                google_id=google_id,
                password_hash=None,
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    if is_new_user:
        background_tasks.add_task(send_welcome_email, user.email)

    # Create JWT token
    jwt_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
            "is_premium": user.is_premium,
            "feedback_completed": bool(user.feedback_completed_at),
        }
    )

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


# ============================================================================
# Password Reset Endpoints
# ============================================================================

RESET_TOKEN_EXPIRE_MINUTES = 30


@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Request a password reset email.

    Always returns 200 with a generic message to avoid leaking
    whether an email is registered.
    """
    user = db.query(User).filter(User.email == data.email).first()

    if user and user.password_hash:
        token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
                "type": "password_reset",
                "hash": user.password_hash[:10],
            },
            expires_delta=timedelta(minutes=RESET_TOKEN_EXPIRE_MINUTES),
        )
        background_tasks.add_task(send_password_reset_email, user.email, token)

    return {"message": "If this email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> dict[str, str]:
    """Reset password using a valid reset token."""
    payload = decode_access_token(data.token)
    if not payload or payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    user_id = payload.get("sub")
    hash_prefix = payload.get("hash")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token",
        )

    # Verify token hasn't already been used (password unchanged since token generation)
    if user.password_hash[:10] != hash_prefix:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used",
        )

    user.password_hash = get_password_hash(data.password)
    db.commit()

    return {"message": "Password has been reset successfully."}


# ============================================================================
# Feedback Endpoint
# ============================================================================

FEEDBACK_BONUS_RESUMES = 3
FEEDBACK_BONUS_DOWNLOADS = 5


@router.post("/feedback", response_model=FeedbackResponse)
async def submit_feedback(
    feedback_data: FeedbackCreate,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> FeedbackResponse:
    """Submit user feedback and receive bonus limits.

    Only registered (non-guest) users can submit feedback, once per account.

    Args:
        feedback_data: Feedback form data (rating, liked, improvement, source).
        current_user: The authenticated user.
        db: Database session.

    Returns:
        Bonus amounts awarded.

    Raises:
        HTTPException: 400 if user is a guest, 409 if already submitted.
    """
    if current_user.is_guest:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Guest accounts cannot submit feedback",
        )

    if current_user.feedback_completed_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Feedback already submitted",
        )

    # Store feedback
    feedback = Feedback(
        user_id=current_user.id,
        profile=feedback_data.profile,
        target_sector=feedback_data.target_sector,
        source=feedback_data.source,
        ease_rating=feedback_data.ease_rating,
        time_spent=feedback_data.time_spent,
        obstacles=feedback_data.obstacles,
        alternative=feedback_data.alternative,
        suggestions=feedback_data.suggestions,
        nps=feedback_data.nps,
        future_help=feedback_data.future_help,
    )
    db.add(feedback)

    # Award bonuses
    current_user.feedback_completed_at = datetime.now(UTC)
    current_user.bonus_resumes += FEEDBACK_BONUS_RESUMES
    current_user.bonus_downloads += FEEDBACK_BONUS_DOWNLOADS
    db.commit()

    return FeedbackResponse(
        message="Thank you for your feedback!",
        bonus_resumes=FEEDBACK_BONUS_RESUMES,
        bonus_downloads=FEEDBACK_BONUS_DOWNLOADS,
    )


# ============================================================================
# GDPR Endpoints (Right to access, portability, erasure)
# ============================================================================


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: CurrentUser) -> User:
    """Get current user information.

    Args:
        current_user: The authenticated user.

    Returns:
        User information.
    """
    return current_user


@router.get("/me/export", response_model=UserDataExport)
async def export_user_data(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> UserDataExport:
    """Export all user data (GDPR right to portability).

    Returns all data associated with the user account in a portable format.

    Args:
        current_user: The authenticated user.
        db: Database session.

    Returns:
        All user data including resumes.
    """
    # Get all user's resumes
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()

    return UserDataExport(
        user={
            "id": current_user.id,
            "email": current_user.email,
            "auth_method": "google" if current_user.google_id else "email",
        },
        resumes=[
            {
                "id": resume.id,
                "name": resume.name,
                "json_content": resume.json_content,
                "created_at": resume.created_at.isoformat() if resume.created_at else None,
            }
            for resume in resumes
        ],
        exported_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )


def _extract_s3_key_from_url(s3_url: str) -> str | None:
    """Extract S3 key from a full S3 URL.

    Args:
        s3_url: Full S3 URL like https://bucket.s3.region.amazonaws.com/path/to/file.pdf

    Returns:
        The S3 key (path/to/file.pdf) or None if URL format is invalid.
    """
    if not s3_url:
        return None
    try:
        # URL format: https://bucket.s3.region.amazonaws.com/key
        from urllib.parse import urlparse

        parsed = urlparse(s3_url)
        if parsed.path:
            # Remove leading slash
            return parsed.path.lstrip("/")
    except Exception:
        pass
    return None


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_account(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    """Delete user account and all associated data (GDPR right to erasure).

    This permanently deletes:
    - User account
    - All resumes (cascade delete)
    - Associated S3 files

    Args:
        current_user: The authenticated user.
        db: Database session.
    """
    # Get all user's resumes to delete S3 files
    resumes = db.query(Resume).filter(Resume.user_id == current_user.id).all()

    # Delete S3 files (best effort - don't fail if S3 deletion fails)
    s3_keys_to_delete = []
    for resume in resumes:
        if resume.s3_url:
            s3_key = _extract_s3_key_from_url(resume.s3_url)
            if s3_key:
                s3_keys_to_delete.append(s3_key)

    if s3_keys_to_delete:
        try:
            from core.StorageManager import StorageManager

            storage = StorageManager()
            for s3_key in s3_keys_to_delete:
                # Log but don't fail - data deletion is more important
                with contextlib.suppress(Exception):
                    storage.delete_file(s3_key)
        except Exception:
            # S3 not configured or unavailable - continue with account deletion
            pass

    # Delete user (resumes are cascade deleted via FK relationship)
    db.delete(current_user)
    db.commit()
