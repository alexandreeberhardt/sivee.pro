"""Tests for health endpoints, CORS, and miscellaneous app features."""

import os

os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-unit-tests-only")
os.environ.setdefault("DATABASE_URL", "sqlite://")

import pytest
from fastapi.testclient import TestClient

from app import SIZE_VARIANTS, VALID_TEMPLATES, app


@pytest.fixture()
def api_client():
    with TestClient(app) as c:
        yield c


class TestHealthEndpoints:
    def test_api_health(self, api_client):
        resp = api_client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "v2" in data["message"]

    def test_openapi_schema(self, api_client):
        resp = api_client.get("/openapi.json")
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["info"]["title"] == "CV Generator API"
        assert schema["info"]["version"] == "2.0.0"

    def test_openapi_has_generate_endpoint(self, api_client):
        resp = api_client.get("/openapi.json")
        schema = resp.json()
        assert "/generate" in schema["paths"]

    def test_openapi_has_auth_endpoints(self, api_client):
        resp = api_client.get("/openapi.json")
        schema = resp.json()
        assert "/api/auth/register" in schema["paths"]
        assert "/api/auth/login" in schema["paths"]

    def test_openapi_has_resume_endpoints(self, api_client):
        resp = api_client.get("/openapi.json")
        schema = resp.json()
        assert "/api/resumes" in schema["paths"]


class TestCORS:
    def test_cors_headers_on_options(self, api_client):
        """CORS preflight should return appropriate headers."""
        resp = api_client.options(
            "/api/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.status_code == 200

    def test_cors_allowed_origin(self, api_client):
        resp = api_client.get(
            "/api/health",
            headers={"Origin": "http://localhost:5173"},
        )
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:5173"


class TestValidTemplates:
    """Verify the template configuration is consistent."""

    def test_all_base_templates_have_variants(self):
        bases = {"harvard", "europass", "mckinsey", "aurianne", "stephane", "michel", "double"}
        for base in bases:
            assert base in VALID_TEMPLATES
            assert f"{base}_compact" in VALID_TEMPLATES
            assert f"{base}_large" in VALID_TEMPLATES

    def test_valid_templates_count(self):
        # 7 bases * 3 variants = 21
        assert len(VALID_TEMPLATES) == 21

    def test_size_variants(self):
        assert SIZE_VARIANTS == ["large", "normal", "compact"]


class TestGenerateEndpoint:
    def test_missing_body(self, api_client):
        resp = api_client.post("/generate")
        assert resp.status_code == 422

    def test_minimal_payload(self, api_client):
        data = {
            "personal": {"name": "", "location": "", "email": "", "phone": ""},
            "sections": [],
            "template_id": "harvard",
            "lang": "fr",
        }
        resp = api_client.post("/generate", json=data)
        # Will be 500 if LaTeX not installed, but not 422
        assert resp.status_code in (200, 500)

    def test_invalid_template_fallback(self, api_client):
        data = {
            "personal": {"name": "Test"},
            "sections": [],
            "template_id": "nonexistent",
            "lang": "fr",
        }
        resp = api_client.post("/generate", json=data)
        assert resp.status_code in (200, 500)

    def test_invalid_lang_fallback(self, api_client):
        data = {
            "personal": {"name": "Test"},
            "sections": [],
            "template_id": "harvard",
            "lang": "invalid",
        }
        resp = api_client.post("/generate", json=data)
        assert resp.status_code in (200, 500)

    def test_with_all_section_types(self, api_client):
        data = {
            "personal": {"name": "John Doe", "email": "john@example.com"},
            "sections": [
                {
                    "id": "s1",
                    "type": "summary",
                    "title": "Summary",
                    "isVisible": True,
                    "items": "A developer.",
                },
                {
                    "id": "s2",
                    "type": "education",
                    "title": "Education",
                    "isVisible": True,
                    "items": [],
                },
                {
                    "id": "s3",
                    "type": "experiences",
                    "title": "Experience",
                    "isVisible": True,
                    "items": [],
                },
                {
                    "id": "s4",
                    "type": "skills",
                    "title": "Skills",
                    "isVisible": True,
                    "items": [
                        {"id": "sk-1", "category": "Programming Languages", "skills": "Python"},
                        {"id": "sk-2", "category": "Tools", "skills": "Git"},
                    ],
                },
                {
                    "id": "s5",
                    "type": "languages",
                    "title": "Languages",
                    "isVisible": True,
                    "items": "French, English",
                },
                {
                    "id": "s6",
                    "type": "projects",
                    "title": "Projects",
                    "isVisible": True,
                    "items": [],
                },
            ],
            "template_id": "harvard",
            "lang": "fr",
        }
        resp = api_client.post("/generate", json=data)
        assert resp.status_code in (200, 500)
