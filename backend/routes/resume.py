import logging
from fastapi import APIRouter, Depends, HTTPException
from services.groq_service import optimize_resume
from services.auth_service import get_current_user
import db_models
from pydantic import BaseModel
from typing import List, Dict, Any

logger = logging.getLogger("VazhiAI.resume")
router = APIRouter(prefix="/resume", tags=["resume"])


class OptimizeResumeRequest(BaseModel):
    resume_data: Dict[str, Any]
    target_role: str


@router.post("/optimize")
async def get_optimized_resume(
    body: OptimizeResumeRequest,
    current_user: db_models.User = Depends(get_current_user),
):
    try:
        optimized = await optimize_resume(body.resume_data, body.target_role)
        return optimized
    except Exception as e:
        logger.exception("RESUME_OPTIMIZATION_FAILED | user_id=%s | error=%s", current_user.id, repr(e))
        raise HTTPException(status_code=500, detail="Failed to optimize resume. Please try again.")
