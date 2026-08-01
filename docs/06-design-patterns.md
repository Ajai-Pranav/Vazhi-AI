# Part 8 — Design Patterns Used

> Part of the VazhiAI Engineering Knowledge Base. See [docs/README.md](./README.md) for the full table of contents.
>
> Honesty matters more than a long list here — this section names what's genuinely present, what's genuinely absent, and why, rather than forcing every classic Gang-of-Four pattern onto code that doesn't use it.

## 8.1 MVC-Inspired Layering (Present, Adapted)

**What it is**: Model-View-Controller separates data (Model), presentation (View), and request-handling logic (Controller).

**How it appears here**: this is a **decoupled variant** of MVC, not textbook MVC, because the View lives entirely in a separate application (the Next.js frontend), not server-rendered templates:
- **Model** = `db_models.py` (ORM classes) + `models/schemas.py` (DTOs).
- **Controller** = `routes/*.py` — parses requests, calls services, shapes responses.
- **View** = the React frontend, consuming JSON, not HTML.

**Why this variant instead of classic server-rendered MVC?** A JSON API + separate SPA frontend is the standard shape for products wanting a rich, app-like interactive UI (see Part 1's architecture discussion) — classic MVC's server-rendered View doesn't fit that goal well.

**Alternatives**: full server-rendered MVC (Django templates, Rails ERB) — simpler for content-heavy sites, worse for this app's highly interactive, poll-and-update-state UI.

## 8.2 Layered Architecture: Controller → Service → (missing) Repository → Database

Covered in depth in [Part 2, §2.4](./01-backend.md#24-services-layer-and-the-missing-repository-layer). Summary for this section: routes delegate business logic to `services/`, but both routes and services query SQLAlchemy directly rather than through a dedicated Repository abstraction. This is the single most-flagged "textbook pattern not fully applied" in this codebase, and a defensible one at current scale.

## 8.3 Dependency Injection (Present)

Covered fully in [Part 2, §2.9](./01-backend.md#29-dependency-injection). FastAPI's `Depends()` is the DI mechanism: `get_db`, `get_current_user`, and (implicitly) the `Request` object are all injected into route functions rather than constructed inside them. This is the single most consistently and correctly applied pattern in the entire codebase.

## 8.4 Singleton (Present, Several Instances)

**What it is**: ensure a class/object has exactly one instance, globally accessible.

**Where it appears**:
- `limiter.py`'s `limiter = Limiter(...)` — one shared rate-limiter instance imported by every route module that needs it. Two routes calling `@limiter.limit(...)` are both consulting the *same* underlying counter state.
- `database.py`'s `engine` and `SessionLocal` — one engine (and therefore one connection pool) per process, one session factory shared everywhere via `Depends(get_db)`.
- `groq_service.py`'s `client = AsyncGroq(api_key=...)` — one HTTP client instance reused across every LLM call, rather than constructing a new client (and its underlying connection pool) per request.

**Why Singleton here, specifically**: all three represent genuinely expensive-to-create, safe-to-share resources — a database connection pool and an HTTP client are *designed* to be reused across many requests; creating a new one per request would be wasteful and would defeat the purpose of connection pooling entirely.

**Disadvantage / common mistake this pattern invites**: singletons carry implicit shared state — this is exactly *why* the rate limiter's in-memory counters don't scale across multiple processes (Part 2, §2.18): each process gets its *own* singleton instance, with no shared state between processes, silently multiplying the effective rate limit under horizontal scaling. This is the textbook trade-off of Singleton in a multi-process/multi-server world — the fix is externalizing the shared state (Redis) rather than abandoning the pattern.

**Alternatives**: a proper IoC container managing singleton lifetimes explicitly (more common in Java/.NET frameworks) — FastAPI's simpler "module-level object + `Depends`" convention achieves the same effect with far less ceremony, appropriate for Python.

## 8.5 Factory (Present)

**What it is**: a function/method whose job is purely to create and configure other objects, hiding the construction details from the caller.

**Where it appears**:
- `sessionmaker(autocommit=False, autoflush=False, bind=engine)` — this **is** SQLAlchemy's Factory pattern by name: `SessionLocal` is a callable that manufactures pre-configured `Session` objects; nothing calling `SessionLocal()` needs to know *how* a session is configured.
- `gen_uuid()` (`db_models.py`) — a tiny factory function producing new primary key values, used as the `default=` for every table's `id` column.
- `create_access_token()` / `create_refresh_token()` — both are factories for token objects, encapsulating expiry calculation, signing, and (for refresh tokens) database persistence behind a single call.

**Why Factory here**: it centralizes "how do I correctly construct a valid X" in one place — if session configuration or token expiry logic needs to change, there's exactly one function to update, not every call site.

## 8.6 Builder (Present, via `prompt_engine.py`)

**What it is**: construct a complex object step by step, rather than via one giant constructor call, often assembling optional/conditional pieces.

**Where it appears**: every `build_*_prompt()` function in `services/prompt_engine.py` is a builder — `build_suggestions_prompt()` conditionally appends a `year_info` block (students only), a `work_info` block (professionals only), or a `job_seeker_info` block, plus domain-specific instruction blocks, before assembling the final prompt string. `build_day_details_prompt()` similarly conditionally includes a "pre-assigned practice problems" block only when problems were passed in.

```python
year_info = ""
if status == "Student":
    ...
    year_info = f"\n- College: {college}\n- Course: {course}..."
work_info = ""
if status == "Working Professional":
    ...
prompt = f"""... {year_info}{work_info}{job_seeker_info} ..."""
```

**Why Builder fits naturally here**: LLM prompts are long, highly conditional strings — assembling them piece by piece (rather than one giant f-string with dozens of inline ternaries) keeps each conditional block readable and testable in isolation.

**Alternative**: a templating engine (Jinja2) with conditional blocks (`{% if %}`) instead of Python f-string concatenation — would separate prompt *text* from prompt *logic* more cleanly, at the cost of an extra dependency and a less "just Python" feel. A reasonable alternative worth naming in an interview.

## 8.7 Strategy (Present, via Dictionary Dispatch)

**What it is**: define a family of interchangeable algorithms/behaviors, and select one at runtime based on context, without an `if/elif` chain checking every case explicitly at the call site.

**Where it appears**: `prompt_engine.py`'s `_get_domain_instructions()` and `_get_domain_day_instructions()`, and `email_service.py`'s domain-mentor-note dict in `build_chat_system_prompt()` — each maps a `field` string to a different instruction-text "strategy":
```python
instructions = {
    "Computer Science / IT": "...",
    "Mechanical Engineering": "...",
    ...
}
base = instructions.get(field, instructions["Other"])
```

**Why this counts as Strategy, not just "a dict"**: the *behavior* of prompt generation genuinely differs per field (different tools, different platforms, different tone), and the dispatch mechanism (a dict lookup with a default fallback) is a lightweight, Pythonic substitute for the classic OOP Strategy pattern (which would define a `PromptStrategy` interface with one subclass per field). For this project's scale (8 fields, plain string outputs, no shared mutable state per strategy), dictionary dispatch is simpler and equally correct — full class-based Strategy would be worth it only if each "strategy" needed to hold state or implement multiple related methods, not just return a string.

## 8.8 Decorator (Present, Idiomatically — Python's Built-in Decorator Syntax)

**What it is**: attach additional behavior to a function/method without modifying its internal code — literally the origin of Python's `@decorator` syntax.

**Where it appears, extensively**:
- `@router.post("/login")` + `@limiter.limit("10/minute")` — stacks routing registration and rate-limiting *around* the plain `login()` function, which itself contains zero rate-limiting logic.
- `@groq_retry` (built from `tenacity.retry(...)` in `groq_service.py`) — wraps every LLM-calling function with automatic retry-with-exponential-backoff on transient failures (`JSONDecodeError`, `ValidationError`, `ValueError`, `GroqError`), without any of that retry logic appearing inside the actual function bodies.

**Why this is worth naming explicitly in an interview**: it's a clean, concrete example of the Decorator pattern that most engineers already use daily without necessarily naming it — a good "connect the textbook pattern to code you already know" talking point.

## 8.9 Adapter (Loosely Present)

**What it is**: convert one interface into another that calling code expects, so incompatible systems can work together.

**Where it loosely appears**: `groq_service.py` sits between the raw `groq` Python SDK (whose response objects are the LLM provider's own shape — `completion.choices[0].message.content`) and the rest of the application, which only ever deals in plain Python `dict`/`list`/Pydantic objects. If the project ever switched LLM providers (e.g., to OpenAI or Anthropic), only `groq_service.py` would need to change — every route/service calling `generate_chat_response()`, `generate_roadmap_outline()`, etc. is insulated from the provider's actual SDK shape. This is Adapter-*ish* in spirit (isolating a third-party interface behind a stable internal one) even though it wasn't necessarily built with that label in mind.

**Frontend equivalent**: `lib/api.ts`'s `apiFetch()` adapts the browser's native `fetch()` API into a project-specific interface that automatically handles credentials and token refresh — calling code never touches raw `fetch()` directly.

## 8.10 Observer (Not Used at the Application Level)

**Honest assessment**: there is no application-level publish/subscribe or event-emitter system in this codebase — no `EventEmitter`, no domain events, no webhook dispatch. React's own internals (state updates triggering re-renders) are Observer-pattern-like *under the hood*, but that's framework machinery, not something this application's own code implements or needs to reason about directly.

**When you'd introduce a real Observer/event system**: if multiple, decoupled side effects needed to react to the same action — e.g., "when a roadmap is confirmed, send an analytics event, send a welcome email, AND kick off generation" — today, `confirm_custom_roadmap()` just does its one thing directly (schedule generation). If more independent reactions accumulated, an event-driven approach (emit a `RoadmapConfirmed` event, have separate listeners for generation/analytics/email) would keep them decoupled rather than piling into one function.

## 8.11 Retry / Resilience Pattern (Present, via `tenacity`)

Not a classic GoF pattern, but an important **architectural resilience pattern** worth including: `groq_retry` retries any LLM call up to 3 times with exponential backoff (2s, 4s, 8s) specifically on transient failure classes (malformed JSON, validation failure, provider-side errors) — never on a success path, and never infinitely. This is the same family of idea as a **Circuit Breaker** (which this project does *not* implement — after N consecutive failures, a circuit breaker would stop trying entirely for a cooldown period, rather than retrying every single call independently). A circuit breaker would be a sensible addition if the Groq API ever had extended outages, to avoid every concurrent request separately retrying against a service that's clearly down.

## 8.12 Summary Table

| Pattern | Used? | Where | Notes |
|---|---|---|---|
| MVC (adapted) | ✅ | routes / db_models+schemas / React frontend | View lives in a separate app, not server-rendered |
| Layered (Controller→Service→Repo→DB) | ⚠️ Partial | routes → services → DB directly | No Repository layer — see Part 2 §2.4 |
| Dependency Injection | ✅ | `Depends(get_db)`, `Depends(get_current_user)` | Most consistently applied pattern in the codebase |
| Singleton | ✅ | `limiter`, `engine`/`SessionLocal`, Groq `client` | Trade-off: doesn't share state across processes (rate limiter) |
| Factory | ✅ | `sessionmaker`, `gen_uuid()`, token-creation functions | Centralizes correct object construction |
| Builder | ✅ | `prompt_engine.py`'s `build_*_prompt()` functions | Conditional, step-by-step string assembly |
| Strategy | ✅ (dict dispatch) | domain-specific instruction dicts | Lightweight Pythonic substitute for class-based Strategy |
| Decorator | ✅ | `@limiter.limit`, `@groq_retry`, `@router.*` | Idiomatic Python decorator usage |
| Adapter | ⚠️ Loosely | `groq_service.py`, `lib/api.ts`'s `apiFetch` | Isolates third-party interfaces, not formally named as Adapter in the code |
| Observer | ❌ Not used | — | No event/pub-sub system; would matter if multiple independent reactions to one action emerged |
| Circuit Breaker | ❌ Not used | — | Retry-with-backoff exists (`tenacity`); a full circuit breaker doesn't |
| Repository | ❌ Not used | — | Routes/services query the ORM directly; biggest named architectural gap |

## 8.13 Interview Questions — Part 8

- *Q: Give me one design pattern you can point to directly in this code, not just in theory.* — `@limiter.limit("10/minute")` on top of `login()` — that's the Decorator pattern, literally: it wraps a function with additional behavior (rate limiting) without modifying the function's own body at all.
- *Q: Why is there no Repository pattern here, and would you add one?* — SQLAlchemy's ORM already provides a reasonably strong query abstraction, and the project's scale doesn't yet suffer from significant query-logic duplication or a need to swap data stores. I'd add one specifically around `Roadmap` lookups first, since "the user's active, confirmed roadmap" is queried with an identical filter in multiple route files today.
- *Q: What's the risk of the Singleton pattern as used for the rate limiter?* — It only shares state within a single process's memory. Running multiple worker processes or server instances means each gets its own independent counter, silently multiplying the effective rate limit — the fix is a shared external store (Redis) for the limiter's state.

## 8.14 Key Takeaways — Part 8

- This codebase applies several classic patterns naturally, without over-formalizing them: Dependency Injection (very consistently), Singleton, Factory, Builder, Decorator, and a lightweight dict-based Strategy.
- The most consequential *absent* pattern is a Repository layer — a reasonable simplification today, with an obvious first place to add one if the codebase grows (Roadmap queries).
- Observer/pub-sub and Circuit Breaker are both absent and both have a clear, nameable trigger for when they'd become worth adding.
