import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL environment variable is not set. Please configure it in your .env file.")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=5,
    max_overflow=10,
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables and run safe migrations on startup."""
    from sqlalchemy import text

    migrations = [
        # ── Broad user profile columns on users table ──────────────────────
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS educational_status VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS field VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_level VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_goal VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS current_company VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS years_of_experience INTEGER;",
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS "current_role" VARCHAR;',
        # ── UserProfile extension table ────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS user_profiles (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            field VARCHAR NOT NULL,
            educational_status VARCHAR NOT NULL,
            dream_job VARCHAR,
            custom_goal VARCHAR,
            experience_level VARCHAR,
            known_tools JSON DEFAULT '[]',
            target_skills JSON DEFAULT '[]',
            interests JSON DEFAULT '[]',
            certifications_done JSON DEFAULT '[]',
            certifications_target JSON DEFAULT '[]',
            extra_data JSON DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );""",
        # ── Roadmap context columns ────────────────────────────────────────
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS user_field VARCHAR;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS user_educational_status VARCHAR;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS user_dream_job VARCHAR;",
        # ── Existing migrations ────────────────────────────────────────────
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR NOT NULL DEFAULT 'Other';",
        """CREATE TABLE IF NOT EXISTS onboarding_data (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            profession VARCHAR NOT NULL,
            data JSON NOT NULL DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );""",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS is_confirmed BOOLEAN DEFAULT FALSE;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS duration_weeks INTEGER;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS experience_level VARCHAR;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS available_time VARCHAR;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS learning_pace VARCHAR;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS outline JSON DEFAULT '[]';",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS detailed_days JSON DEFAULT '{}';",
        "ALTER TABLE daily_progress ADD COLUMN IF NOT EXISTS day_number INTEGER;",
        "ALTER TABLE daily_tests ADD COLUMN IF NOT EXISTS roadmap_id VARCHAR REFERENCES roadmaps(id) ON DELETE CASCADE;",
        "ALTER TABLE daily_tests ADD COLUMN IF NOT EXISTS day_number INTEGER;",
        # ── Password Reset OTP table ───────────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS password_reset_otps (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            otp_code VARCHAR(8) NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_used BOOLEAN DEFAULT FALSE NOT NULL,
            attempts_count INTEGER DEFAULT 0 NOT NULL,
            verified_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );""",
        """CREATE INDEX IF NOT EXISTS idx_reset_otps_user_active
            ON password_reset_otps(user_id)
            WHERE is_used = FALSE;""",
        # ── Refresh Tokens table ───────────────────────────────────────────────
        """CREATE TABLE IF NOT EXISTS refresh_tokens (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash VARCHAR NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
            user_agent VARCHAR,
            ip_address VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );""",
        """CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user
            ON refresh_tokens(user_id)
            WHERE is_revoked = FALSE;""",
        """CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash
            ON refresh_tokens(token_hash);""",
        # ── Roadmap status tracking columns ────────────────────────────────────
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS generation_status VARCHAR DEFAULT 'completed';",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS generation_error TEXT;",
        "ALTER TABLE roadmaps ADD COLUMN IF NOT EXISTS days_status JSON DEFAULT '{}';",
    ]

    try:
        with engine.connect() as conn:
            for mig in migrations:
                try:
                    with conn.begin():
                        conn.execute(text(mig))
                except Exception as e:
                    print(f"Migration note: {e}")
    except Exception as e:
        print(f"Database connection or migration failed: {e}")

    Base.metadata.create_all(bind=engine)