import logging
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from database import get_db
import db_models
from models.schemas import StudentProfile, SuggestionsResponse
from services.auth_service import get_current_user
from services.groq_service import generate_suggestions, generate_suggestions_from_dict
from limiter import limiter

logger = logging.getLogger("VazhiAI.suggestions")

router = APIRouter(tags=["suggestions"])


@router.post("/generate-suggestions", response_model=SuggestionsResponse)
@limiter.limit("10/minute")
async def get_suggestions(
    request: Request,
    body: StudentProfile,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """
    Generate personalized career suggestions.
    Merges the request body with stored user profile fields for maximum context.
    Rate limited: 10 requests/minute per IP.
    """
    # Build enriched profile dict combining stored user data + request data
    profile_dict = {
        # From stored user profile (most authoritative)
        "name": current_user.name or body.name,
        "educational_status": current_user.educational_status or body.educational_status or "Student",
        "field": current_user.field or body.field or "Computer Science / IT",
        "experience_level": current_user.experience_level or body.experience_level or "Beginner",
        "dream_job": current_user.dream_job or body.dream_job,
        "custom_goal": current_user.custom_goal,
        "confusion": body.confusion or current_user.confusion,
        "tech_stack": body.tech_stack or current_user.tech_stack or [],
        "age": body.age or current_user.age,
        # Student fields
        "college": body.college or current_user.college,
        "course": body.course or current_user.course,
        "current_year": body.current_year or current_user.current_year,
        "total_years": body.total_years or current_user.total_years,
        # Professional fields
        "current_company": body.current_company or current_user.current_company,
        "years_of_experience": body.years_of_experience or current_user.years_of_experience,
        "current_role": body.current_role or current_user.current_role,
    }

    # Merge domain profile extension if available
    if current_user.user_profile:
        p = current_user.user_profile
        profile_dict["known_tools"] = p.known_tools or profile_dict["tech_stack"]
        profile_dict["target_skills"] = p.target_skills or []
        profile_dict["interests"] = p.interests or []

    try:
        return await generate_suggestions_from_dict(profile_dict)
    except Exception as e:
        logger.exception(
            "SUGGESTION_GENERATION_FAILED | user_id=%s | error=%s",
            current_user.id, repr(e),
        )
        raise HTTPException(status_code=500, detail="Failed to generate suggestions. Please try again.")
