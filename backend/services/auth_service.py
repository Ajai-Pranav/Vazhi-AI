import os
import secrets
import hashlib
import logging
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import get_db
import db_models
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("VazhiAI.auth_service")

SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "VazhiAI-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30          # Short-lived access token (30 min)
REFRESH_TOKEN_EXPIRE_DAYS = 30            # Long-lived refresh token (30 days)

bearer_scheme = HTTPBearer(auto_error=False)


# ── Password hashing (direct bcrypt — passlib removed) ───────────────────────

def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


# ── JWT access token utilities ────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


# ── Refresh token utilities ───────────────────────────────────────────────────

def _hash_token(raw_token: str) -> str:
    """SHA-256 hash of a raw token string for safe DB storage."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def create_refresh_token(
    user_id: str,
    db: Session,
    request: Optional[Request] = None,
) -> str:
    """
    Generate a cryptographically secure refresh token, store its hash in DB,
    and return the raw token to be set as an HTTP-Only cookie.
    """
    raw_token = secrets.token_urlsafe(64)
    token_hash = _hash_token(raw_token)
    expires_at = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    record = db_models.RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        is_revoked=False,
        user_agent=request.headers.get("user-agent", "") if request else "",
        ip_address=request.client.host if request and request.client else "",
    )
    db.add(record)
    db.commit()

    logger.info("REFRESH_TOKEN_CREATED | user_id=%s", user_id)
    return raw_token


def rotate_refresh_token(
    raw_old_token: str,
    db: Session,
    request: Optional[Request] = None,
) -> Tuple[str, str]:
    """
    Validate the old refresh token, revoke it, issue a new access + refresh token pair.
    Raises HTTP 401 if the token is invalid, expired, or revoked.
    Returns (new_access_token, new_raw_refresh_token).
    """
    old_hash = _hash_token(raw_old_token)
    now = datetime.now(timezone.utc)

    record = (
        db.query(db_models.RefreshToken)
        .filter(
            db_models.RefreshToken.token_hash == old_hash,
            db_models.RefreshToken.is_revoked == False,
            db_models.RefreshToken.expires_at > now,
        )
        .first()
    )

    if not record:
        logger.warning("REFRESH_TOKEN_INVALID | ip=%s", request.client.host if request and request.client else "?")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token. Please log in again.",
        )

    user = db.query(db_models.User).filter(db_models.User.id == record.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")

    # Revoke the old token immediately (rotation — prevents replay)
    record.is_revoked = True
    db.flush()

    # Issue new token pair
    new_access_token = create_access_token({"sub": user.id})
    new_raw_refresh = create_refresh_token(user.id, db, request)

    logger.info("REFRESH_TOKEN_ROTATED | user_id=%s", user.id)
    return new_access_token, new_raw_refresh, user


def revoke_all_user_tokens(user_id: str, db: Session) -> None:
    """Revoke ALL active refresh tokens for a user (used on logout)."""
    db.query(db_models.RefreshToken).filter(
        db_models.RefreshToken.user_id == user_id,
        db_models.RefreshToken.is_revoked == False,
    ).update({"is_revoked": True})
    db.commit()
    logger.info("ALL_TOKENS_REVOKED | user_id=%s", user_id)


# ── Cookie helpers ────────────────────────────────────────────────────────────

COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "true").lower() != "false"  # False only in local dev

ACCESS_COOKIE_MAX_AGE  = ACCESS_TOKEN_EXPIRE_MINUTES * 60   # seconds
REFRESH_COOKIE_MAX_AGE = REFRESH_TOKEN_EXPIRE_DAYS * 86400  # seconds


def set_auth_cookies(response, access_token: str, refresh_token: str) -> None:
    """Attach both HTTP-Only auth cookies to a response object."""
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
        max_age=ACCESS_COOKIE_MAX_AGE,
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="strict",
        max_age=REFRESH_COOKIE_MAX_AGE,
        path="/auth/refresh",   # Scoped — only sent to the refresh endpoint
    )


def clear_auth_cookies(response) -> None:
    """Clear both auth cookies (used on logout)."""
    response.delete_cookie("access_token",  path="/",            samesite="strict")
    response.delete_cookie("refresh_token", path="/auth/refresh", samesite="strict")


# ── Dependency: resolve current authenticated user ────────────────────────────

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> db_models.User:
    """
    Resolve the current user from:
      1. HTTP-Only cookie 'access_token' (preferred — cookie-based auth)
      2. Authorization: Bearer <token> header (fallback for backward compat)
    """
    token: Optional[str] = None

    # 1. Try HTTP-Only cookie first
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        token = cookie_token
    # 2. Fall back to Bearer header
    elif credentials and credentials.credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    user = db.query(db_models.User).filter(db_models.User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user
