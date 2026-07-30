import asyncio
from unittest.mock import MagicMock, patch

from services import email_service


def test_send_email_uses_smtp_credentials_from_env(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "bot@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.delenv("SMTP_FROM", raising=False)

    mock_smtp_instance = MagicMock()
    mock_smtp_instance.__enter__.return_value = mock_smtp_instance
    with patch("smtplib.SMTP", return_value=mock_smtp_instance) as mock_smtp_cls:
        asyncio.run(email_service.send_email("student@example.com", "Job completed", "Your job finished."))

    mock_smtp_cls.assert_called_once_with("smtp.example.com", 587, timeout=10)
    mock_smtp_instance.starttls.assert_called_once()
    mock_smtp_instance.login.assert_called_once_with("bot@example.com", "secret")
    sent_message = mock_smtp_instance.send_message.call_args[0][0]
    assert sent_message["To"] == "student@example.com"
    assert sent_message["From"] == "bot@example.com"
    assert sent_message["Subject"] == "Job completed"
    assert sent_message.get_content().strip() == "Your job finished."


def test_send_email_uses_explicit_from_override(monkeypatch):
    monkeypatch.setenv("SMTP_HOST", "smtp.example.com")
    monkeypatch.setenv("SMTP_PORT", "587")
    monkeypatch.setenv("SMTP_USERNAME", "bot@example.com")
    monkeypatch.setenv("SMTP_PASSWORD", "secret")
    monkeypatch.setenv("SMTP_FROM", "notifications@example.com")

    mock_smtp_instance = MagicMock()
    mock_smtp_instance.__enter__.return_value = mock_smtp_instance
    with patch("smtplib.SMTP", return_value=mock_smtp_instance):
        asyncio.run(email_service.send_email("student@example.com", "subj", "body"))

    sent_message = mock_smtp_instance.send_message.call_args[0][0]
    assert sent_message["From"] == "notifications@example.com"
