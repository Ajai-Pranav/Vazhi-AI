import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from services.groq_service import optimize_resume
from services.auth_service import get_current_user
import db_models
from pydantic import BaseModel, Field, field_validator
from typing import List, Dict, Any
from limiter import limiter

logger = logging.getLogger("VazhiAI.resume")
router = APIRouter(prefix="/resume", tags=["resume"])

MAX_RESUME_DATA_CHARS = 20000


class OptimizeResumeRequest(BaseModel):
    resume_data: Dict[str, Any]
    target_role: str = Field(..., max_length=200)

    @field_validator("resume_data")
    @classmethod
    def validate_resume_data_size(cls, v: Dict[str, Any]) -> Dict[str, Any]:
        if len(json.dumps(v)) > MAX_RESUME_DATA_CHARS:
            raise ValueError(f"resume_data is too large (max {MAX_RESUME_DATA_CHARS} characters serialized)")
        return v


@router.post("/optimize")
@limiter.limit("10/hour")
async def get_optimized_resume(
    request: Request,
    body: OptimizeResumeRequest,
    current_user: db_models.User = Depends(get_current_user),
):
    try:
        optimized = await optimize_resume(body.resume_data, body.target_role)
        return optimized
    except Exception as e:
        logger.exception("RESUME_OPTIMIZATION_FAILED | user_id=%s | error=%s", current_user.id, repr(e))
        raise HTTPException(status_code=500, detail="Failed to optimize resume. Please try again.")
