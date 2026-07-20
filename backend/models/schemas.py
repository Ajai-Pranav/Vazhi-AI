from pydantic import BaseModel, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── Auth ─────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str
    educational_status: Optional[str] = None   # Student / Working Professional / Job Seeker
    field: Optional[str] = None                # Domain / department
    profession: Optional[str] = "Other"  # Legacy compat

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class RefreshTokenRequest(BaseModel):
    """Used only when the client cannot read cookies (e.g., mobile/API testing)."""
    refresh_token: str


class UserPublic(BaseModel):
    id: str
    email: str
    name: Optional[str]
    educational_status: Optional[str] = None
    field: Optional[str] = None
    experience_level: Optional[str] = None
    dream_job: Optional[str] = None
    custom_goal: Optional[str] = None
    confusion: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    age: Optional[int] = None
    # Student fields
    college: Optional[str] = None
    course: Optional[str] = None
    current_year: Optional[int] = None
    total_years: Optional[int] = None
    # Professional fields
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    current_role: Optional[str] = None
    # Legacy
    profession: Optional[str] = None
    has_profile: bool = False

    class Config:
        from_attributes = True


# ── Onboarding ────────────────────────────────────────────────────────────────

class OnboardingRequest(BaseModel):
    profession: str       # Legacy — kept for compat
    data: dict


class BroadOnboardingRequest(BaseModel):
    """Unified onboarding for all user types."""
    educational_status: str
    field: str
    dream_job: str
    custom_goal: Optional[str] = None
    experience_level: str
    confusion: Optional[str] = None
    tech_stack: Optional[List[str]] = []
    age: Optional[int] = None
    # Student-specific
    college: Optional[str] = None
    course: Optional[str] = None
    current_year: Optional[int] = None
    total_years: Optional[int] = None
    # Professional-specific
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    current_role: Optional[str] = None
    # Profile extension data
    known_tools: Optional[List[str]] = []
    target_skills: Optional[List[str]] = []
    interests: Optional[List[str]] = []
    certifications_done: Optional[List[str]] = []
    certifications_target: Optional[List[str]] = []
    extra_data: Optional[Dict[str, Any]] = {}


class ForgotPasswordRequest(BaseModel):
    email: str


class VerifyOTPRequest(BaseModel):
    email: str
    otp: str


class ResetPasswordRequest(BaseModel):
    email: str
    otp: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


# ── User Profile ──────────────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    educational_status: Optional[str] = None
    field: Optional[str] = None
    experience_level: Optional[str] = None
    dream_job: Optional[str] = None
    custom_goal: Optional[str] = None
    confusion: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    # Student
    college: Optional[str] = None
    course: Optional[str] = None
    current_year: Optional[int] = None
    total_years: Optional[int] = None
    # Professional
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    current_role: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    user_id: str
    field: str
    educational_status: str
    dream_job: Optional[str]
    custom_goal: Optional[str]
    experience_level: Optional[str]
    known_tools: List[str]
    target_skills: List[str]
    interests: List[str]
    certifications_done: List[str]
    certifications_target: List[str]
    extra_data: Optional[Dict[str, Any]]

    class Config:
        from_attributes = True


# ── Legacy StudentProfile (kept for backward compat) ─────────────────────────

class StudentProfile(BaseModel):
    name: str
    age: Optional[int] = None
    college: Optional[str] = None
    course: Optional[str] = None
    current_year: Optional[int] = None
    total_years: Optional[int] = None
    tech_stack: Optional[List[str]] = []
    dream_job: str
    confusion: Optional[str] = None
    # Broad fields
    educational_status: Optional[str] = "Student"
    field: Optional[str] = "Computer Science / IT"
    experience_level: Optional[str] = "Beginner"
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    current_role: Optional[str] = None


# ── Career Suggestion ─────────────────────────────────────────────────────────

class CareerSuggestion(BaseModel):
    title: str
    description: str
    why_this_fits_user: str
    required_skills: List[str]
    roadmap_steps: List[str]
    estimated_timeline: str
    difficulty: str


class SuggestionsResponse(BaseModel):
    suggestions: List[CareerSuggestion]


# ── Roadmap ───────────────────────────────────────────────────────────────────

class RoadmapCreate(BaseModel):
    title: str
    description: Optional[str] = None
    why_this_fits_user: Optional[str] = None
    required_skills: List[str] = []
    roadmap_steps: List[str] = []
    estimated_timeline: Optional[str] = None
    difficulty: Optional[str] = None


