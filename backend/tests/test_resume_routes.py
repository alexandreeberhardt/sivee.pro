"""Integration tests for resume CRUD API routes."""

from conftest import (
    auth_header,
    create_authenticated_user,
)

SAMPLE_JSON = {
    "personal": {
        "name": "Alice",
        "title": "Dev",
        "location": "",
        "email": "",
        "phone": "",
        "links": [],
    },
    "sections": [],
    "template_id": "harvard",
}


class TestCreateResume:
    def test_create_resume(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/resumes",
            json={
                "name": "Mon CV",
                "json_content": SAMPLE_JSON,
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Mon CV"
        assert data["json_content"] == SAMPLE_JSON

    def test_create_resume_without_content(self, client):
        token = create_authenticated_user(client)
        resp = client.post(
            "/api/resumes",
            json={
                "name": "CV vide",
            },
            headers=auth_header(token),
        )
        assert resp.status_code == 201
        assert resp.json()["json_content"] is None

    def test_create_resume_unauthenticated(self, client):
        resp = client.post("/api/resumes", json={"name": "test"})
        assert resp.status_code == 401

    def test_guest_limited_to_1_resume(self, client):
        token = client.post("/api/auth/guest").json()["access_token"]
        headers = auth_header(token)
        resp = client.post("/api/resumes", json={"name": "CV 0"}, headers=headers)
        assert resp.status_code == 201
        # 2nd should fail
        resp = client.post("/api/resumes", json={"name": "CV 1"}, headers=headers)
        assert resp.status_code == 429


class TestListResumes:
    def test_list_empty(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/resumes", headers=auth_header(token))
        assert resp.status_code == 200
        data = resp.json()
        assert data["resumes"] == []
        assert data["total"] == 0

    def test_list_with_resumes(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)
        client.post("/api/resumes", json={"name": "CV 1"}, headers=headers)
        client.post("/api/resumes", json={"name": "CV 2"}, headers=headers)
        resp = client.get("/api/resumes", headers=headers)
        assert resp.json()["total"] == 2

    def test_list_only_own_resumes(self, client):
        token_a = create_authenticated_user(client, email="a@example.com")
        token_b = create_authenticated_user(client, email="b@example.com")
        client.post("/api/resumes", json={"name": "CV A"}, headers=auth_header(token_a))
        client.post("/api/resumes", json={"name": "CV B"}, headers=auth_header(token_b))
        resp = client.get("/api/resumes", headers=auth_header(token_a))
        assert resp.json()["total"] == 1
        assert resp.json()["resumes"][0]["name"] == "CV A"


class TestGetResume:
    def test_get_own_resume(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)
        resume_id = client.post(
            "/api/resumes",
            json={
                "name": "Mon CV",
                "json_content": SAMPLE_JSON,
            },
            headers=headers,
        ).json()["id"]
        resp = client.get(f"/api/resumes/{resume_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Mon CV"

    def test_get_other_users_resume_returns_404(self, client):
        token_a = create_authenticated_user(client, email="a@example.com")
        token_b = create_authenticated_user(client, email="b@example.com")
        resume_id = client.post(
            "/api/resumes", json={"name": "CV A"}, headers=auth_header(token_a)
        ).json()["id"]
        resp = client.get(f"/api/resumes/{resume_id}", headers=auth_header(token_b))
        assert resp.status_code == 404

    def test_get_nonexistent_resume(self, client):
        token = create_authenticated_user(client)
        resp = client.get("/api/resumes/9999", headers=auth_header(token))
        assert resp.status_code == 404


class TestUpdateResume:
    def test_update_name(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)
        resume_id = client.post("/api/resumes", json={"name": "Old"}, headers=headers).json()["id"]
        resp = client.put(f"/api/resumes/{resume_id}", json={"name": "New"}, headers=headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "New"

    def test_update_content(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)
        resume_id = client.post("/api/resumes", json={"name": "CV"}, headers=headers).json()["id"]
        resp = client.put(
            f"/api/resumes/{resume_id}",
            json={
                "json_content": SAMPLE_JSON,
            },
            headers=headers,
        )
        assert resp.status_code == 200
        assert resp.json()["json_content"]["personal"]["name"] == "Alice"

    def test_update_other_users_resume_returns_404(self, client):
        token_a = create_authenticated_user(client, email="a@example.com")
        token_b = create_authenticated_user(client, email="b@example.com")
        resume_id = client.post(
            "/api/resumes", json={"name": "CV A"}, headers=auth_header(token_a)
        ).json()["id"]
        resp = client.put(
            f"/api/resumes/{resume_id}", json={"name": "Hacked"}, headers=auth_header(token_b)
        )
        assert resp.status_code == 404


class TestDeleteResume:
    def test_delete_resume(self, client):
        token = create_authenticated_user(client)
        headers = auth_header(token)
        resume_id = client.post("/api/resumes", json={"name": "CV"}, headers=headers).json()["id"]
        resp = client.delete(f"/api/resumes/{resume_id}", headers=headers)
        assert resp.status_code == 204
        # Verify it's gone
        resp = client.get(f"/api/resumes/{resume_id}", headers=headers)
        assert resp.status_code == 404

    def test_delete_other_users_resume_returns_404(self, client):
        token_a = create_authenticated_user(client, email="a@example.com")
        token_b = create_authenticated_user(client, email="b@example.com")
        resume_id = client.post(
            "/api/resumes", json={"name": "CV A"}, headers=auth_header(token_a)
        ).json()["id"]
        resp = client.delete(f"/api/resumes/{resume_id}", headers=auth_header(token_b))
        assert resp.status_code == 404

    def test_delete_nonexistent_resume(self, client):
        token = create_authenticated_user(client)
        resp = client.delete("/api/resumes/9999", headers=auth_header(token))
        assert resp.status_code == 404
