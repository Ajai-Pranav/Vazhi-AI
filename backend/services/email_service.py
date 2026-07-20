"""
email_service.py
────────────────
Async-safe SMTP email dispatcher for VazhiAI account recovery.

Configuration (all loaded from .env):
    SMTP_HOST   — e.g. smtp.gmail.com
    SMTP_PORT   — 587 (TLS/STARTTLS) or 465 (SSL)
    SMTP_USER   — sender account username
    SMTP_PASS   — App Password (NOT your Gmail password)
    SMTP_FROM   — displayed "From" address, e.g. ajaibusiness1@gmail.com

Gmail note:
    Enable "App Passwords" in your Google Account → Security → 2-Step Verification.
    Use the generated 16-char App Password as SMTP_PASS.
"""

import os
import smtplib
import logging
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("VazhiAI.email")

# ── SMTP configuration ────────────────────────────────────────────────────────

SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
SMTP_FROM = os.environ.get("SMTP_FROM", "ajaibusiness1@gmail.com")


# ── Email templates ───────────────────────────────────────────────────────────

def _build_otp_email_html(otp_code: str) -> str:
    """Generate a clean, branded HTML email body for OTP delivery."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VazhiAI Password Reset</title>
</head>
<body style="margin:0;padding:0;background:#f7f6f4;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f7f6f4;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:16px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1a1a1a;padding:28px 36px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">
                Path<span style="color:#c05a2e;">AI</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px;">
              <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111111;">
                Password Reset Request
              </h1>
              <p style="margin:0 0 28px;font-size:14px;color:#555555;line-height:1.6;">
                We received a request to reset your VazhiAI account password.
                Use the OTP below to proceed. It is valid for <strong>10 minutes</strong>.
              </p>

              <!-- OTP Box -->
              <div style="background:#f0ede8;border:1.5px dashed #c05a2e;border-radius:12px;
                          padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#888;
                           text-transform:uppercase;letter-spacing:2px;">
                  Your One-Time Password
                </p>
                <span style="font-size:42px;font-weight:800;color:#c05a2e;
                             letter-spacing:10px;font-family:monospace;">
                  {otp_code}
                </span>
              </div>

              <!-- Security notice -->
              <div style="background:#fff8f5;border-left:4px solid #c05a2e;
                          border-radius:0 8px 8px 0;padding:14px 16px;margin-bottom:24px;">
                <p style="margin:0;font-size:12px;color:#666;line-height:1.6;">
                  🔒 <strong>Security reminder:</strong> This OTP expires in 10 minutes
                  and can only be used once. If you didn't request this, you can safely ignore
                  this email — your password won't change.
                </p>
              </div>

              <p style="margin:0;font-size:12px;color:#aaa;">
                Do not share this OTP with anyone. VazhiAI will never ask for it.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7f6f4;padding:18px 36px;border-top:1px solid #ebebeb;">
              <p style="margin:0;font-size:11px;color:#aaa;text-align:center;">
                © 2026 VazhiAI · AI-powered career guidance
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


# ── Core send function ────────────────────────────────────────────────────────

def _send_smtp(to_email: str, subject: str, html_body: str) -> None:
    """
    Establish SMTP connection and dispatch the email.
    This is the blocking I/O call — always run via _dispatch_in_thread.
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"VazhiAI <{SMTP_FROM}>"
    msg["To"] = to_email

    # Attach both plain-text fallback and rich HTML
    plain = (
        f"VazhiAI Password Reset\n\n"
        f"Your OTP is: {html_body[-12:-2].strip() if 'monospace' not in html_body else ''}\n"
        f"(Copy this from the HTML email for best results)\n\n"
        f"This OTP expires in 10 minutes and can only be used once."
    )
    msg.attach(MIMEText(plain, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    use_ssl = SMTP_PORT == 465

    try:
        if use_ssl:
            # Port 465 — direct SSL
            with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_FROM, [to_email], msg.as_string())
        else:
            # Port 587 — STARTTLS
            with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(SMTP_FROM, [to_email], msg.as_string())

        logger.info("EMAIL_SENT | to=%s | subject=%s", to_email, subject)
    except smtplib.SMTPAuthenticationError:
        logger.error("EMAIL_AUTH_FAILED | to=%s — Check SMTP_USER and SMTP_PASS (use App Password for Gmail)", to_email)
        raise
    except smtplib.SMTPException as exc:
        logger.error("EMAIL_SMTP_ERROR | to=%s | error=%s", to_email, str(exc))
        raise
    except Exception as exc:
        logger.error("EMAIL_UNEXPECTED_ERROR | to=%s | error=%s", to_email, str(exc))
        raise


def _dispatch_in_thread(to_email: str, subject: str, html_body: str) -> None:
    """
    Fire-and-forget email dispatch in a daemon thread so the API
    response is never delayed by SMTP I/O.
    """
    t = threading.Thread(
        target=_send_smtp,
        args=(to_email, subject, html_body),
        daemon=True,
    )
    t.start()


# ── Public interface ──────────────────────────────────────────────────────────

def send_otp_email(to_email: str, otp_code: str) -> None:
    """
    Send a password-reset OTP email to the specified recipient.
    Non-blocking — dispatched in a background thread.

    Args:
        to_email:  The recipient's email address.
        otp_code:  The 8-digit OTP to embed in the email.
    """
    if not SMTP_USER or not SMTP_PASS:
        logger.warning(
            "EMAIL_SKIPPED | SMTP_USER/SMTP_PASS not set — "
            "OTP %s for %s NOT emailed (dev mode)", otp_code, to_email
        )
        return

    subject = "🔐 Your VazhiAI Password Reset OTP"
    html_body = _build_otp_email_html(otp_code)
    _dispatch_in_thread(to_email, subject, html_body)
    logger.info("EMAIL_QUEUED | to=%s", to_email)
