# VazhiAI v3 — Broad User Network: Change Log

## Summary
VazhiAI has been expanded from a CS/IT-student-only platform to a **universal self-study and career guidance system** supporting all engineering branches, arts & science, commerce, working professionals, and job seekers.

---

## Backend Changes

### 1. `constants.py` — Completely Rewritten
- **Removed:** Old narrow `PROFESSION_OPTIONS` list (10 CS/IT-centric items)
- **Added:**
  - `EDUCATIONAL_STATUS` — Student / Working Professional / Job Seeker
  - `FIELD_OPTIONS` — 8 domains (CS/IT, Mechanical, Civil, ECE, EEE, Arts & Science, Commerce, Other)
  - `CAREER_GOAL_OPTIONS` — 17 career goals spanning all domains
  - `EXPERIENCE_LEVELS` — Absolute Beginner → Advanced
  - `DOMAIN_RESOURCES` — Per-field dict of platforms, tools, and focus areas used by the prompt engine

### 2. `db_models.py` — Extended User Model + New Table
- **User model** — Added 8 new columns:
  - `educational_status`, `field`, `experience_level`, `custom_goal`
  - `current_company`, `years_of_experience`, `current_role` (for professionals)
  - All nullable; backward compatible
- **New `UserProfile` table** — Domain extension table with:
  - `known_tools`, `target_skills`, `interests`
  - `certifications_done`, `certifications_target`
  - `extra_data` (flexible JSON for future fields)
  - One-to-one with User (unique constraint on user_id)
- **Roadmap model** — Added `user_field`, `user_educational_status`, `user_dream_job` columns to carry domain context for prompt generation

### 3. `database.py` — Security + Migration Fix
- **Removed** hardcoded PostgreSQL credentials from fallback URL (security fix)
- Now raises `RuntimeError` if `DATABASE_URL` env var is not set
- Added migrations for all new columns and the `user_profiles` table
- Added `user_field` / `user_educational_status` / `user_dream_job` to roadmaps migrations

### 4. `main.py` — CORS + Version
- **Fixed** CORS `allow_origins` hardcoded to `localhost:3000` — now reads from `ALLOWED_ORIGINS` env var (comma-separated)
- Version bumped to `3.0.0`
- Added `/health` endpoint

### 5. `models/schemas.py` — Broad Profile Schemas
- **New `BroadOnboardingRequest`** schema — single unified onboarding payload covering all user types
- **Updated `SignupRequest`** — accepts `educational_status` + `field` instead of `profession`
- **Updated `UserPublic`** — exposes all new profile fields
- **New `UserProfileResponse`** — schema for the extension table
- **Updated `StudentProfile`** — now includes `educational_status`, `field`, `experience_level` (backward compatible, all optional)
- **Updated `RoadmapResponse`** — includes `user_field`, `user_educational_status`, `user_dream_job`

### 6. `services/prompt_engine.py` — NEW FILE (Domain-Specific Prompts)
This is the core intelligence upgrade. A dedicated prompt builder per domain:

| Domain | Recommended Platforms | Key Tools |
|---|---|---|
| CS / IT | LeetCode, HackerRank, GitHub | DSA, System Design, Frameworks |
| Mechanical | GrabCAD, NPTEL, Coursera | AutoCAD, SolidWorks, ANSYS, CATIA |
| Civil | NPTEL, YouTube Structural | STAAD Pro, ETABS, AutoCAD Civil |
| ECE | Arduino Hub, NPTEL, Hackaday | Arduino, Keil, Altium, KiCad |
| EEE | NPTEL, IEEE Xplore | MATLAB/Simulink, ETAP, PLC |
| Arts & Science | Khan Academy, Coursera | Python/R, SPSS, Tableau |
| Commerce | ICAI, Coursera | Tally, SAP, Excel, Power BI |

**Functions added:**
- `build_suggestions_prompt(profile)` — domain + status aware suggestions
- `build_roadmap_outline_prompt(...)` — domain aware curriculum design
- `build_day_details_prompt(...)` — domain aware day content (resources, MCQs, assignments)
- `build_chat_system_prompt(...)` — domain aware mentor persona

