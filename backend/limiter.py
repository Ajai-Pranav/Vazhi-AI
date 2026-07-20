"""
limiter.py
──────────
Centralised slowapi rate-limiter instance.
Import `limiter` from this module in routes that need IP-based throttling.
Import `limiter_handler` in main.py to register the 429 error handler.
"""

from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

import os

# Rate limit keys are based on client IP address
# Can be disabled via env var for running test suites/CI
_enabled = os.environ.get("DISABLE_RATE_LIMIT", "false").lower() != "true"
limiter = Limiter(key_func=get_remote_address, enabled=_enabled)



async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom 429 response so clients get a clear, actionable error message."""
    return JSONResponse(
        status_code=429,
        content={
            "detail": f"Too many requests. {exc.detail}. Please wait before trying again."
        },
    )
