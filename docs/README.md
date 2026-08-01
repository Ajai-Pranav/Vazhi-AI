# VazhiAI Engineering Knowledge Base

A complete, from-scratch engineering deep-dive into the VazhiAI codebase — written to be usable for self-learning, onboarding a new developer, explaining the system to a client, and preparing for senior developer interviews.

This is a companion to the project's top-level [`README.md`](../README.md) (which covers setup and a feature summary for users/operators). This knowledge base instead explains **how the system is built and why**, file by file and concept by concept.

## How to Use This

- New to the project? Read in order, Part 1 → Part 11.
- Prepping for an interview? Jump straight to [Part 10](./07-strengths-and-interview-prep.md#part-10--interview-preparation) for the 20 Q&As and the 2-minute/5-minute pitches.
- Onboarding a new developer? Parts 2–5 are the technical reference; have them read Part 1 first for context.
- Explaining the project to a client? Part 1's simple explanations plus Part 10's 5-minute pitch are written for a mixed technical/non-technical audience.

## Table of Contents

| Part | Document | Covers |
|---|---|---|
| 1 | [00-overview.md](./00-overview.md) | Architecture, tech stack, folder structure, request lifecycle, alternatives considered, what's deliberately not used |
| 2 | [01-backend.md](./01-backend.md) | File-by-file backend reference; every backend concept (routing, DI, auth/JWT, validation, error handling, logging, transactions, rate limiting, security, and more) |
| 3 | [02-database.md](./02-database.md) | Full schema, ER diagram, keys/indexes/constraints, migrations, alternative designs |
| 4 | [03-frontend.md](./03-frontend.md) | File-by-file frontend reference; routing, state management, auth flow, styling, performance, rendering lifecycle |
| 5 | [04-api-reference.md](./04-api-reference.md) | Every API endpoint: request/response shapes, validation, auth, business logic, errors, examples |
| 6 & 7 | [05-auth-and-request-lifecycle.md](./05-auth-and-request-lifecycle.md) | Step-by-step auth flow (signup/login/refresh/logout) + one request traced end-to-end through every layer |
| 8 | [06-design-patterns.md](./06-design-patterns.md) | Design patterns actually used (and deliberately not used), with alternatives |
| 9, 10, 11 | [07-strengths-and-interview-prep.md](./07-strengths-and-interview-prep.md) | Strengths/weaknesses, 20 interview Q&As, 2-min/5-min pitches, cheat sheet, common mistakes |

## A Note on Honesty

Throughout this knowledge base, concepts that are **not** used in this project (Docker, CI/CD, WebSockets, microservices, a Repository layer, Redux, caching, RBAC, etc.) are called out explicitly, with an explanation of why they weren't needed yet and what would trigger adding them — rather than pretending they exist. In an interview, "we didn't need X because Y, and here's when we would" is a stronger answer than a vague or inflated one.
