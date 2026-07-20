"""
routes/auth.py
──────────────
Authentication endpoints for VazhiAI.

Cookie-based auth flow:
  POST /auth/signup        — Register, receive HTTP-Only access + refresh cookies
  POST /auth/login         — Authenticate, receive HTTP-Only access + refresh cookies
  POST /auth/refresh       — Rotate refresh token, issue new cookie pair
  POST /auth/logout        — Revoke all sessions, clear cookies
  GET  /auth/me            — Return current user profile (reads cookie automatically)
  PUT  /auth/profile       — Update current user profile

Security:
  ✓ Rate limiting on login (10/min) and signup (5/hour)
  ✓ HTTP-Only, Secure, SameSite=Strict cookies (XSS-safe)
  ✓ Short-lived access token (30 min) + long-lived refresh token (30 days)
  ✓ Server-side refresh token revocation on logout
  ✓ Refresh token rotation (old token invalidated on every refresh)
  ✓ Structured security logging
"""

import logging
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
import db_models
from models.schemas import (
    SignupRequest, LoginRequest, TokenResponse, UserPublic,
    ProfileUpdateRequest, BroadOnboardingRequest,
)
from services.auth_service import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    rotate_refresh_token, revoke_all_user_tokens,
    set_auth_cookies, clear_auth_cookies,
    get_current_user,
)
from limiter import limiter

logger = logging.getLogger("VazhiAI.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_to_public(user: db_models.User) -> UserPublic:
    has_profile = bool(user.user_profile or user.dream_job)
    return UserPublic(
        id=user.id,
        email=user.email,
        name=user.name,
        educational_status=user.educational_status,
        field=user.field,
        experience_level=user.experience_level,
        dream_job=user.dream_job,
        custom_goal=user.custom_goal,
        confusion=user.confusion,
        tech_stack=user.tech_stack,
        age=user.age,
        college=user.college,
        course=user.course,
        current_year=user.current_year,
        total_years=user.total_years,
        current_company=user.current_company,
        years_of_experience=user.years_of_experience,
        current_role=user.current_role,
        profession=user.profession,
        has_profile=has_profile,
    )


def _build_auth_response(user: db_models.User, access_token: str, refresh_token: str) -> JSONResponse:
    """Build a JSONResponse with HTTP-Only auth cookies set."""
    user_public = _user_to_public(user)
    body = TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_public,
    )
    response = JSONResponse(content=body.model_dump())
    set_auth_cookies(response, access_token, refresh_token)
    return response


# ── POST /auth/signup ─────────────────────────────────────────────────────────

@router.post("/signup")
@limiter.limit("5/hour")
def signup(request: Request, body: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(db_models.User).filter(
        db_models.User.email == body.email.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = db_models.User(
        email=body.email.lower(),
        hashed_password=hash_password(body.password),
        name=body.name,
        educational_status=body.educational_status,
        field=body.field,
        profession=body.profession or "Other",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("USER_SIGNUP | user_id=%s | email=%s | ip=%s", user.id, user.email, request.client.host)

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token(user.id, db, request)
    return _build_auth_response(user, access_token, refresh_token)


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(db_models.User).filter(
        db_models.User.email == body.email.lower()
    ).first()
    if not user or not verify_password(body.password, user.hashed_password):
        logger.warning("LOGIN_FAILED | email=%s | ip=%s", body.email, request.client.host)
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account disabled")

    logger.info("USER_LOGIN | user_id=%s | ip=%s", user.id, request.client.host)

    access_token = create_access_token({"sub": user.id})
    refresh_token = create_refresh_token(user.id, db, request)
    return _build_auth_response(user, access_token, refresh_token)


# ── POST /auth/refresh ────────────────────────────────────────────────────────

@router.post("/refresh")
@limiter.limit("30/minute")
def refresh_tokens(request: Request, db: Session = Depends(get_db)):
    """
    Read the refresh_token cookie, validate it, rotate to a new token pair,
    and return new HTTP-Only cookies + updated user payload.
    """
    raw_refresh = request.cookies.get("refresh_token")
    if not raw_refresh:
        raise HTTPException(
            status_code=401,
            detail="No refresh token provided. Please log in again.",
        )

    new_access_token, new_refresh_token, user = rotate_refresh_token(raw_refresh, db, request)
    logger.info("TOKEN_REFRESHED | user_id=%s | ip=%s", user.id, request.client.host)
    return _build_auth_response(user, new_access_token, new_refresh_token)


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/logout")
def logout(
    request: Request,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """Revoke all refresh tokens for this user and clear auth cookies."""
    revoke_all_user_tokens(current_user.id, db)
    logger.info("USER_LOGOUT | user_id=%s | ip=%s", current_user.id, request.client.host)

    response = JSONResponse(content={"message": "Logged out successfully."})
    clear_auth_cookies(response)
    return response


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserPublic)
def get_me(current_user: db_models.User = Depends(get_current_user)):
    return _user_to_public(current_user)


# ── PUT /auth/profile ─────────────────────────────────────────────────────────

@router.put("/profile", response_model=UserPublic)
def update_profile(
    body: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return _user_to_public(current_user)
