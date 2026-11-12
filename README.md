# Movie Memory

Built as part of the **Scowtt Full-Stack Software Engineer take-home exercise**.

## Table of Contents

- [Movie Memory](#movie-memory)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Tech Stack](#tech-stack)
  - [Setup](#setup)
    - [Prerequisites](#prerequisites)
    - [Steps](#steps)
    - [Google OAuth Client](#google-oauth-client)
    - [Scripts](#scripts)
  - [Environment Variables](#environment-variables)
  - [LLM Provider](#llm-provider)
  - [Database Migrations](#database-migrations)
  - [Architecture Overview](#architecture-overview)
    - [Request Flow](#request-flow)
    - [Project Structure](#project-structure)
    - [Authentication](#authentication)
    - [Data Model](#data-model)
    - [Validation](#validation)
    - [Fact API Layers](#fact-api-layers)
    - [HTTP Responses (`GET /api/fact`)](#http-responses-get-apifact)
    - [Security](#security)
  - [Variant Choice](#variant-choice)
  - [Variant A Implementation](#variant-a-implementation)
    - [1. 60-Second Cache](#1-60-second-cache)
    - [2. Burst Protection — Postgres Advisory Lock](#2-burst-protection--postgres-advisory-lock)
    - [3. Failure Handling](#3-failure-handling)
    - [4. Tests](#4-tests)
  - [Testing](#testing)
    - [Coverage (24 tests)](#coverage-24-tests)
  - [Key Tradeoffs](#key-tradeoffs)
  - [Known Limitations](#known-limitations)
  - [Improvements With 2 More Hours](#improvements-with-2-more-hours)
  - [AI Usage](#ai-usage)
  - [Author](#author)

---

## Overview

Movie Memory is a full-stack web app where users sign in with Google, save their favorite movie, and receive AI-generated fun facts about it.

**Features**

- Google sign-in with first-time onboarding and returning-user dashboard
- Favorite movie saved with server-side validation
- Dashboard showing name, email, photo (with fallbacks), favorite movie and a fun fact
- **Variant A:** 60-second fact cache, burst/duplicate protection, LLM failure fallback, backend tests

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| Framework | Next.js 16 (App Router), React |
| Styling | Tailwind CSS |
| Database | PostgreSQL, Prisma 7 |
| Authentication | Auth.js v5 (Google OAuth) |
| AI | OpenAI SDK (OpenAI API or any OpenAI-compatible endpoint) |
| Testing | Vitest |

---

## Setup

### Prerequisites

- Node.js 22+
- PostgreSQL
- Google OAuth client
- OpenAI API key, or a Gemini API key (see [LLM Provider](#llm-provider))

### Steps

```bash
git clone <repo-url>
cd movie-memory
npm install                      # also runs prisma generate
cp .env.example .env             # then fill in values
npx prisma migrate dev           # creates the database if missing, applies migrations
npm run dev                      # http://localhost:3000
```

PostgreSQL must be running; the database itself (name from `DATABASE_URL`) is created by Prisma.

### Google OAuth Client

In Google Cloud Console → Google Auth Platform:

- **Audience:** External, Testing mode, add your Gmail as a test user
- **Client type:** Web application
- **Authorized JavaScript origin:** `http://localhost:3000`
- **Authorized redirect URI:** `http://localhost:3000/api/auth/callback/google`

### Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` / `npm start` | Production build / server |
| `npm run lint` | Run ESLint |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string |
| `AUTH_SECRET` | Yes | Session cookie encryption key. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `AUTH_GOOGLE_ID` | Yes | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | Yes | Google OAuth client secret |
| `OPENAI_API_KEY` | Yes | OpenAI API key |
| `OPENAI_MODEL` | Yes | Model name, e.g. `gpt-4o-mini` |
| `OPENAI_BASE_URL` | No | Empty = OpenAI API. Set to use an OpenAI-compatible endpoint |
| `TEST_DATABASE_URL` | Tests only | Separate database; name must contain `test` |

- All variables are validated at startup with Zod (`src/lib/env.ts`).
- Missing or invalid variables fail fast, reporting names only, never values.

---

## LLM Provider

The app was **developed and tested with Google Gemini** (free tier) through its OpenAI-compatible endpoint. The code uses the official OpenAI SDK, so switching to OpenAI is configuration only.

| Provider | `OPENAI_BASE_URL` | `OPENAI_MODEL` | `OPENAI_API_KEY` |
|---|---|---|---|
| OpenAI | *(leave empty)* | e.g. `gpt-4o-mini` | OpenAI API key |
| Gemini (used in development) | `https://generativelanguage.googleapis.com/v1beta/openai/` | e.g. `gemini-3.6-flash` | Gemini API key (Google AI Studio) |

- No code changes are needed to switch providers; restart the server after editing `.env`.
- Request format, timeout, retry and error handling are identical for both.

---

## Database Migrations

| Command | When |
|---|---|
| `npx prisma migrate dev` | Setup: create the database if missing and apply migrations; also used to create new migrations after schema changes |
| `npx prisma migrate deploy` | Apply committed migrations to an existing database (e.g. production) |
| `npx prisma studio` | Inspect data |

---

## Architecture Overview

### Request Flow

```
Browser
 ├── /                Signed in? → /onboarding (no movie) or /dashboard
 ├── /onboarding      Form → server action → validate → save → /dashboard
 ├── /dashboard       Server-rendered profile; FactCard fetches fact client-side
 │     └── GET /api/fact
 │           └── service.ts      cache · lock · fallback
 │                ├── repository.ts   queries · advisory lock
 │                └── generator.ts    LLM call
 └── /api/auth/*      Auth.js (OAuth callback, sign-in, sign-out)
```

### Project Structure

```
prisma/                 schema + migrations
src/
├── auth.ts             Auth.js config
├── app/                pages, server actions, API routes
├── components/         FactCard, UserAvatar, SignIn/SignOut buttons
└── lib/
    ├── env.ts          validated env
    ├── db.ts           Prisma client singleton
    ├── session.ts      getCurrentUser / requireUser
    ├── users.ts        user data access
    ├── validation.ts   movie title schema
    └── facts/          service · repository · generator
tests/                  mirrors src/ · helpers · setup
```

### Authentication

| Decision | Detail |
|---|---|
| Provider | Auth.js v5, Google, Prisma adapter (creates `User` + `Account`) |
| Sessions | JWT in encrypted `httpOnly` cookie; holds user ID only |
| Protection | Server-side `requireUser()` on every protected page; `auth()` in API route |
| Routing | All logins return to `/`; no movie → `/onboarding`, else `/dashboard` |
| "First-time user" | Defined as `favoriteMovie IS NULL` (abandoned onboarding resumes) |
| Double sign-in | Button disabled while redirecting (prevents PKCE errors) |

### Data Model

| Table | Columns | Notes |
|---|---|---|
| `User` | `id`, `name?`, `email?`, `image?`, `favoriteMovie VARCHAR(100)?` | Movie null until onboarding |
| `Account` | `provider`, `providerAccountId`, `userId`, tokens | Required by Auth.js adapter |
| `Fact` | `id`, `userId`, `movieTitle VARCHAR(100)`, `content`, `createdAt` | Index `(userId, movieTitle, createdAt DESC)` |

- **`favoriteMovie` on `User`:** one movie per user; no extra table or join.
- **`movieTitle` snapshot on `Fact`:** facts stay tied to the movie they describe.
- **Composite index:** matches the cache lookup exactly.
- **Defense in depth:** length enforced by Zod and `VARCHAR(100)`.
- **Cascade deletes:** removing a user removes their accounts and facts.
- **No `Session` / `VerificationToken` tables:** unused with JWT sessions and Google-only login.

### Validation

- Rule: trimmed, 1–100 characters (`src/lib/validation.ts`).
- Server action is authoritative: re-checks session, blocks repeat onboarding, validates, saves.
- Client mirrors the rule for UX: live counter, Save disabled when invalid, explicit error instead of silent truncation.

### Fact API Layers

| Layer | File | Responsibility |
|---|---|---|
| Route | `app/api/fact/route.ts` | Session → service → HTTP; accepts no parameters |
| Service | `lib/facts/service.ts` | Fact policy; returns typed result; generator injected |
| Repository | `lib/facts/repository.ts` | Queries + advisory lock; accepts transaction client |
| Generator | `lib/facts/generator.ts` | LLM call; strict JSON output validated by Zod |

### HTTP Responses (`GET /api/fact`)

| Status | Case |
|---|---|
| 200 | Fact returned; `source`: `generated` · `cache` · `fallback` |
| 401 | Not signed in |
| 409 | No favorite movie |
| 422 | LLM does not recognize the title (nothing stored) |
| 503 | Generation failed, no fallback available |

### Security

- Identity from session only; fact API has no user-controlled input.
- All queries scoped by session user ID; responses exclude user IDs.
- Secrets in `server-only` modules; no `NEXT_PUBLIC_` secrets.
- Prompt injection mitigations: title passed as quoted data, instruction to ignore embedded instructions, strict JSON schema, 100-character cap.
- Missing Google profile data: name → email prefix; photo → initials avatar.

---

## Variant Choice

- Role emphasizes backend integrations, data stores, and secure systems.
- Variant A exercises concurrency, data integrity, and failure handling.
- Complexity is isolated in one module, making guarantees directly testable, including real concurrent requests against Postgres.

---

## Variant A Implementation

### 1. 60-Second Cache

- Looks up newest fact for user + movie.
- Age `< 60s` → return it with `source: "cache"`; otherwise generate.
- Cache store is the `Fact` table itself.

### 2. Burst Protection — Postgres Advisory Lock

```
Request A: lock → re-check → generate → store → unlock
Request B: lock (waits) ─────────────────────→ re-check → fresh → return cached
```

- **Fast path:** fresh fact returned without locking.
- **Lock:** `pg_advisory_xact_lock(hashtext(userId), hashtext(movieTitle))` inside a transaction.
- **Re-check under lock:** prevents duplicate generation.
- **Scope:** per user + movie; different users never block each other.
- **Release:** automatic on commit, rollback, or crash.

| Alternative | Rejected because |
|---|---|
| In-memory lock | Single process only; breaks with multiple instances |
| Unique constraint per 60s window | Fixed buckets don't match "less than 60 seconds old" |
| "In progress" flag | Needs cleanup if a request dies mid-generation |

### 3. Failure Handling

- LLM client: 10s timeout, 1 retry per attempt; any attempt that exceeds the 30s transaction limit also falls back gracefully.
- On any failure (API error, timeout, malformed output, transaction timeout):
  - Latest fact for current movie exists → return it, `source: "fallback"`, UI shows notice.
  - None → friendly error with retry button.
- Full errors logged server-side only.

### 4. Tests

- Cache window and authorization covered, plus burst and failure paths (see [Testing](#testing)).

---

## Testing

```bash
npm test
```

- Runs against a real Postgres test database (`TEST_DATABASE_URL`).
- Test setup creates the database if missing and rebuilds it from migrations on every run.
- Safety guard: refuses to run if the test URL is missing, equals `DATABASE_URL`, or lacks `test` in its name.
- Only the LLM (and the session, in route tests) is mocked.

### Coverage (24 tests)

| Area | Cases |
|---|---|
| Movie validation | Trimming, empty, spaces only, exact max, max + 1, length after trim |
| Fact service | Generate and store, no movie, unknown movie stores nothing, failure stores nothing |
| 60-second cache | < 60s returns cache (no LLM call), > 60s regenerates, exactly 60s expired, isolated per movie and per user |
| Burst protection | 3 concurrent requests → 1 LLM call, 1 row; different users don't block each other |
| Failure handling | Falls back to older fact; never to another movie's fact |
| Authorization (route) | 401 without session, never returns another user's fact, no user IDs in response, 409 without movie |

---

## Key Tradeoffs

| Decision | Benefit | Cost |
|---|---|---|
| Database as cache (vs. Redis / in-memory) | Single source of truth; multi-instance safe; no extra infra | One indexed query per request; Redis preferable at scale |
| Advisory lock in transaction | Correct across instances; auto-release | Waiting requests each hold a pooled DB connection; many simultaneous tabs could exhaust the pool (per-user rate limiting would prevent this) |
| Waiters retry during outage | Simple logic | Sequential LLM retries while the API is down; long waits can hit the 30s transaction limit, which then falls back gracefully |
| App-server clock for freshness | Simple comparison | Clock skew with remote DB could shift window slightly |
| Client-side fact loading | Dashboard renders instantly | Brief loading state |
| No middleware | Single security boundary | Unauthenticated requests reach page code before redirect |
| Configurable `OPENAI_BASE_URL` | Free development with Gemini; OpenAI by configuration | Developed against Gemini; OpenAI path uses the same SDK and code but was not run against a paid OpenAI key |

---

## Known Limitations

- Favorite movie cannot be edited after onboarding; a misspelled title cannot be corrected.
- AI-generated facts may occasionally be inaccurate.

---

## Improvements With 2 More Hours

- Edit favorite movie from dashboard (cache keyed by movie resets naturally).
- Per-user rate limiting on `/api/fact`.
- Playwright end-to-end tests for login → onboarding → dashboard.
- GitHub Actions CI: lint, type check, tests.
- `docker-compose.yml` for Postgres.
- Deployed live demo.

---

## AI Usage

- Used Claude as a pair programmer for planning, design discussion, code drafts, and explanations of unfamiliar tools (Prisma 7, Auth.js v5, Postgres advisory locks).
- Built incrementally; ran, reviewed, and tested every change before committing.
- Made final design and scope decisions, including:
  - Explicit validation error instead of silently truncating long titles.
  - Not storing "unknown movie" responses so the fact table holds only real facts.
  - Structured JSON model output validated with Zod.
  - Database-backed cache and lock over in-memory alternatives.
  - Separate `tests/` folder.
- Verified behavior manually in the browser and through automated tests.

---

## Author

Soumya Ganesh