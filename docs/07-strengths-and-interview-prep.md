# Parts 9, 10 & 11 — Strengths, Weaknesses, Interview Preparation, and Learning Notes

> Part of the VazhiAI Engineering Knowledge Base. See [docs/README.md](./README.md) for the full table of contents.

## Part 9 — Project Strengths & Weaknesses

### 9.1 Strengths

**Scalability**
- Stateless JWT authentication means any number of backend instances can validate a request independently — no shared session store required for auth itself.
- Slow work (AI generation) is already offloaded to background tasks, keeping the request/response cycle fast even though the underlying LLM call can take many seconds.
- Database queries are consistently indexed on the columns they filter by (`user_id`, `roadmap_id`).

**Maintainability & Readability**
- Consistent feature-grouped structure on both sides (`routes/<feature>.py` ↔ `app/<feature>/page.tsx`) makes it fast to find the code for any given feature.
- Prompt-building logic (`prompt_engine.py`) is fully separated from LLM-calling/retry logic (`groq_service.py`) — a change to *what* we ask the AI never risks breaking *how* we call it.
- Extensive, accurate inline comments explaining *why*, not just *what* (e.g., the `middleware.ts` comment explaining the cross-domain cookie lesson) — genuinely good practice, not just decoration.

**Modularity**
- Routers, services, and schemas are each single-responsibility files per feature area; the frontend mirrors this with one folder per route.
- Business logic (services) has minimal dependency on HTTP-specific objects, making it more portable/testable than logic embedded directly in route handlers.

