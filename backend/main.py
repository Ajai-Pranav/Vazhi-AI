import os
import uuid
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from routes.auth import router as auth_router
from routes.suggestions import router as suggestions_router
from routes.onboarding import router as onboarding_router
from routes.roadmaps import router as roadmaps_router
from routes.chat import router as chat_router
from routes.resume import router as resume_router
from routes.recovery import router as recovery_router
from routes.study_material import router as study_material_router
from limiter import limiter, rate_limit_handler

import sentry_sdk
from logging_config import setup_logging

# ── Sentry setup ──────────────────────────────────────────────────────────────
SENTRY_DSN = os.environ.get("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        send_default_pii=True
    )

# ── Logging setup ─────────────────────────────────────────────────────────────
setup_logging()
logger = logging.getLogger("VazhiAI.main")

app = FastAPI(
    title="VazhiAI Backend",
    description="Personalized career guidance AI for all domains — powered by Groq",
    version="3.0.0"
)

# ── Rate limiter setup (slowapi) ──────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# CORS: read allowed origins from env, fall back to localhost for dev
_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
ALLOWED_ORIGINS = [o.strip() for o in _origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())
    logger.exception(
        "UNHANDLED_EXCEPTION | request_id=%s | %s %s | error=%s",
        request_id,
        request.method,
        request.url.path,
        repr(exc),
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error. Please try again later.",
            "request_id": request_id,
        },
    )


app.include_router(auth_router)
app.include_router(suggestions_router)
app.include_router(onboarding_router)
app.include_router(roadmaps_router)
app.include_router(chat_router)
app.include_router(resume_router)
app.include_router(recovery_router)
app.include_router(study_material_router)


@app.on_event("startup")
def on_startup():
    # NOTE: DB migrations (alembic upgrade head) are run via migrate.py
    # BEFORE the server starts (see start.bat / start.sh).
    # Running Alembic inside the async startup event blocks the event loop.
    try:
        from database import create_tables
        create_tables()
        logger.info("Database tables and columns checked/created successfully.")
    except Exception as e:
        logger.error(f"Failed to check/create database tables on startup: {e}")
    logger.info("VazhiAI backend started — version 3.0.0")


@app.get("/")
def root():
    return {"status": "VazhiAI backend running", "version": "3.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
