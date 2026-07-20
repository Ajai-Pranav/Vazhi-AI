# VazhiAI — AI-Powered Career Guidance Platform

## What's New in v2.0 (Authentication Update)

### Pipeline
```
/auth/signup or /auth/login
       ↓
/ (Onboarding — profile details)
       ↓
/suggestions (AI career paths)
       ↓
/dashboard (full dashboard, roadmap saved to DB)
```

### Features Added
- ✅ Signup / Login / Logout
- ✅ JWT session persistence (7-day token in localStorage)
- ✅ Protected routes (auto-redirect to /auth/login)
- ✅ Forgot password flow (UI ready, hook in backend)
- ✅ Password strength indicator
- ✅ Profile saved to PostgreSQL on onboarding completion
- ✅ Chosen roadmap auto-saved to DB after selection
- ✅ Auth-protected AI suggestion endpoint

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, Tailwind CSS, Framer Motion |
| Backend | FastAPI |
| Database | PostgreSQL + SQLAlchemy |
| AI | Groq (llama-3.3-70b) via LangChain |
| Auth | JWT (python-jose) + bcrypt (passlib) |

---

## Database Schema

- **users** — email, hashed_password, name, full profile fields
- **roadmaps** — chosen career path per user (one active at a time)
- **daily_progress** — per-day task/problem tracking
- **daily_tests** — MCQ scores
- **chat_history** — chatbot session messages

---

## Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create PostgreSQL DB
createdb VazhiAI

# Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY, DATABASE_URL, JWT_SECRET_KEY

uvicorn main:app --reload
```

Tables are auto-created on startup via SQLAlchemy.

### Frontend

```bash
cd frontend
npm install

cp .env.local.example .env.local

npm run dev
```

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/signup | ❌ | Create account |
| POST | /auth/login | ❌ | Login, get JWT |
| GET | /auth/me | ✅ | Current user |
| PUT | /auth/profile | ✅ | Update profile |
| POST | /auth/profile/complete | ✅ | Save full onboarding |

### AI
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /generate-suggestions | ✅ | Generate career paths |

### Roadmaps
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /roadmaps | ✅ | Save chosen roadmap |
| GET | /roadmaps | ✅ | All user roadmaps |
| GET | /roadmaps/active | ✅ | Current active roadmap |
| POST | /roadmaps/progress | ✅ | Log daily progress |
| GET | /roadmaps/progress | ✅ | Last 30 days progress |
