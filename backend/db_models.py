from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Text, JSON,
    ForeignKey, Float
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)

    # Broad profile fields
    educational_status = Column(String, nullable=True)          # Student / Working Professional / Job Seeker
    field = Column(String, nullable=True)                       # Department / domain
    experience_level = Column(String, nullable=True)            # Absolute Beginner → Advanced
    dream_job = Column(String, nullable=True)                   # Career goal
    custom_goal = Column(String, nullable=True)                 # Free-text if "Custom Goal" selected
    confusion = Column(Text, nullable=True)                     # What they're stuck on

    # Student-specific (nullable for non-students)
    college = Column(String, nullable=True)
    course = Column(String, nullable=True)
    current_year = Column(Integer, nullable=True)
    total_years = Column(Integer, nullable=True)

    # Professional-specific (nullable for students)
    current_company = Column(String, nullable=True)
    years_of_experience = Column(Integer, nullable=True)
    current_role = Column("current_role", String, nullable=True)

    # Shared
    tech_stack = Column(JSON, nullable=True, default=list)      # Known skills/tools
    age = Column(Integer, nullable=True)

    # Legacy field kept for backward compat
    profession = Column(String, nullable=False, default="Other")

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    roadmaps = relationship("Roadmap", back_populates="user", cascade="all, delete-orphan")
    daily_progress = relationship("DailyProgress", back_populates="user", cascade="all, delete-orphan")
    daily_tests = relationship("DailyTest", back_populates="user", cascade="all, delete-orphan")
    chat_history = relationship("ChatMessage", back_populates="user", cascade="all, delete-orphan")
    onboarding = relationship("OnboardingData", back_populates="user", uselist=False, cascade="all, delete-orphan")
    user_profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="user", cascade="all, delete-orphan")
    study_materials = relationship("StudyMaterial", back_populates="user", cascade="all, delete-orphan")


class UserProfile(Base):
    """
    Flexible field-specific profile extension.
    Stores structured domain data per user's field/department.
    """
    __tablename__ = "user_profiles"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True, index=True)
    field = Column(String, nullable=False)                      # Domain key matching FIELD_OPTIONS
    educational_status = Column(String, nullable=False)
    dream_job = Column(String, nullable=True)
    custom_goal = Column(String, nullable=True)
    experience_level = Column(String, nullable=True)
    known_tools = Column(JSON, default=list)                    # Domain-specific tools user knows
    target_skills = Column(JSON, default=list)                  # Skills user wants to acquire
    interests = Column(JSON, default=list)                      # Sub-interests within field
    certifications_done = Column(JSON, default=list)
    certifications_target = Column(JSON, default=list)
    extra_data = Column(JSON, default=dict)                     # Any extra field-specific data
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="user_profile")


class Roadmap(Base):
    __tablename__ = "roadmaps"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    why_this_fits_user = Column(Text, nullable=True)
    required_skills = Column(JSON, default=list)
    roadmap_steps = Column(JSON, default=list)
    estimated_timeline = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_confirmed = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # User's field & goal context at time of roadmap creation (for prompt context)
    user_field = Column(String, nullable=True)
    user_educational_status = Column(String, nullable=True)
    user_dream_job = Column(String, nullable=True)

    # Customize settings
    duration_weeks = Column(Integer, nullable=True)
    experience_level = Column(String, nullable=True)
    available_time = Column(String, nullable=True)
    learning_pace = Column(String, nullable=True)

    # Progressive daily data
    outline = Column(JSON, default=list)
    detailed_days = Column(JSON, default=dict)

    # Asynchronous task tracking
    generation_status = Column(String, default="completed")  # "pending", "processing", "completed", "failed"
    generation_error = Column(Text, nullable=True)
    days_status = Column(JSON, default=dict)  # e.g. {"1": "processing", "2": "completed"}

    user = relationship("User", back_populates="roadmaps")
    progress = relationship("DailyProgress", back_populates="roadmap", cascade="all, delete-orphan")
    daily_tests = relationship("DailyTest", back_populates="roadmap", cascade="all, delete-orphan")


class DailyProgress(Base):
    __tablename__ = "daily_progress"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id"), nullable=True, index=True)
    date = Column(String, nullable=False)
    day_number = Column(Integer, nullable=True)
    completed_tasks = Column(JSON, default=list)
    solved_problems = Column(JSON, default=list)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="daily_progress")
    roadmap = relationship("Roadmap", back_populates="progress")


class DailyTest(Base):
    __tablename__ = "daily_tests"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    roadmap_id = Column(String, ForeignKey("roadmaps.id"), nullable=True, index=True)
    date = Column(String, nullable=False)
    day_number = Column(Integer, nullable=True)
    topic = Column(String, nullable=True)
    score = Column(Float, nullable=True)
    total_questions = Column(Integer, nullable=True)
    correct_answers = Column(Integer, nullable=True)
    answers = Column(JSON, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="daily_tests")
    roadmap = relationship("Roadmap", back_populates="daily_tests")


class ChatMessage(Base):
    __tablename__ = "chat_history"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    session_id = Column(String, nullable=True, index=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="chat_history")


class OnboardingData(Base):
    __tablename__ = "onboarding_data"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    profession = Column(String, nullable=False)
    data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="onboarding")


class PasswordResetOTP(Base):
    """
    Stores one-time passwords for account recovery.
    Security features:
    - Expires after 10 minutes
    - Single-use (is_used flag)
    - Brute-force protection (attempts_count)
    - All previous OTPs invalidated on new request
    - verified_at tracks when OTP was validated (for reset-password window check)
    """
    __tablename__ = "password_reset_otps"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    otp_code = Column(String(8), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    attempts_count = Column(Integer, default=0, nullable=False)  # Failed attempts counter
    verified_at = Column(DateTime(timezone=True), nullable=True)  # Set when OTP verified
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class RefreshToken(Base):
    """
    Stores hashed refresh tokens for secure session management.

    Security design:
    - Only the SHA-256 hash is persisted (raw token is returned to client once, never stored)
    - is_revoked=True on logout or token rotation (old token invalidated immediately)
    - expires_at enforces maximum session lifetime (30 days)
    - user_agent + ip_address allow session visibility / anomaly detection
    """
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)  # SHA-256 of raw token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)
    user_agent = Column(String, nullable=True)   # Browser / client identifier
    ip_address = Column(String, nullable=True)   # Originating IP for audit trail
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="refresh_tokens")


class StudyMaterial(Base):
    """
    Stores AI-generated study material content per user.
    Content is generated by Groq LLM and saved as Markdown.
    PDF is produced client-side from this Markdown.
    """
    __tablename__ = "study_materials"

    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)

    # Request parameters
    topics = Column(JSON, nullable=False)                       # List[str]
    difficulty = Column(String, nullable=False)
    education_level = Column(String, nullable=True)
    language = Column(String, default="English")
    output_length = Column(String, default="Detailed")

    # Generated content
    markdown_content = Column(Text, nullable=False)

    # Async generation tracking (reserved for future streaming)
    generation_status = Column(String, default="completed")     # pending | completed | failed
    generation_error = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="study_materials")