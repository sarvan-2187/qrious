import os
import smtplib
import asyncio
from email.message import EmailMessage
from typing import Optional


async def send_email(to_email: str, subject: str, body: str, html_content: Optional[str] = None) -> None:
    """Sends a plain-text or HTML email through the SMTP account configured in backend/.env."""
    host = (os.getenv("SMTP_HOST") or "").strip("'\" ")
    port_str = (os.getenv("SMTP_PORT") or "587").strip("'\" ")
    port = int(port_str) if port_str.isdigit() else 587
    username = (os.getenv("SMTP_USERNAME") or "").strip("'\" ")
    password = (os.getenv("SMTP_PASSWORD") or "").strip("'\" ")
    from_email = (os.getenv("SMTP_FROM") or "").strip("'\" ") or username or "noreply@qrious.app"

    message = EmailMessage()
    message["From"] = from_email
    message["To"] = to_email
    message["Subject"] = subject
    message.set_content(body)

    if html_content:
        message.add_alternative(html_content, subtype="html")

    def _send():
        if not host or not username:
            print(f"[email_service DEV LOG] Mock sent email to {to_email} | Subject: {subject}", flush=True)
            return
        with smtplib.SMTP(host, port, timeout=10) as smtp:
            smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(message)

    await asyncio.to_thread(_send)
