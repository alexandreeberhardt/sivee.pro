"""Smoke tests for the FastAPI application."""

from fastapi.testclient import TestClient

from app import app

client = TestClient(app)


def test_app_starts_and_serves_openapi():
    """The app boots and the OpenAPI schema is available."""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    schema = response.json()
    assert schema["info"]["title"] == "CV Generator API"


def test_generate_rejects_empty_body():
    """POST /generate without a body returns 422."""
    response = client.post("/generate")
    assert response.status_code == 422
