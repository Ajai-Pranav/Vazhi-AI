from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
import db_models
from models.schemas import BroadOnboardingRequest, UserPublic, UserProfileResponse
from services.auth_service import get_current_user

router = APIRouter(prefix="/onboarding", tags=["onboarding"])


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


@router.post("/complete", response_model=UserPublic)
def complete_onboarding(
    body: BroadOnboardingRequest,
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """
    Save full onboarding data for any user type.
    Updates the User row AND upserts the UserProfile extension table.
    """
    # ── Update core User fields ──────────────────────────────────────────
    current_user.educational_status = body.educational_status
    current_user.field = body.field
    current_user.dream_job = body.dream_job
    current_user.custom_goal = body.custom_goal
    current_user.experience_level = body.experience_level
    current_user.confusion = body.confusion
    current_user.tech_stack = body.tech_stack or []
    current_user.age = body.age

    # Student-specific
    if body.educational_status == "Student":
        current_user.college = body.college
        current_user.course = body.course
        current_user.current_year = body.current_year
        current_user.total_years = body.total_years

    # Professional/Job-seeker
    if body.educational_status in ("Working Professional", "Job Seeker"):
        current_user.current_company = body.current_company
        current_user.years_of_experience = body.years_of_experience
        current_user.current_role = body.current_role

    # ── Upsert UserProfile extension ────────────────────────────────────
    profile_ext = (
        db.query(db_models.UserProfile)
        .filter(db_models.UserProfile.user_id == current_user.id)
        .first()
    )
    if not profile_ext:
        profile_ext = db_models.UserProfile(user_id=current_user.id)
        db.add(profile_ext)

    profile_ext.field = body.field
    profile_ext.educational_status = body.educational_status
    profile_ext.dream_job = body.dream_job
    profile_ext.custom_goal = body.custom_goal
    profile_ext.experience_level = body.experience_level
    profile_ext.known_tools = body.known_tools or []
    profile_ext.target_skills = body.target_skills or []
    profile_ext.interests = body.interests or []
    profile_ext.certifications_done = body.certifications_done or []
    profile_ext.certifications_target = body.certifications_target or []
    profile_ext.extra_data = body.extra_data or {}

    db.commit()
    db.refresh(current_user)
    return _user_to_public(current_user)


@router.get("/profile", response_model=UserProfileResponse)
def get_profile_extension(
    db: Session = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    """Return the user's extended domain profile."""
    profile_ext = (
        db.query(db_models.UserProfile)
        .filter(db_models.UserProfile.user_id == current_user.id)
        .first()
    )
    if not profile_ext:
        raise HTTPException(status_code=404, detail="Profile not found. Please complete onboarding.")
    return profile_ext
