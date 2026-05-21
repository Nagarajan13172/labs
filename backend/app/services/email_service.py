"""Transactional email (verification + password reset) via fastapi-mail."""

from __future__ import annotations

from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger("email")

_conf = ConnectionConfig(
    MAIL_USERNAME=settings.mail_username,
    MAIL_PASSWORD=settings.mail_password,
    MAIL_FROM=settings.mail_from,
    MAIL_FROM_NAME=settings.mail_from_name,
    MAIL_PORT=settings.mail_port,
    MAIL_SERVER=settings.mail_server,
    MAIL_STARTTLS=settings.mail_starttls,
    MAIL_SSL_TLS=settings.mail_ssl_tls,
    USE_CREDENTIALS=settings.mail_use_credentials,
    VALIDATE_CERTS=settings.mail_validate_certs,
)

_fastmail = FastMail(_conf)


async def _send(subject: str, recipient: str, html: str) -> None:
    message = MessageSchema(
        subject=subject,
        recipients=[recipient],
        body=html,
        subtype=MessageType.html,
    )
    await _fastmail.send_message(message)
    log.info("email.sent", subject=subject, to=recipient)


async def send_verification_email(recipient: str, token: str) -> None:
    link = f"{settings.frontend_url}/auth/verify?token={token}"
    html = (
        f"<p>Welcome to {settings.mail_from_name}!</p>"
        f"<p>Confirm your email: <a href='{link}'>Verify account</a></p>"
    )
    await _send("Verify your account", recipient, html)


async def send_password_reset_email(recipient: str, token: str) -> None:
    link = f"{settings.frontend_url}/auth/reset?token={token}"
    html = (
        "<p>We received a request to reset your password.</p>"
        f"<p><a href='{link}'>Reset password</a> (link expires shortly).</p>"
        "<p>If you didn't request this, you can ignore this email.</p>"
    )
    await _send("Reset your password", recipient, html)