**Key behaviors:**
- Working Professionals get upskilling/evening-learning paths
- Job Seekers get portfolio-first, interview-ready paths
- Students get placement/timeline-aware paths
- Each domain gets its correct tools (Mechanical users won't see LeetCode links)

### 7. `services/groq_service.py` — Updated
- All LLM calls now go through `prompt_engine.py`
- Added `generate_suggestions_from_dict()` for new onboarding flow
- All generation functions accept `user_field` and `user_status` parameters
- No breaking changes to existing function signatures

### 8. `routes/auth.py` — Updated
- Signup now stores `educational_status` and `field`
- `_user_to_public()` returns all new profile fields
- `has_profile` correctly checks `user_profile` relationship

### 9. `routes/onboarding.py` — Rewritten
- Old: stored a generic JSON blob per profession
- New: `POST /onboarding/complete` accepts `BroadOnboardingRequest` and:
  1. Updates all User fields (status, field, tools, confusion, etc.)
  2. Upserts `UserProfile` extension table with domain-specific data
- New: `GET /onboarding/profile` returns the UserProfile extension

### 10. `routes/suggestions.py` — Updated
- Merges stored user profile + request body into enriched context dict
- Includes `known_tools`, `target_skills`, `interests` from UserProfile if available
- Calls `generate_suggestions_from_dict()` with full context

### 11. `routes/roadmaps.py` — Patched
- `save_roadmap()` stores `user_field`, `user_educational_status`, `user_dream_job` on creation
- `confirm_custom_roadmap()` passes `user_field` and `user_status` to outline generator
- `get_roadmap_day()` passes `user_field` and `user_status` to day detail generator

### 12. `routes/chat.py` — Patched
- Chat profile context now includes `educational_status`, `field`, `experience_level`, `current_company`, `current_role`
- AI mentor gets full domain context for accurate tutoring

### 13. `.env` / `.env.example` — Security Fix
- Removed hardcoded credentials from `.env`
- `.env.example` updated with `ALLOWED_ORIGINS` variable

---

## Frontend Changes

### 14. `types/index.ts` — Expanded
- New types: `EducationalStatus`, `UserField`, `ExperienceLevel`
- New interface: `UserPublic` (full user with all new fields)
- New interface: `BroadOnboardingRequest`
- `StudentProfile` updated to include new fields (optional, backward compat)
- `RoadmapOutlineResponse` updated with `user_field`, `user_educational_status`

### 15. `lib/constants.ts` — NEW FILE
- `EDUCATIONAL_STATUS_OPTIONS`
- `FIELD_OPTIONS` — with icons and descriptions for UI cards
- `EXPERIENCE_LEVELS` — with descriptions
- `CAREER_GOALS_BY_FIELD` — domain-filtered goal options
- `DOMAIN_TOOLS` — per-field tool checklist for onboarding

### 16. `lib/api.ts` — Updated
- `apiSignup()` — now takes `educational_status` + `field`
- New `apiGetMe()` — typed to return `UserPublic`
- New `apiUpdateProfile()` — for profile updates
- `apiCompleteOnboarding()` — now takes `BroadOnboardingRequest`
- New `apiGetProfileExtension()` — fetches UserProfile extension

### 17. `app/onboarding/page.tsx` — Complete Rewrite
Old: Single-page form for CS students only
New: **5-step wizard** covering all user types:

| Step | Content |
|---|---|
| 1 | Educational Status (Student / Professional / Job Seeker) |
| 2 | Field selection (icon cards) + context fields (college/company) |
| 3 | Career Goal (field-filtered) + Experience Level |
| 4 | Known tools (domain-specific chip selector) + Confusion textarea |
| 5 | Profile review before submission |

### 18. `app/auth/signup/page.tsx` — Patched
- Replaced `PROFESSIONS` dropdown with `educational_status` + `field` from new constants
- Updated `apiSignup` call signature

---

## Security Fixes
1. **Hardcoded DB credentials removed** from `database.py`
2. **CORS origins** moved from hardcode to `ALLOWED_ORIGINS` env var

---

## What Stays the Same
- All existing roadmap generation, daily progress, MCQ test, and chat routes are **backward compatible**
- Existing users keep their data; new columns are nullable
- The `OnboardingData` legacy table is preserved (not removed)
- All frontend pages except onboarding and signup are unchanged