class RoadmapResponse(BaseModel):
    id: str
    title: str
    description: Optional[str]
    why_this_fits_user: Optional[str]
    required_skills: List[str]
    roadmap_steps: List[str]
    estimated_timeline: Optional[str]
    difficulty: Optional[str]
    is_active: bool
    is_confirmed: bool
    duration_weeks: Optional[int] = None
    experience_level: Optional[str] = None
    available_time: Optional[str] = None
    learning_pace: Optional[str] = None
    outline: List = []
    detailed_days: Optional[dict] = None
    generation_status: Optional[str] = "completed"
    generation_error: Optional[str] = None
    days_status: Optional[dict] = {}
    created_at: Optional[datetime] = None
    user_field: Optional[str] = None
    user_educational_status: Optional[str] = None
    user_dream_job: Optional[str] = None

    class Config:
        from_attributes = True


# ── Progress ──────────────────────────────────────────────────────────────────

class DailyProgressCreate(BaseModel):
    date: str
    roadmap_id: Optional[str] = None
    day_number: Optional[int] = None
    completed_tasks: List[str] = []
    solved_problems: List[str] = []
    notes: Optional[str] = None


class DailyProgressResponse(BaseModel):
    id: str
    date: str
    day_number: Optional[int]
    completed_tasks: List[str]
    solved_problems: List[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


# ── Chat ──────────────────────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    session_id: Optional[str] = None
    role: str
    content: str


class ChatMessageResponse(BaseModel):
    id: str
    session_id: Optional[str]
    role: str
    content: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── Detailed Roadmap & Customization ──────────────────────────────────────────

class DetailedRoadmapConfig(BaseModel):
    duration_weeks: int
    experience_level: str
    available_time: str
    learning_pace: str


class RoadmapOutlineItem(BaseModel):
    day: int
    title: str
    focus: str
    module: Optional[str] = None
    difficulty: Optional[str] = None
    suggested_problems: Optional[List[Dict[str, str]]] = None


class RoadmapOutlineResponse(BaseModel):
    id: str
    title: str
    is_confirmed: bool
    duration_weeks: Optional[int]
    experience_level: Optional[str]
    available_time: Optional[str]
    learning_pace: Optional[str]
    outline: List[RoadmapOutlineItem]
    created_at: Optional[datetime] = None


class LearningResource(BaseModel):
    type: str
    title: str
    link: str


class PracticeProblem(BaseModel):
    platform: str
    problem: str
    difficulty: str
    link: str


class MCQQuestion(BaseModel):
    question: str
    options: List[str]
    answer: str
    difficulty: Optional[str] = "Medium"


class DayRoadmapDetails(BaseModel):
    day: int
    title: str
    duration: str
    topics: List[str]
    resources: List[LearningResource]
    practice: List[PracticeProblem]
    mcqTest: List[MCQQuestion]
    codingAssignment: Optional[str] = None
    revisionTasks: Optional[List[str]] = []


class TestSubmitRequest(BaseModel):
    answers: List[str]


class TestQuestionResult(BaseModel):
    question: str
    options: List[str]
    selected: str
    correct: str


class TestScoreResponse(BaseModel):
    day_number: int
    score: float
    total_questions: int
    correct_answers: int
    answers: List[TestQuestionResult]


# ── Study Material ─────────────────────────────────────────────────────────────

class StudyMaterialRequest(BaseModel):
    topics: List[str]                               # 1–5 topic strings
    education_level: Optional[str] = None           # e.g. "Undergraduate", "High School"
    difficulty: str = "Comprehensive"               # Beginner | Intermediate | Advanced | Comprehensive
    language: Optional[str] = "English"
    output_length: str = "Detailed"                 # Short | Medium | Detailed

    @field_validator("topics")
    @classmethod
    def validate_topics(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one topic is required")
        if len(v) > 5:
            raise ValueError("A maximum of 5 topics are allowed")
        for topic in v:
            if len(topic.strip()) < 2:
                raise ValueError("Each topic must be at least 2 characters")
            if len(topic.strip()) > 200:
                raise ValueError("Each topic must be 200 characters or fewer")
        return [t.strip() for t in v]

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v):
        allowed = {"Beginner", "Intermediate", "Advanced", "Comprehensive"}
        if v not in allowed:
            raise ValueError(f"difficulty must be one of: {', '.join(sorted(allowed))}")
        return v

    @field_validator("output_length")
    @classmethod
    def validate_output_length(cls, v):
        allowed = {"Short", "Medium", "Detailed"}
        if v not in allowed:
            raise ValueError(f"output_length must be one of: {', '.join(sorted(allowed))}")
        return v


class StudyMaterialResponse(BaseModel):
    id: str
    topics: List[str]
    difficulty: str
    language: str
    output_length: str
    markdown_content: str
    generated_at: datetime

    class Config:
        from_attributes = True


class StudyMaterialListItem(BaseModel):
    id: str
    topics: List[str]
    difficulty: str
    language: str
    output_length: str
    generated_at: datetime

    class Config:
        from_attributes = True
