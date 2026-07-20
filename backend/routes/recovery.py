"""
routes/recovery.py
──────────────────
Account recovery endpoints for VazhiAI:

  POST /auth/forgot-password   — Generate & email OTP
  POST /auth/verify-otp        — Validate OTP (marks verified_at)
  POST /auth/reset-password    — Hash & save new password

Security measures implemented:
  ✓ IP-based rate limiting via slowapi
  ✓ OTP expires in 10 minutes
  ✓ OTP single-use (is_used flag)
  ✓ Brute-force lockout after 5 failed attempts
  ✓ All prior OTPs invalidated on new request
  ✓ Timing-safe responses (no user enumeration)
  ✓ reset-password requires OTP verified within last 5 minutes
  ✓ Parameterised queries via SQLAlchemy ORM
  ✓ Structured security logging
"""

import os
import logging
import secrets
import time
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

import db_models
from database import get_db
from models.schemas import ForgotPasswordRequest, VerifyOTPRequest, ResetPasswordRequest
from services.auth_service import hash_password          # reuse bcrypt hashing
from services.email_service import send_otp_email
from limiter import limiter

# ── Logger setup ──────────────────────────────────────────────────────────────

logger = logging.getLogger("VazhiAI.recovery")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

# ── Constants ──────────────────────────────────────────────────────────────────

OTP_EXPIRE_MINUTES = 10           # OTP lifetime
MAX_OTP_ATTEMPTS = 5              # Brute-force lockout threshold
VERIFY_WINDOW_MINUTES = 5         # Window after OTP verified to call reset-password

router = APIRouter(prefix="/auth", tags=["account-recovery"])


# ── Helpers ────────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Generate a cryptographically secure 8-digit numeric OTP."""
    return str(secrets.randbelow(90_000_000) + 10_000_000)  # always 8 digits


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _get_user_by_email(db: Session, email: str) -> db_models.User | None:
    return (
        db.query(db_models.User)
        .filter(db_models.User.email == email.strip().lower())
        .first()
    )


def _invalidate_previous_otps(db: Session, user_id: str) -> None:
    """Mark all existing active OTPs for this user as used."""
    db.query(db_models.PasswordResetOTP).filter(
        db_models.PasswordResetOTP.user_id == user_id,
        db_models.PasswordResetOTP.is_used == False,
    ).update({"is_used": True})
    db.flush()


def _get_active_otp(
    db: Session, user_id: str, otp_code: str
) -> db_models.PasswordResetOTP | None:
    """Fetch an unexpired, unused OTP record matching user + code."""
    return (
        db.query(db_models.PasswordResetOTP)
        .filter(
            db_models.PasswordResetOTP.user_id == user_id,
            db_models.PasswordResetOTP.otp_code == otp_code,
            db_models.PasswordResetOTP.is_used == False,
            db_models.PasswordResetOTP.expires_at > _now_utc(),
        )
        .first()
    )


# ── Endpoint: POST /auth/forgot-password ──────────────────────────────────────

