"""Tests for database/db_config.py — engine creation, session management, connection check."""

import contextlib
import os

import pytest


class TestGetEngine:
    def test_missing_database_url_raises(self):
        """get_engine should raise ValueError when DATABASE_URL is not set."""
        # Import fresh to test the module-level behavior
        import database.db_config as db_cfg

        # Reset global engine
        db_cfg.engine = None
        original_url = db_cfg.DATABASE_URL
        db_cfg.DATABASE_URL = None

        try:
            with pytest.raises(ValueError, match="DATABASE_URL"):
                db_cfg.get_engine()
        finally:
            db_cfg.DATABASE_URL = original_url
            db_cfg.engine = None

    def test_get_engine_returns_engine(self):
        import database.db_config as db_cfg

        db_cfg.engine = None
        db_cfg.DATABASE_URL = "sqlite://"

        try:
            engine = db_cfg.get_engine()
            assert engine is not None
        finally:
            db_cfg.engine = None
            db_cfg.DATABASE_URL = os.environ.get("DATABASE_URL")

    def test_get_engine_caches(self):
        import database.db_config as db_cfg

        db_cfg.engine = None
        db_cfg.DATABASE_URL = "sqlite://"

        try:
            engine1 = db_cfg.get_engine()
            engine2 = db_cfg.get_engine()
            assert engine1 is engine2
        finally:
            db_cfg.engine = None
            db_cfg.DATABASE_URL = os.environ.get("DATABASE_URL")


class TestGetSessionLocal:
    def test_returns_session_factory(self):
        import database.db_config as db_cfg

        db_cfg.engine = None
        db_cfg.SessionLocal = None
        db_cfg.DATABASE_URL = "sqlite://"

        try:
            factory = db_cfg.get_session_local()
            assert factory is not None
        finally:
            db_cfg.engine = None
            db_cfg.SessionLocal = None
            db_cfg.DATABASE_URL = os.environ.get("DATABASE_URL")

    def test_caches_session_factory(self):
        import database.db_config as db_cfg

        db_cfg.engine = None
        db_cfg.SessionLocal = None
        db_cfg.DATABASE_URL = "sqlite://"

        try:
            f1 = db_cfg.get_session_local()
            f2 = db_cfg.get_session_local()
            assert f1 is f2
        finally:
            db_cfg.engine = None
            db_cfg.SessionLocal = None
            db_cfg.DATABASE_URL = os.environ.get("DATABASE_URL")


class TestGetDb:
    def test_yields_session_and_closes(self):
        import database.db_config as db_cfg

        db_cfg.engine = None
        db_cfg.SessionLocal = None
        db_cfg.DATABASE_URL = "sqlite://"

        try:
            gen = db_cfg.get_db()
            session = next(gen)
            assert session is not None
            # Exhaust the generator to trigger close
            with contextlib.suppress(StopIteration):
                next(gen)
        finally:
            db_cfg.engine = None
            db_cfg.SessionLocal = None
            db_cfg.DATABASE_URL = os.environ.get("DATABASE_URL")


class TestCheckDbConnection:
    def test_returns_true_for_valid_db(self):
        import database.db_config as db_cfg

        db_cfg.engine = None
        db_cfg.DATABASE_URL = "sqlite://"

        try:
            assert db_cfg.check_db_connection() is True
        finally:
            db_cfg.engine = None
            db_cfg.DATABASE_URL = os.environ.get("DATABASE_URL")

    def test_returns_false_for_bad_db(self):
        import database.db_config as db_cfg

        db_cfg.engine = None
        db_cfg.DATABASE_URL = "postgresql://invalid:invalid@localhost:9999/nonexistent"

        try:
            result = db_cfg.check_db_connection()
            assert result is False
        finally:
            db_cfg.engine = None
            db_cfg.DATABASE_URL = os.environ.get("DATABASE_URL")
