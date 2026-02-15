"""Unit tests for the core email module."""

from unittest.mock import MagicMock, patch

from core.email import send_email, send_password_reset_email, send_welcome_email


class TestSendEmail:
    """Tests for the low-level send_email function."""

    @patch("core.email.ZEPTOMAIL_API_KEY", "")
    def test_skip_when_api_key_not_configured(self):
        """Silently skips sending when ZEPTOMAIL_API_KEY is empty."""
        with patch("core.email.httpx.post") as mock_post:
            send_email("user@example.com", "Subject", "<p>body</p>")
        mock_post.assert_not_called()

    @patch("core.email.ZEPTOMAIL_API_KEY", "test-api-key")
    @patch("core.email.httpx.post")
    def test_sends_email_with_correct_payload(self, mock_post):
        """Sends correct payload to ZeptoMail API."""
        mock_post.return_value = MagicMock(status_code=200)
        mock_post.return_value.raise_for_status = MagicMock()

        send_email("user@example.com", "Hello", "<p>World</p>")

        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args
        payload = call_kwargs.kwargs.get("json") or call_kwargs[1].get("json")

        assert payload["to"][0]["email_address"]["address"] == "user@example.com"
        assert payload["subject"] == "Hello"
        assert payload["htmlbody"] == "<p>World</p>"

    @patch("core.email.ZEPTOMAIL_API_KEY", "test-api-key")
    @patch("core.email.httpx.post")
    def test_sends_authorization_header(self, mock_post):
        """Includes the API key in the Authorization header."""
        mock_post.return_value = MagicMock(status_code=200)
        mock_post.return_value.raise_for_status = MagicMock()

        send_email("a@b.com", "S", "<p>B</p>")

        headers = mock_post.call_args.kwargs.get("headers") or mock_post.call_args[1].get("headers")
        assert headers["authorization"] == "test-api-key"

    @patch("core.email.ZEPTOMAIL_API_KEY", "test-api-key")
    @patch("core.email.httpx.post", side_effect=Exception("Network error"))
    def test_does_not_raise_on_send_failure(self, mock_post):
        """Logs the error but does not propagate exceptions."""
        send_email("user@example.com", "Subj", "<p>body</p>")  # should not raise


class TestSendWelcomeEmail:
    """Tests for send_welcome_email."""

    @patch("core.email.send_email")
    def test_calls_send_email_with_correct_args(self, mock_send):
        send_welcome_email("new@example.com")

        mock_send.assert_called_once()
        args = mock_send.call_args[0]
        assert args[0] == "new@example.com"
        assert "Bienvenue" in args[1]
        assert "sivee.pro/dashboard" in args[2]


class TestSendPasswordResetEmail:
    """Tests for send_password_reset_email."""

    @patch("core.email.send_email")
    def test_calls_send_email_with_correct_args(self, mock_send):
        send_password_reset_email("user@example.com", "test-token-abc")

        mock_send.assert_called_once()
        args = mock_send.call_args[0]
        assert args[0] == "user@example.com"
        assert "mot de passe" in args[1].lower()
        assert "test-token-abc" in args[2]
        assert "sivee.pro/reset-password" in args[2]

    @patch("core.email.send_email")
    def test_reset_url_contains_token(self, mock_send):
        send_password_reset_email("u@e.com", "my-jwt-token")

        html_body = mock_send.call_args[0][2]
        assert "sivee.pro/reset-password?token=my-jwt-token" in html_body

    @patch("core.email.send_email")
    def test_mentions_30_minute_expiry(self, mock_send):
        send_password_reset_email("u@e.com", "tok")

        html_body = mock_send.call_args[0][2]
        assert "30 minutes" in html_body