**Security** (see full detail in [Part 2, §2.19](./01-backend.md#219-security-deep-dive))
- Passwords hashed with bcrypt; JWTs signed with an explicitly allow-listed algorithm; no hardcoded secret fallbacks (fixed during review).
- HTTP-Only cookies eliminate the most common JWT-theft vector (XSS reading `localStorage`).
- Refresh token rotation + hashed storage; per-user, IP-based rate limiting on every sensitive/expensive endpoint.
- A full, deliberate security review was conducted on this exact codebase, finding and fixing: a hardcoded JWT secret fallback, an unchecked client-supplied foreign key (IDOR risk), a missing XSS-escape before rendering LLM output, leaked internal exception text, a missing timing-equalizer on two auth endpoints, and public exposure of interactive API docs (now togglable via `ENVIRONMENT=production`).

**Performance**
- Background-job pattern for AI generation avoids blocking the request thread on the slowest operation in the system.
- Pagination caps (`.limit(200)`, `.limit(30)`, `.limit(50)`) were added specifically to prevent unbounded response payloads.

**Extensibility**
- The domain/field system (`constants.py` → `prompt_engine.py`) is data-driven — adding a new field/domain means adding dictionary entries, not rewriting control flow.
- `UserProfile.extra_data` (a catch-all JSON column) allows new profile attributes without a schema migration.

**Production Readiness**
- Structured logging with request IDs on unhandled errors, optional Sentry integration, a scheduled cleanup job for unbounded table growth, and environment-gated API docs — these are all genuinely production-minded details, not just "make it work locally" shortcuts.

### 9.2 Weaknesses & Improvement Paths

| Weakness | Why it matters | Improvement |
|---|---|---|
| No Repository layer | Query logic (e.g., "user's active roadmap") duplicated across files | Introduce `repositories/roadmap_repository.py` etc. once duplication grows further |
| In-memory-only rate limiter | Limits multiply per worker process/instance under horizontal scaling | Configure a Redis-backed `storage_uri` for `slowapi.Limiter` |
| `BackgroundTasks`, not a durable queue | A server restart mid-generation silently loses the job, stuck at `"processing"` forever | Migrate AI generation to Celery/RQ with retries and a stuck-job reaper |
| Two migration systems (Alembic + inline DDL) | Redundant, historically caused a real Postgres/SQLite compatibility bug | Consolidate on Alembic alone; remove the inline `create_tables()` DDL list |
| No CI pipeline | Existing pytest suite isn't run automatically on push/PR | Add a GitHub Actions workflow running `pytest` on every PR |
| No Dockerfile | Local dev environment isn't perfectly reproducible across machines | Add a `Dockerfile` + `docker-compose.yml` (app + Postgres) for local dev parity |
| No frontend error boundaries | An uncaught render exception has no graceful fallback | Add `app/error.tsx` (Next.js convention) at minimum |
| Heavy PDF-export libraries loaded eagerly | `html2canvas`/`jspdf` ship in the `/resume` bundle even if never used | `next/dynamic` import, loaded only on "Export PDF" click |
| No explicit CSRF token | Cross-domain deployment requires `SameSite=None`, reopening some CSRF surface | Add a double-submit CSRF token as defense-in-depth |
| "One active roadmap" not DB-enforced | A race condition could theoretically create two active roadmaps | Add a partial unique index: `UNIQUE(user_id) WHERE is_active = TRUE` |
| No true pagination (only hard caps) | Older data beyond the cap becomes invisible, not paginated-to | Add cursor/offset pagination to `/chat/history`, `/roadmaps/progress`, `/study-material/history` |
| No caching layer | Every read hits Postgres/Groq directly | Cache-aside with Redis for immutable-once-generated data (roadmap outlines/day details) |

## Part 10 — Interview Preparation

### 10.1 Twenty Interview Questions with Detailed Answers

**1. Describe this project in one sentence.**
An AI-powered career guidance platform (FastAPI + PostgreSQL backend, Next.js/TypeScript frontend) that generates personalized, day-by-day learning roadmaps and supporting tools (mentor chat, resume builder, study material generator) across every academic/professional field, not just CS.

**2. Why FastAPI over Flask or Django for the backend?**
FastAPI gives async support out of the box (important for I/O-bound work like LLM calls and DB queries), automatic request validation + OpenAPI docs generation via Pydantic type hints, and a lightweight dependency-injection system — all with less boilerplate than Django, and more built-in structure than Flask.

**3. Why Next.js over plain React for the frontend, given every page is a Client Component?**
Even without leaning on server rendering, Next.js provides file-based routing, automatic per-route code-splitting, a mature build pipeline, and `next.config.js` rewrites (used to proxy API calls) — valuable infrastructure independent of the SSR/CSR choice.

**4. Walk me through what happens when a user logs in.**
Frontend submits credentials → backend verifies the email exists and the bcrypt hash matches → issues a short-lived JWT access token (30 min) and a long-lived refresh token (30 days, stored server-side only as a SHA-256 hash) → both set as HTTP-Only cookies → frontend stores the returned user object in React Context and routes based on onboarding status.

**5. How do you prevent one user from accessing another user's data?**
Every database query for user-owned data filters by `WHERE user_id = current_user.id` in addition to the resource's own ID — this was audited across every route specifically, and one real gap (a client-supplied `roadmap_id` used without an ownership check) was found and fixed.

**6. What's the biggest architectural weakness you'd flag to a new team lead?**
The lack of a durable task queue for AI generation — currently using FastAPI's in-process `BackgroundTasks`, which loses in-flight jobs on a server restart. It's a known, accepted trade-off at current scale, not an oversight, with a clear migration path (Celery/RQ) once reliability requirements justify the added infrastructure.

**7. How does the app handle a slow AI response without blocking the user?**
The roadmap-generation endpoints return `202 Accepted` immediately after scheduling the actual LLM call as a background task, and the frontend polls a status endpoint until the content is ready — a standard async-job pattern for anything too slow to fit in a normal request/response cycle.

**8. Explain the refresh token rotation mechanism and why it matters.**
Every time a refresh token is used, it's immediately revoked and replaced with a new one. If a stolen refresh token were ever used by an attacker, the legitimate user's next refresh attempt would fail (already revoked) — a detectable signal of compromise, rather than silently allowing indefinite reuse of a single leaked token.

**9. Why store only a hash of the refresh token in the database?**
So a database leak alone doesn't hand out usable tokens — an attacker would need the raw token (which only ever existed inside the HttpOnly cookie) to compute a matching SHA-256 hash and impersonate a session.

**10. What testing exists, and what's missing?**
A pytest suite covers auth flows, roadmap CRUD, and study material generation/validation, running against an isolated SQLite database with per-test transaction rollback for isolation. Missing: frontend tests (no Jest/React Testing Library/Cypress present) and a CI pipeline to run the existing backend tests automatically.

**11. How would you scale this to 10x the current user base?**
First bottleneck: the small, fixed database connection pool (`pool_size=5`) — would need to grow relative to worker count, or move to a pooled connection proxy like PgBouncer. Second: the in-memory rate limiter would need a shared Redis backend to remain correct across multiple processes/instances. Third: AI generation would benefit from a real queue rather than in-process background tasks, for durability and better load-shedding under burst traffic.

**12. What's an example of a race condition you found and fixed in this codebase?**
Two near-simultaneous requests for the same not-yet-generated roadmap day could both read `days_status["N"] != "processing"` and both schedule duplicate background generation. Fixed by taking a row-level lock (`SELECT ... FOR UPDATE`) on the roadmap before reading/writing that status, ensuring the second request's read only happens after the first's write commits.

**13. How do you keep AI-generated content safe to render in the browser?**
User- and LLM-generated text is HTML-escaped (`&`, `<`, `>`) before any lightweight Markdown-to-HTML conversion, specifically to prevent an adversarial or unexpected LLM response from injecting executable HTML/script tags — a genuine prompt-injection-to-XSS risk that was found missing in one view and fixed to match the safer pattern already used elsewhere.

**14. Why does the password-reset flow always return the same response message?**
To prevent user enumeration — if the response revealed whether an email was registered, an attacker could use that difference to build a list of valid accounts to target with further attacks (credential stuffing, phishing).

**15. What's the difference between authentication and authorization in your implementation?**
Authentication (`get_current_user`) proves which user is making the request, by validating a signed JWT and loading the matching database row. Authorization is every subsequent query's `WHERE user_id = ...` clause, ensuring that even a correctly-authenticated user can only touch rows they own.

**16. Does this project use microservices? Would you recommend them?**
No — it's a single backend service handling every feature area. I wouldn't recommend splitting it into microservices at this scale; that architecture solves problems (independent scaling/deployment per team, fault isolation) this project doesn't yet have, at a real cost (service discovery, distributed auth, cross-service tracing) that isn't justified yet.

**17. How is configuration/secrets management handled?**
Via environment variables loaded through `python-dotenv`, with two deliberate patterns: secrets with no safe default (`DATABASE_URL`, `JWT_SECRET_KEY`) cause the app to refuse to start if missing (fail-fast), while non-secret configuration (CORS origins, environment name) has sensible defaults. `.env` is gitignored; `.env.example` documents variable names only.

**18. What would you change about the database schema if you were starting over?**
I'd add a partial unique index enforcing "one active roadmap per user" at the database level (currently only enforced in application code), and consider native `UUID` column types instead of `String` UUIDs for a small storage/indexing efficiency gain, at the cost of some cross-dialect portability with the SQLite test database.

**19. How does the frontend avoid showing a flash of protected content to unauthenticated users?**
`RouteGuard` renders nothing while the auth check (`GET /auth/me`, plus a silent refresh attempt if needed) is still in flight, and only renders the page once it's confirmed the user is either authenticated or on a public path — avoiding a flash of real content that would then have to be yanked away.

**20. What's the most valuable lesson from this project you'd bring to a new one?**
That standard patterns (like Next.js edge-middleware auth checks) can silently fail when your architecture doesn't match their assumptions — in this case, cross-domain cookie scoping between a Vercel frontend and a Render backend meant the "textbook" middleware approach could never work. Recognizing *why* it failed (cookies are domain-scoped) rather than just patching around symptoms led to the correct fix: doing the auth check via a direct cross-origin request to the actual cookie-owning domain.

### 10.2 The 2-Minute Explanation

"VazhiAI is a career guidance platform I built with a FastAPI backend and a Next.js/TypeScript frontend. A user answers a few questions about their background — student, professional, or job seeker, and their field, which spans everything from computer science to mechanical engineering to commerce — and an LLM generates personalized career suggestions. Once they pick one, the system generates a full day-by-day study roadmap: resources, practice problems, quizzes, and assignments, tailored to their experience level and available time. Users can chat with an AI mentor about their current material, or use a separate conversational assistant to tweak or completely regenerate their roadmap. There's also an AI-assisted resume builder and an on-demand study-material generator.

On the engineering side, I focused heavily on security and scalability: JWT-based authentication with HTTP-Only cookies and rotating refresh tokens, per-user data isolation audited across every endpoint, rate limiting on every sensitive and AI-backed route, and background-job handling so slow AI calls never block the user. I also did a full security review that found and fixed real issues — an IDOR gap, a missing XSS escape, a hardcoded secret fallback — which I can walk through in detail."

### 10.3 The 5-Minute Explanation

"VazhiAI solves a real gap: most AI study-planning tools assume you're a computer science student. This one supports eight different fields — from CS to civil engineering to commerce — each with genuinely different tools, platforms, and career paths, driven by a domain-aware prompt-engineering layer rather than one generic prompt.

Architecturally, it's a two-tier system: a FastAPI backend and a Next.js frontend, talking over a REST API, deployed independently. The backend is organized in a lightweight layered style — thin route handlers delegate to a services layer for business logic (auth, LLM calls, email), backed by PostgreSQL via SQLAlchemy and Alembic migrations. The AI layer is its own clean separation: `prompt_engine.py` builds domain-specific prompts as pure functions, while `groq_service.py` is the only code that actually talks to the LLM provider, wrapping every call in automatic retry-with-backoff and validating the (sometimes messy) LLM output against strict schemas before it ever reaches the database.

Because generating a full day-by-day curriculum can take real time, the outline and per-day content generation both run as background jobs — the API responds immediately with a 202 and a 'processing' status, and the frontend polls until it's ready. I had to fix a genuine race condition here: two near-simultaneous requests for the same day could both see 'not yet generating' and both kick off duplicate work, so I added row-level database locking around that read-then-write.

Authentication uses short-lived JWTs in HTTP-Only cookies — never exposed to JavaScript, closing off the most common XSS-based token theft vector — paired with a longer-lived, rotating refresh token whose raw value is never stored, only its hash. One of the more interesting problems I solved: the frontend and backend live on different domains, and I initially tried to gate protected routes using Next.js edge middleware checking for the auth cookie — which can never work, because cookies are scoped per-domain and the middleware runs on the frontend's domain, not the backend's. I fixed it by moving that check to a direct client-side request to the backend itself, which does receive the cookie correctly.

I also ran a full, deliberate security and scalability review on this exact codebase — not hypothetically, but actually auditing every route for IDOR risks, checking every response schema for leaked internal fields, verifying rate limits on every AI-backed endpoint, and testing assumptions rather than trusting them (I actually installed the project's pinned Pydantic version and reproduced a reported bug directly, rather than assuming a third-party bug report was accurate, and found it wasn't — the reported crash didn't actually occur with this project's specific pinned version). That review found and fixed real issues: a hardcoded JWT secret fallback, a missing ownership check on a client-supplied foreign key, a missing XSS escape, leaked exception details, and public-by-default API docs, which are now environment-gated.

I'm upfront about what's not yet built: there's no durable task queue (background jobs use FastAPI's in-process `BackgroundTasks`, which won't survive a server restart mid-job), no CI pipeline, no Docker setup, and no Repository layer between services and the database — all reasonable trade-offs at the project's current scale, each with a clear, specific trigger for when I'd introduce them."

## Part 11 — Learning Notes & Cheat Sheet

### 11.1 One-Page Cheat Sheet

| Concept | This project's answer |
|---|---|
| Backend framework | FastAPI (async Python) |
| Frontend framework | Next.js 14, App Router, Client Components |
| Database | PostgreSQL + SQLAlchemy ORM + Alembic migrations |
| Auth mechanism | JWT access token (30 min) + rotating refresh token (30 days), both HTTP-Only cookies |
| Password storage | bcrypt hash, never plaintext |
| Authorization model | Ownership-based (`user_id` filter), not RBAC |
| Validation | Pydantic v2 schemas (DTOs), validated before route code runs |
| Rate limiting | `slowapi`, IP-keyed, in-memory (not distributed) |
| LLM provider | Groq (`llama-3.3-70b-versatile`), wrapped with `tenacity` retry |
| Background jobs | FastAPI `BackgroundTasks` (AI generation) + APScheduler (daily cleanup) |
| Missing layer | Repository pattern (routes/services query the ORM directly) |
| Biggest known scaling gap | In-memory rate limiter + non-durable background jobs |
| CI/CD, Docker | Not present |
| Testing | pytest, isolated SQLite, per-test transaction rollback |

### 11.2 Key Takeaways (Whole Project)

- This is a real, security-reviewed, two-tier SaaS application — not a toy project — with an honest, documented list of both what's solid and what's intentionally deferred.
- The strongest technical story to tell in an interview is the auth/cross-domain-cookie lesson (Parts 4 and 6) — it's specific, true, and demonstrates debugging a *root cause* rather than a symptom.
- The second-strongest story is the security review itself (Part 9) — naming specific, real bugs found and fixed (IDOR gap, XSS escape, hardcoded secret, leaked errors) is far more convincing than a vague "security was a priority" claim.
- Being able to clearly say what's *not* built yet, and *why not yet* rather than *forgotten*, is itself a signal of engineering maturity — this knowledge base is written to make that distinction easy to articulate.

### 11.3 Common Mistakes Developers Make (Recap Across All Parts)

- Trusting client-supplied foreign keys without an ownership check (fixed here once, worth checking for everywhere).
- Rendering LLM/user-generated content without escaping HTML first.
- Leaving a hardcoded fallback secret "for convenience," which becomes a real vulnerability the moment an env var is forgotten in a new environment.
- Reusing a database session immediately after `rollback()` instead of opening a fresh one.
- Assuming an in-memory rate limiter/cache will keep working correctly the moment you scale to more than one process.
- Building rich global state management (Redux, etc.) before the app's actual state complexity justifies it.

### 11.4 Further Reading (General, Not Project-Specific)

- FastAPI's own docs on `Depends()` and the `lifespan` pattern.
- SQLAlchemy 2.0's migration guide (for understanding the ORM patterns used here).
- OWASP's guidance on IDOR, CSRF, and XSS — the exact vulnerability classes this project's security review targeted.
- Refresh token rotation: OAuth 2.0 Security Best Current Practice (RFC 9700) discusses rotation and reuse detection in more formal terms than this document, for anyone wanting the underlying standard.
