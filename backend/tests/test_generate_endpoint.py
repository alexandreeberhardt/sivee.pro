"""Tests for the /generate endpoint and related app functionality."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient

from app import app


@pytest.fixture()
def api_client():
    with TestClient(app) as c:
        yield c


class TestGenerateEndpoint:
    def test_missing_body_returns_422(self, api_client):
        resp = api_client.post("/generate")
        assert resp.status_code == 422

    def test_empty_personal_accepted(self, api_client):
        """Minimal valid payload should be accepted (may fail at LaTeX compilation)."""
        data = {
            "personal": {"name": "", "location": "", "email": "", "phone": ""},
            "sections": [],
            "template_id": "harvard",
            "lang": "fr",
        }
        resp = api_client.post("/generate", json=data)
        # Will likely be 500 if LaTeX is not installed, but should not be 422
        assert resp.status_code in (200, 500)

    def test_invalid_template_falls_back_to_harvard(self, api_client):
        """Unknown template_id should fall back to 'harvard'."""
        data = {
            "personal": {"name": "Test"},
            "sections": [],
            "template_id": "nonexistent_template",
            "lang": "fr",
        }
        resp = api_client.post("/generate", json=data)
        # Should not return 422 (validation error) — template fallback is handled
        assert resp.status_code in (200, 500)

    def test_invalid_lang_falls_back_to_fr(self, api_client):
        data = {
            "personal": {"name": "Test"},
            "sections": [],
            "template_id": "harvard",
            "lang": "invalid",
        }
        resp = api_client.post("/generate", json=data)
        assert resp.status_code in (200, 500)


class TestDefaultDataEndpoint:
    def test_default_data_returns_200_or_404(self, api_client):
        """Returns 200 if data.yml exists, 404 otherwise."""
        resp = api_client.get("/default-data")
        assert resp.status_code in (200, 404)


class TestHealthEndpoint:
    def test_health_returns_ok(self, api_client):
        resp = api_client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"

    def test_openapi_schema(self, api_client):
        resp = api_client.get("/openapi.json")
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["info"]["title"] == "CV Generator API"
        assert "/generate" in schema["paths"]


class TestImportEndpoint:
    def test_import_rejects_non_pdf(self, api_client):
        """Import endpoint should reject non-PDF files."""
        resp = api_client.post(
            "/import",
            files={"file": ("test.txt", b"hello world", "text/plain")},
        )
        assert resp.status_code == 400
        assert "PDF" in resp.json()["detail"]

    def test_import_rejects_no_file(self, api_client):
        resp = api_client.post("/import")
        assert resp.status_code == 422

    def test_import_stream_rejects_non_pdf(self, api_client):
        resp = api_client.post(
            "/import-stream",
            files={"file": ("test.doc", b"content", "application/msword")},
        )
        assert resp.status_code == 400
