"""Tests for the feedback endpoint and bonus limits."""

from conftest import VALID_PASSWORD, auth_header, create_authenticated_user, register_user
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from database.models import User

# Minimal valid payload (only ease_rating is required)
VALID_FEEDBACK = {"ease_rating": 7}

FULL_FEEDBACK = {
    "profile": "student",
    "target_sector": "Tech",
    "source": "search",
    "ease_rating": 8,
    "time_spent": "15to30",
    "obstacles": "Template choice",
    "alternative": "canva",
    "suggestions": "More templates",
    "nps": 9,
    "future_help": "Cover letter support",
}


class TestSubmitFeedback:
    """Tests for POST /api/auth/feedback."""

    def test_guest_cannot_submit(self, client: TestClient) -> None:
        """Guest accounts should be rejected with 400."""
        resp = client.post("/api/auth/guest")
        assert resp.status_code == 201
        guest_token = resp.json()["access_token"]

        resp = client.post(
            "/api/auth/feedback",
            json=VALID_FEEDBACK,
            headers=auth_header(guest_token),
        )
        assert resp.status_code == 400
        assert "Guest" in resp.json()["detail"]

    def test_registered_user_submits_and_gets_bonuses(
        self, client: TestClient, db: Session
    ) -> None:
        """Registered user submits feedback and receives bonus limits."""
        token = create_authenticated_user(client)

        resp = client.post(
            "/api/auth/feedback",
            json=FULL_FEEDBACK,
            headers=auth_header(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["bonus_resumes"] == 3
        assert data["bonus_downloads"] == 5
        assert data["message"] == "Thank you for your feedback!"

        # Verify user was updated in DB
        user = db.query(User).filter(User.email == "test@example.com").first()
        assert user is not None
        assert user.feedback_completed_at is not None
        assert user.bonus_resumes == 3
        assert user.bonus_downloads == 5

    def test_duplicate_submission_returns_409(self, client: TestClient) -> None:
        """Second feedback submission should return 409 Conflict."""
        token = create_authenticated_user(client)

        # First submission
        resp = client.post(
            "/api/auth/feedback",
            json=VALID_FEEDBACK,
            headers=auth_header(token),
        )
        assert resp.status_code == 200

        # Second submission
        resp = client.post(
            "/api/auth/feedback",
            json=VALID_FEEDBACK,
            headers=auth_header(token),
        )
        assert resp.status_code == 409
        assert "already submitted" in resp.json()["detail"]

    def test_invalid_ease_rating_returns_422(self, client: TestClient) -> None:
        """ease_rating outside 1-10 should return 422."""
        token = create_authenticated_user(client)

        resp = client.post(
            "/api/auth/feedback",
            json={"ease_rating": 0},
            headers=auth_header(token),
        )
        assert resp.status_code == 422

        resp = client.post(
            "/api/auth/feedback",
            json={"ease_rating": 11},
            headers=auth_header(token),
        )
        assert resp.status_code == 422

    def test_invalid_nps_returns_422(self, client: TestClient) -> None:
        """NPS outside 0-10 should return 422."""
        token = create_authenticated_user(client)

        resp = client.post(
            "/api/auth/feedback",
            json={"ease_rating": 5, "nps": -1},
            headers=auth_header(token),
        )
        assert resp.status_code == 422

        resp = client.post(
            "/api/auth/feedback",
            json={"ease_rating": 5, "nps": 11},
            headers=auth_header(token),
        )
        assert resp.status_code == 422

    def test_unauthenticated_returns_401(self, client: TestClient) -> None:
        """Unauthenticated request should return 401."""
        resp = client.post(
            "/api/auth/feedback",
            json=VALID_FEEDBACK,
        )
        assert resp.status_code == 401


class TestBonusLimits:
    """Tests that bonus limits are applied to resume creation."""

    def test_bonus_allows_extra_resumes(self, client: TestClient, db: Session) -> None:
        """User with bonus can create more than the base 3 resumes."""
        token = create_authenticated_user(client)

        # Submit feedback to get +3 bonus resumes (total: 3 base + 3 bonus = 6)
        resp = client.post(
            "/api/auth/feedback",
            json=VALID_FEEDBACK,
            headers=auth_header(token),
        )
        assert resp.status_code == 200

        # Create 6 resumes (base 3 + 3 bonus)
        for i in range(6):
            resp = client.post(
                "/api/resumes",
                json={"name": f"Resume {i + 1}"},
                headers=auth_header(token),
            )
            assert resp.status_code == 201, f"Failed creating resume {i + 1}: {resp.text}"

        # 7th should fail
        resp = client.post(
            "/api/resumes",
            json={"name": "Resume 7"},
            headers=auth_header(token),
        )
        assert resp.status_code == 429

    def test_feedback_completed_in_jwt(self, client: TestClient) -> None:
        """After submitting feedback, the login JWT should include feedback_completed=true."""
        email = "jwt-test@example.com"
        register_user(client, email=email)

        # Login before feedback
        resp = client.post(
            "/api/auth/login",
            data={"username": email, "password": VALID_PASSWORD},
        )
        token_before = resp.json()["access_token"]

        import base64  # noqa: E402
        import json  # noqa: E402

        payload_before = json.loads(base64.b64decode(token_before.split(".")[1] + "=="))
        assert payload_before.get("feedback_completed") is False

        # Submit feedback
        resp = client.post(
            "/api/auth/feedback",
            json=VALID_FEEDBACK,
            headers=auth_header(token_before),
        )
        assert resp.status_code == 200

        # Login after feedback
        resp = client.post(
            "/api/auth/login",
            data={"username": email, "password": VALID_PASSWORD},
        )
        token_after = resp.json()["access_token"]
        payload_after = json.loads(base64.b64decode(token_after.split(".")[1] + "=="))
        assert payload_after.get("feedback_completed") is True
