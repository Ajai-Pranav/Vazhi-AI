"""
services/cleanup_service.py
───────────────────────────
Periodic cleanup of expired/used/revoked auth records.

Without this, `refresh_tokens` and `password_reset_otps` grow without bound —
every login/refresh adds a row that's never removed once it expires or is
revoked/used (see the scalability audit finding this addresses).

Runs on a schedule via APScheduler, registered in main.py's lifespan.
Deliberately a plain synchronous function (not async) — APScheduler's
BackgroundScheduler runs it in a worker thread, which is a clean fit for a
blocking SQLAlchemy session and keeps this out of the asyncio event loop.
"""

import logging
from datetime import datetime, timedelta, timezone

import db_models
from database import SessionLocal

logger = logging.getLogger("VazhiAI.cleanup")

# Keep expired/used/revoked rows around for a short buffer after they stop
# being valid, so there's a window for debugging/security audit before purge.
RETENTION_DAYS = 7


def cleanup_expired_tokens_and_otps() -> None:
    """
    Delete refresh_tokens and password_reset_otps rows that have been
    expired, revoked, or used for longer than RETENTION_DAYS.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(days=RETENTION_DAYS)
    db = SessionLocal()
    try:
        expired_refresh = (
            db.query(db_models.RefreshToken)
            .filter(db_models.RefreshToken.expires_at < cutoff)
            .delete(synchronize_session=False)
        )
        # Tokens revoked well before their natural expiry (logout, rotation)
        # shouldn't wait out their full 30-day expiry just to be purged.
        revoked_refresh = (
            db.query(db_models.RefreshToken)
            .filter(
                db_models.RefreshToken.is_revoked == True,
                db_models.RefreshToken.created_at < cutoff,
            )
            .delete(synchronize_session=False)
        )
        expired_otps = (
            db.query(db_models.PasswordResetOTP)
            .filter(db_models.PasswordResetOTP.expires_at < cutoff)
            .delete(synchronize_session=False)
        )
        used_otps = (
            db.query(db_models.PasswordResetOTP)
            .filter(
                db_models.PasswordResetOTP.is_used == True,
                db_models.PasswordResetOTP.created_at < cutoff,
            )
            .delete(synchronize_session=False)
        )
        db.commit()
        logger.info(
            "TOKEN_OTP_CLEANUP | refresh_tokens_deleted=%d | otps_deleted=%d",
            expired_refresh + revoked_refresh,
            expired_otps + used_otps,
        )
    except Exception as e:
        db.rollback()
        logger.exception("TOKEN_OTP_CLEANUP_FAILED | error=%s", repr(e))
    finally:
        db.close()
