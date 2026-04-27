# -----------------------------------------------------------------------------
# routers/contact.py - Contact Form Endpoint
# -----------------------------------------------------------------------------
#
# Simple public endpoint that receives contact form submissions from the
# landing page and sends an email notification to the SupportOS team.
#
# If SMTP is configured (SMTP_HOST, SMTP_USER, SMTP_PASS env vars), it sends
# a real email. Otherwise, it logs the submission to stdout.
# -----------------------------------------------------------------------------

import os
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr

from core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()


class ContactForm(BaseModel):
    name: str
    email: EmailStr
    message: str


@router.post("/submit")
async def submit_contact(form: ContactForm):
    """
    Receive a contact form submission from the landing page.
    Sends an email if SMTP is configured, otherwise logs the message.
    """
    timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    # Always log the submission
    logger.info(
        f"📬 Contact form submission:\n"
        f"   Name:    {form.name}\n"
        f"   Email:   {form.email}\n"
        f"   Message: {form.message}\n"
        f"   Time:    {timestamp}"
    )

    # Try sending email if SMTP is configured
    logger.warning(f"SMTP_USER='{settings.SMTP_USER}', SMTP_PASS set={'yes' if settings.SMTP_PASS else 'no'}")
    if settings.SMTP_USER and settings.SMTP_PASS:
        try:
            msg = MIMEMultipart()
            msg["From"] = settings.SMTP_USER
            msg["To"] = settings.CONTACT_EMAIL
            msg["Subject"] = f"[SupportOS] New Contact: {form.name}"
            msg["Reply-To"] = form.email

            body = f"""
New contact form submission from SupportOS website:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Name:    {form.name}
Email:   {form.email}
Time:    {timestamp}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Message:
{form.message}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This email was sent from the SupportOS contact form.
Reply directly to this email to respond to {form.name}.
"""
            msg.attach(MIMEText(body, "plain"))

            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
                server.send_message(msg)

            logger.info(f"✅ Contact email sent to {settings.CONTACT_EMAIL}")
            return {"status": "sent", "message": "Thank you! We'll get back to you soon."}

        except Exception as e:
            logger.error(f"❌ Failed to send contact email: {e}")
            # Don't fail the request - the message is still logged
            return {"status": "logged", "message": "Thank you! Your message has been received."}
    else:
        logger.warning("⚠️  SMTP not configured - contact form submission logged only")
        return {"status": "logged", "message": "Thank you! Your message has been received."}
