"""Database configuration and session management."""

import os
from collections.abc import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL")

engine: Engine | None = None
SessionLocal: sessionmaker[Session] | None = None


def get_engine() -> Engine:
    """Get or create the database engine."""
    global engine
    if engine is None:
        if DATABASE_URL is None:
            raise ValueError("DATABASE_URL environment variable is not set")
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
    return engine


def get_session_local() -> sessionmaker[Session]:
    """Get or create the session factory."""
    global SessionLocal
    if SessionLocal is None:
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=get_engine())
    return SessionLocal


def get_db() -> Generator[Session]:
    """Dependency for FastAPI to get a database session."""
    session_factory = get_session_local()
    db = session_factory()
    try:
        yield db
    finally:
        db.close()


def check_db_connection() -> bool:
    """Check if the database connection is working.

    Returns:
        True if connected, False otherwise.
    """
    try:
        db_engine = get_engine()
        with db_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
