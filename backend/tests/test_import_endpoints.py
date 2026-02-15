"""Tests for /import and /import-stream endpoints."""

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


class TestImportEndpoint:
    def test_rejects_non_pdf(self, api_client):
        resp = api_client.post(
            "/import",
            files={"file": ("test.txt", b"hello", "text/plain")},
        )
        assert resp.status_code == 400
        assert "PDF" in resp.json()["detail"]

    def test_rejects_no_filename(self, api_client):
        resp = api_client.post(
            "/import",
            files={"file": ("", b"content", "application/pdf")},
        )
        assert resp.status_code in (400, 422)

    def test_rejects_doc_extension(self, api_client):
        resp = api_client.post(
            "/import",
            files={"file": ("resume.docx", b"content", "application/msword")},
        )
        assert resp.status_code == 400

    def test_no_mistral_key_returns_500(self, api_client):
        """When MISTRAL_API_KEY is not set, should return 500."""
        with pytest.MonkeyPatch.context() as mp:
            mp.delenv("MISTRAL_API_KEY", raising=False)
            # Create a minimal valid PDF header
            resp = api_client.post(
                "/import",
                files={"file": ("test.pdf", b"%PDF-1.4 minimal", "application/pdf")},
            )
            assert resp.status_code == 500
            assert "Mistral" in resp.json()["detail"]

    def test_rejects_no_file(self, api_client):
        resp = api_client.post("/import")
        assert resp.status_code == 422


class TestImportStreamEndpoint:
    def test_rejects_non_pdf(self, api_client):
        resp = api_client.post(
            "/import-stream",
            files={"file": ("test.doc", b"content", "application/msword")},
        )
        assert resp.status_code == 400

    def test_rejects_no_filename(self, api_client):
        resp = api_client.post(
            "/import-stream",
            files={"file": ("", b"content", "application/pdf")},
        )
        assert resp.status_code in (400, 422)

    def test_no_mistral_key_returns_500(self, api_client):
        with pytest.MonkeyPatch.context() as mp:
            mp.delenv("MISTRAL_API_KEY", raising=False)
            resp = api_client.post(
                "/import-stream",
                files={"file": ("test.pdf", b"%PDF-1.4 minimal", "application/pdf")},
            )
            assert resp.status_code == 500
            assert "Mistral" in resp.json()["detail"]

    def test_rejects_no_file(self, api_client):
        resp = api_client.post("/import-stream")
        assert resp.status_code == 422
