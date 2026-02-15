"""Email sending module for Sivee.pro using ZeptoMail transactional API."""

# ruff: noqa: E501

import logging
import os

import httpx

logger = logging.getLogger(__name__)

ZEPTOMAIL_API_URL = "https://api.zeptomail.ca/v1.1/email"
ZEPTOMAIL_API_KEY = os.environ.get("ZEPTOMAIL_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "noreply@sivee.pro")


def send_email(to: str, subject: str, html_body: str) -> None:
    """Send an email via ZeptoMail transactional API.

    If the API key is not configured, logs a warning and returns silently.
    """
    if not ZEPTOMAIL_API_KEY:
        logger.warning("ZEPTOMAIL_API_KEY not configured — skipping email to %s", to)
        return

    payload = {
        "from": {"address": EMAIL_FROM},
        "to": [{"email_address": {"address": to}}],
        "subject": subject,
        "htmlbody": html_body,
    }
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": ZEPTOMAIL_API_KEY,
    }

    try:
        response = httpx.post(ZEPTOMAIL_API_URL, json=payload, headers=headers, timeout=10)
        response.raise_for_status()
        logger.info("Email sent to %s", to)
    except Exception:
        logger.exception("Failed to send email to %s", to)


def send_welcome_email(email: str) -> None:
    """Send a welcome email to a newly registered user."""
    subject = "Bienvenue sur Sivee.pro !"

    # fmt: off
    html_body = """\
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1e293b;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Sivee.pro</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">Bienvenue !</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:1.6;">
              Votre compte a bien &eacute;t&eacute; cr&eacute;&eacute;. Vous pouvez maintenant cr&eacute;er et personnaliser
              vos CV professionnels en quelques minutes.
            </p>
            <p style="margin:0 0 32px;color:#475569;font-size:16px;line-height:1.6;">
              Commencez d&egrave;s maintenant en acc&eacute;dant &agrave; votre tableau de bord :
            </p>
            <!-- CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr><td align="center" style="background-color:#2563eb;border-radius:6px;">
                <a href="https://sivee.pro/dashboard"
                   style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                  Acc&eacute;der &agrave; mon tableau de bord
                </a>
              </td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;background-color:#f8fafc;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:13px;">
              Sivee.pro &mdash; Cr&eacute;ez des CV professionnels facilement.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    # fmt: on
    send_email(email, subject, html_body)


def send_password_reset_email(email: str, token: str) -> None:
    """Send a password reset email with a link containing the reset token."""
    subject = "Réinitialisation de votre mot de passe - Sivee.pro"
    reset_url = f"https://sivee.pro/reset-password?token={token}"

    # fmt: off
    html_body = f"""\
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:100%;">
        <!-- Header -->
        <tr>
          <td style="background-color:#1e293b;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;">Sivee.pro</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <h2 style="margin:0 0 16px;color:#1e293b;font-size:22px;">R&eacute;initialisation du mot de passe</h2>
            <p style="margin:0 0 16px;color:#475569;font-size:16px;line-height:1.6;">
              Vous avez demand&eacute; la r&eacute;initialisation de votre mot de passe sur Sivee.pro.
            </p>
            <p style="margin:0 0 32px;color:#475569;font-size:16px;line-height:1.6;">
              Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe. Ce lien est valable <strong>30 minutes</strong>.
            </p>
            <!-- CTA -->
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr><td align="center" style="background-color:#2563eb;border-radius:6px;">
                <a href="{reset_url}"
                   style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">
                  R&eacute;initialiser mon mot de passe
                </a>
              </td></tr>
            </table>
            <p style="margin:32px 0 0;color:#94a3b8;font-size:14px;line-height:1.6;">
              Si vous n'avez pas demand&eacute; cette r&eacute;initialisation, ignorez cet email.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px;background-color:#f8fafc;text-align:center;">
            <p style="margin:0;color:#94a3b8;font-size:13px;">
              Sivee.pro &mdash; Cr&eacute;ez des CV professionnels facilement.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""
    # fmt: on
    send_email(email, subject, html_body)
