"""SQLAlchemy models for the CV SaaS application."""

from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class User(Base):
    """User model for authentication."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=True)  # Nullable for OAuth users
    google_id = Column(String(255), unique=True, nullable=True, index=True)
    is_guest = Column(Boolean, default=False, nullable=False, index=True)
    is_premium = Column(Boolean, default=False, nullable=False)
    download_count = Column(Integer, default=0, nullable=False)
    download_count_reset_at = Column(DateTime(timezone=True), nullable=True)
    feedback_completed_at = Column(DateTime(timezone=True), nullable=True)
    bonus_resumes = Column(Integer, default=0, nullable=False)
    bonus_downloads = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    feedback = relationship("Feedback", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Feedback(Base):
    """Feedback model for storing user feedback responses."""

    __tablename__ = "feedbacks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    profile = Column(String(100), nullable=True)
    target_sector = Column(String(255), nullable=True)
    source = Column(String(100), nullable=True)
    ease_rating = Column(Integer, nullable=False)
    time_spent = Column(String(50), nullable=True)
    obstacles = Column(Text, nullable=True)
    alternative = Column(String(255), nullable=True)
    suggestions = Column(Text, nullable=True)
    nps = Column(Integer, nullable=True)
    future_help = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC))

    user = relationship("User", back_populates="feedback")

    def __repr__(self) -> str:
        return f"<Feedback(id={self.id}, user_id={self.user_id}, ease_rating={self.ease_rating})>"


class Resume(Base):
    """Resume model for storing CV data."""

    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    json_content = Column(JSONB, nullable=True)
    s3_url = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False)

    user = relationship("User", back_populates="resumes")

    def __repr__(self) -> str:
        return f"<Resume(id={self.id}, name={self.name}, user_id={self.user_id})>"