@router.post("/forgot-password")
@limiter.limit("3/15minutes")          # max 3 OTP requests per IP per 15 min
def forgot_password(
    request: Request,                  # required by slowapi
    body: ForgotPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Accept an email, generate an 8-digit OTP, save it to PostgreSQL,
    and email it to the user.

    Security: always returns the same generic response whether the email
    is registered or not (prevents user enumeration / timing attacks).
    """
    email = body.email.strip().lower()
    user = _get_user_by_email(db, email)

    if not user:
        # Perform a dummy bcrypt hash to equalise response time and prevent
        # timing-based user enumeration attacks.
        hash_password("dummy_timing_equaliser_VazhiAI")
        logger.warning(
            "OTP_REQUEST_UNKNOWN_EMAIL | ip=%s | email=%s",
            request.client.host, email,
        )
        # Return success response — identical to the real case
        return {
            "message": "If this email is registered, a secure OTP has been sent."
        }

    # Invalidate any previously active OTPs for this user
    _invalidate_previous_otps(db, user.id)

    # Generate new OTP and expiry
    otp_code = _generate_otp()
    expires_at = _now_utc() + timedelta(minutes=OTP_EXPIRE_MINUTES)

    otp_record = db_models.PasswordResetOTP(
        user_id=user.id,
        otp_code=otp_code,
        expires_at=expires_at,
        is_used=False,
        attempts_count=0,
    )
    db.add(otp_record)
    db.commit()

    # Dispatch email in background thread (non-blocking)
    send_otp_email(to_email=email, otp_code=otp_code)

    logger.info(
        "OTP_GENERATED | user_id=%s | ip=%s | expires_at=%s",
        user.id, request.client.host, expires_at.isoformat(),
    )

    return {
        "message": "If this email is registered, a secure OTP has been sent."
    }


# ── Endpoint: POST /auth/verify-otp ──────────────────────────────────────────

@router.post("/verify-otp")
@limiter.limit("5/10minutes")          # max 5 verify attempts per IP per 10 min
def verify_otp(
    request: Request,
    body: VerifyOTPRequest,
    db: Session = Depends(get_db),
):
    """
    Validate the OTP submitted by the user.

    - Checks expiry and single-use status.
    - Increments attempts_count on each failed input.
    - Permanently voids the OTP after MAX_OTP_ATTEMPTS failed guesses.
    - On success: marks otp.verified_at = now() (reset-password reads this).
    """
    email = body.email.strip().lower()
    otp_input = body.otp.strip()

    user = _get_user_by_email(db, email)
    if not user:
        logger.warning(
            "OTP_VERIFY_UNKNOWN_EMAIL | ip=%s | email=%s",
            request.client.host, email,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Fetch the most recent unused, unexpired OTP for this user
    # (regardless of code, to track attempts across all active records)
    otp_record = (
        db.query(db_models.PasswordResetOTP)
        .filter(
            db_models.PasswordResetOTP.user_id == user.id,
            db_models.PasswordResetOTP.is_used == False,
            db_models.PasswordResetOTP.expires_at > _now_utc(),
        )
        .order_by(db_models.PasswordResetOTP.created_at.desc())
        .first()
    )

    if not otp_record:
        logger.warning(
            "OTP_VERIFY_NO_ACTIVE_OTP | ip=%s | user_id=%s",
            request.client.host, user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Brute-force check: if already maxed out, void and block
    if otp_record.attempts_count >= MAX_OTP_ATTEMPTS:
        otp_record.is_used = True
        db.commit()
        logger.warning(
            "BRUTE_FORCE_BLOCKED | ip=%s | user_id=%s | attempts=%d",
            request.client.host, user.id, otp_record.attempts_count,
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many incorrect attempts. Please request a new OTP.",
        )

    # Verify the submitted code
    if otp_record.otp_code != otp_input:
        otp_record.attempts_count += 1
        remaining = MAX_OTP_ATTEMPTS - otp_record.attempts_count
        if otp_record.attempts_count >= MAX_OTP_ATTEMPTS:
            otp_record.is_used = True
            db.commit()
            logger.warning(
                "BRUTE_FORCE_LOCKED | ip=%s | user_id=%s",
                request.client.host, user.id,
            )
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many incorrect attempts. Please request a new OTP.",
            )
        db.commit()
        logger.warning(
            "OTP_VERIFY_WRONG_CODE | ip=%s | user_id=%s | attempts_remaining=%d",
            request.client.host, user.id, remaining,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid OTP. {remaining} attempt(s) remaining.",
        )

    # ✅ OTP is correct — stamp verified_at (do NOT set is_used yet; reset-password needs it)
    otp_record.verified_at = _now_utc()
    db.commit()

    logger.info(
        "OTP_VERIFIED | ip=%s | user_id=%s",
        request.client.host, user.id,
    )

    return {"message": "OTP verified successfully. You may now reset your password."}


# ── Endpoint: POST /auth/reset-password ──────────────────────────────────────

@router.post("/reset-password")
@limiter.limit("5/10minutes")          # max 5 reset attempts per IP per 10 min
def reset_password(
    request: Request,
    body: ResetPasswordRequest,
    db: Session = Depends(get_db),
):
    """
    Accept email, OTP, and new password.

    Requirements (all enforced):
      1. OTP must have been verified (verified_at is set).
      2. verified_at must be within VERIFY_WINDOW_MINUTES (prevents replay after gap).
      3. OTP must not be already consumed (is_used = False).
      4. New password is bcrypt-hashed before storage.
    """
    email = body.email.strip().lower()
    otp_input = body.otp.strip()

    user = _get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP.",
        )

    # Find the OTP that was verified for this user
    otp_record = (
        db.query(db_models.PasswordResetOTP)
        .filter(
            db_models.PasswordResetOTP.user_id == user.id,
            db_models.PasswordResetOTP.otp_code == otp_input,
            db_models.PasswordResetOTP.is_used == False,
            db_models.PasswordResetOTP.expires_at > _now_utc(),
            db_models.PasswordResetOTP.verified_at.isnot(None),   # must be verified
        )
        .first()
    )

    if not otp_record:
        logger.warning(
            "RESET_INVALID_OTP | ip=%s | user_id=%s",
            request.client.host, user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OTP. Please verify your OTP first.",
        )

    # Ensure the verify-otp step happened recently (replay protection)
    verify_cutoff = _now_utc() - timedelta(minutes=VERIFY_WINDOW_MINUTES)
    if otp_record.verified_at < verify_cutoff:
        otp_record.is_used = True
        db.commit()
        logger.warning(
            "RESET_VERIFY_WINDOW_EXPIRED | ip=%s | user_id=%s",
            request.client.host, user.id,
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP verification window expired. Please request a new OTP.",
        )

    # Hash and update password
    new_hashed = hash_password(body.new_password)
    user.hashed_password = new_hashed

    # Consume this OTP so it cannot be replayed
    otp_record.is_used = True

    db.commit()

    logger.info(
        "PASSWORD_RESET_SUCCESS | ip=%s | user_id=%s",
        request.client.host, user.id,
    )

    return {"message": "Password reset successfully. You can now log in with your new password."}
