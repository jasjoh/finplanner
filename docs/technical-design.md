# FinPlanner — Technical Design

Technical design for implementing the FinPlanner web app. This document is intended for **AI agents and engineers** to implement the application from the [Product Requirements](product-requirements.md) (PRD). When the PRD and this design conflict, the PRD is the source of truth; this document resolves technical choices and provides implementation-level detail.

**Document conventions**

- **MVP** = first shippable release (single user, single project, local-only, hardcoded auth). **v1** = post-MVP scope (multi-user, projects, Google Auth in non-local envs).
- Sections that apply only to v1 are labeled **(v1)**. Unlabeled sections apply to MVP unless noted.
- Tables: one row per line; do not wrap cell content across lines.
- Grep numbered sections: `^## [0-9]+\.`

---

## 1. Overview and goals

**Purpose:** Define stack, architecture, data model, API, and UI structure so an agent can implement the app without inferring unspecified decisions.

**Out of scope for this doc:** Step-by-step tutorials, exact code snippets, or third-party API docs. The agent should use this doc plus the PRD and standard references for the chosen stack.

**Implementation stance**

- Prefer **clarity and maintainability** over premature optimization.
- **No overengineering:** Do not build v1 multi-user or cloud features in the MVP; structure the code so they can be added later without rework.
- **Single codebase:** One repo; backend and frontend can be separate services or a combined app (e.g. Node server serving SPA + API). Choose one approach and document it below.

---

## 2. Tech stack

**Backend**

- **Runtime:** Node.js (24). Enables one language across backend and tooling; sufficient for local-only and future Docker/Kubernetes deployment.
- **Framework:** Express. Minimal; good for REST APIs and serving static frontend in development.
- **Database:** PostgreSQL. Required by PRD for MVP; no file-based or SQLite. Use a single database; no read replicas or sharding for MVP/v1.
- **ORM / query layer:** Use an ORM or query builder that supports migrations and type-safe access (e.g. Drizzle, Prisma, or Knex + raw types). Pick one and use it consistently.

**Frontend**

- **Framework:** React (with TypeScript). Use a supported, current major version.
- **Build:** Vite. Fast dev server and simple production build; integrates with React and TypeScript.
- **Routing:** React Router (single-page app; all routes client-side after load).
- **State:** Prefer local component state and React context (or a minimal store) for MVP. No requirement for Redux or similar unless complexity demands it.
- **HTTP client:** fetch or a thin wrapper (e.g. axios) for API calls. Use a single base URL from environment or config.
- **Styling:** CSS (plain, CSS Modules, or a utility-first approach like Tailwind). Choose one and document it. No design system requirement; keep UI clean and desktop-only (Chrome).

**Development and ops**

- **Language:** TypeScript for both backend and frontend. Strict mode recommended.
- **Package manager:** npm (or pnpm). Lockfile must be committed.
- **Environment:** Node version pinned via `.nvmrc` or `engines` in package.json. No runtime beyond Node and PostgreSQL for MVP.
- **Migrations:** Schema changes via migration files (timestamped or sequential). No schema-from-entity-only; migrations are the source of truth for DB shape.

**Explicitly out of scope for MVP**

- Google Auth, signup flows, project list, multi-user, sharing, super-admin.
- HTTPS, production hardening, Docker/Kubernetes (design so they can be added later).
- File import, bank connections, audit trail, data export.

---

## 3. Architecture

**High-level**

- **Client:** SPA (React) served by the backend in development; in production, same or static hosting with API base URL configured.
- **Server:** Single Node process. Serves: (1) REST (or REST-like) API for data and auth, (2) static assets and SPA fallback for MVP.
- **Database:** One PostgreSQL instance. All app data in one DB; no separate services (e.g. Redis) for MVP.

**Directory layout (suggested)**

Use a **monorepo** with two main application areas. Example:

```
finplanner/
  docs/                    # PRD, this design, other docs
  server/                  # Backend (Node + Express/Fastify)
    src/
      config/              # Env, DB, app config
      db/                  # Migrations, schema, queries/ORM
      routes/              # API route handlers (auth, projects, assumptions, etc.)
      services/            # Business logic (e.g. projection engine)
      middleware/          # Auth, validation, error handling
      index.ts
    package.json
  client/                  # Frontend (React + Vite)
    src/
      components/          # Reusable UI
      pages/               # Route-level views (Login, ProjectDetail, etc.)
      hooks/               # Shared hooks (e.g. useProject, useAuth)
      api/                 # API client helpers (fetch wrappers)
      types/               # Shared TS types (align with API)
      App.tsx
      main.tsx
    index.html
    package.json
  package.json             # Root: scripts to run server + client, shared tooling
```

Alternatively, keep `server/` and `client/` under `src/` in a single package. Whatever is chosen must be clearly documented in this section so the agent uses one layout consistently.

**Data flow**

- User actions in the UI trigger API calls (e.g. GET/POST/PATCH/DELETE).
- Server validates input, reads/writes PostgreSQL, returns JSON.
- Frontend updates local state and re-renders. No real-time or WebSocket for MVP.

---

## 4. Data model and schema

**MVP scope:** One user (identity implied; no `users` table if auth is hardcoded). One project per database (or one row in a `projects` table). All entities belong to that single project.

**v1 extension:** `users`, `projects`, project membership and sharing. For MVP the agent implements only the following; v1 tables (e.g. `users`, `project_members`) are out of scope.

**Shared enums (store in DB as enum type or CHECK constraint)**

- **Account tax treatment:** `roth` | `pre_tax` | `taxable` | `hsa` | `after_tax`. See PRD "Account tax-treatment enum."
- **Short-term goal frequency (recurring, MVP):** Every N years. Store as **frequency_interval_years** (integer >= 1): 1 = yearly, 2 = every 2 years, etc. No monthly or other cadences until v1.
- **Near-term goal category (MVP):** `vacations` | `home_improvement` | `miscellaneous` | `new_car`. Fixed set; goal **name** is free-form. No user-defined categories until v1.
- **Projection end type:** `user_age` | `partner_age` | `calendar_year`. Determines how many years/columns to compute and display.

**Core entities (MVP)**

- **project** (single row for MVP)
  - id (PK), name, created_at, updated_at.
  - projection_end_type, projection_end_value (e.g. age 95 or year 2050).
  - **Default (before user sets anything):** projection_end_type = `user_age`, projection_end_value = 95. Selector default is user age with value 95.
  - (v1: owner_id, etc.)

- **account**
  - id (PK), project_id (FK), name, tax_treatment (enum), balance_as_of_date, balance_amount_cents (integer; avoid float for money).
  - is_source_for_near_term_goals (boolean).
  - sort_order or similar for stable display order.
  - **Balance "as of" date is per account** (each account has its own date); no project-wide as-of date for MVP.
  - **MVP cap: max 50 accounts per project.** Reject POST if limit reached; return 400 with clear message. v1 removes hard limit per PRD.

- **income**
  - id (PK), project_id (FK), label (e.g. "Salary"), amount_cents, period (enum: monthly | annual). Store both; one is user-chosen, the other derived and stored per PRD. **MVP: exactly one income row per project** (single income source); multiple income sources in v1.

- **spending**
  - Same idea as income: label, amount_cents, period (monthly | annual). **MVP: exactly one spending row per project** (Cost of living only). One table; v1 may add multiple spending categories.

- **near_term_goal**
  - id (PK), project_id (FK), name (free-form), target_amount_cents, category (enum: vacations | home_improvement | miscellaneous | new_car — fixed set for MVP; no user-defined categories).
  - schedule_type: one_time | recurring.
  - For one_time: target_date.
  - For recurring: start_date, end_date, frequency_interval_years (integer >= 1; 1 = yearly, 2 = every 2 years, etc.).

- **assumptions**
  - One row per project (or key-value / JSONB per project). Fields match PRD Section 6, e.g. inflation_rate_pct, col_annual_cents (or monthly and derive), long_term_return_pct, short_term_return_pct, ss_claiming_age_user, ss_claiming_age_partner, ss_benefit_user_cents, ss_benefit_partner_cents, pre_tax_withdrawal_start_age, rmd_start_age, tax_rate_on_withdrawals_pct, income_growth_rate_pct. Use sensible defaults; store as numbers with clear units (percent, cents, age). **SS benefit default (MVP):** Use a **literal constant** for default ss_benefit_user_cents and ss_benefit_partner_cents (e.g. current-year maximum benefit); document the value and source in code or README so it is auditable and user-editable.

- **user_profile (v1)**
  - For MVP, store **user_age** and **partner_age** on `project` (no DOB; age only). Collect both; projection models partner Social Security from claiming age and benefit. v1 adds full user_profile.

**Naming and types**

- Use **snake_case** in DB and in API JSON for consistency with PostgreSQL. Frontend can use camelCase and map at the API boundary.
- Monetary amounts: **integer cents** in DB and API to avoid float errors.
- Dates: **ISO 8601 date** (YYYY-MM-DD) in API and DB.
- Percentages: store as decimal (e.g. 2.5 for 2.5%); avoid storing as 0.025 unless the team prefers that.

**Migrations**

- First migration: create enum types and tables above. No indexes beyond PK/FK for MVP unless needed for simple queries.

---

## 5. API design

**Style:** REST-like. JSON request and response bodies. Use standard HTTP methods and status codes.

**Base URL:** e.g. `/api`. All routes below are relative to that. Prefix with version only if needed later (e.g. `/api/v1`); for MVP `/api` is sufficient.

**Auth (MVP):** Hardcoded username/password in source. No signup. Options: (1) HTTP Basic, (2) POST `/api/login` returning a simple session token (or cookie) and middleware that checks it. Document which is used. For MVP, session can be in-memory (process restart logs everyone out).

**Endpoints (MVP)**

- **Auth**
  - POST `/api/login` — body: `{ "username", "password" }`. Returns 200 + session identifier or 401.
  - POST `/api/logout` — invalidate session; 204.
  - GET `/api/me` or `/api/session` — 200 with minimal user info if logged in; 401 if not. (MVP can return a fixed payload.)

- **Project (single project in MVP)**
  - GET `/api/project` — return the single project (id, name, projection_end_type, projection_end_value, user_age, partner_age). Create with defaults if none exists. **After first login: blank project** — default assumptions and projection-end defaults; no accounts; no income or spending rows until the user adds them; no seeded sample data.
  - PATCH `/api/project` — update project fields (name, projection_end_type, projection_end_value, user_age, partner_age). Validation: ages and end value must be valid (e.g. no negative ages).

- **Current state**
  - GET `/api/project/accounts` — list accounts.
  - POST `/api/project/accounts` — create account (body: name, tax_treatment, balance_amount_cents, balance_as_of_date, is_source_for_near_term_goals). **MVP:** Reject with 400 if project already has 50 accounts.
  - PATCH `/api/project/accounts/:id` — update account.
  - DELETE `/api/project/accounts/:id` — delete account.
  - **Income (MVP):** GET `/api/project/income` — return the single income (200) or 404 if none yet. POST `/api/project/income` — create the one income row (body: label, amount_cents, period); 400 if one already exists. PATCH `/api/project/income` — update it. No DELETE (one per project).
  - **Spending (MVP):** GET `/api/project/spending` — return the single spending/COL (200) or 404 if none yet. POST `/api/project/spending` — create the one spending row (body: label, amount_cents, period); 400 if one already exists. PATCH `/api/project/spending` — update it. No DELETE (one per project).

- **Near-term goals**
  - GET `/api/project/near-term-goals` — list.
  - POST `/api/project/near-term-goals` — create (name, target_amount_cents, category, schedule_type, target_date or start_date/end_date/frequency_interval_years).
  - PATCH `/api/project/near-term-goals/:id`, DELETE `/api/project/near-term-goals/:id`.

- **Assumptions**
  - GET `/api/project/assumptions` — return full assumptions object for the project.
  - PATCH `/api/project/assumptions` — partial update; validate and apply defaults for missing fields where appropriate.
  - POST `/api/project/assumptions/reset` — reset assumptions to defaults (MVP: include this action).

- **Yearly balance sheet (projection)**
  - GET `/api/project/projection` or `/api/project/yearly-balance-sheet` — query params or body: none (server uses project’s projection_end_type and value). Returns **structured data** for the table: e.g. `{ "years": [2025, 2026, ...], "rows": [ { "label": "...", "category": "...", "valuesByYear": { "2025": 12345, ... } }, ... ] }`. If projection cannot be computed, return **4xx** with a **specific error message** (e.g. "Missing cost of living," "Invalid SS claiming age," "Missing user age") so the user knows what to fix; do not return partial results (per PRD).

**Validation (server-side)**

- Enforce valid data on every write: no negative balance, no past target dates, valid enum values, valid ages. Return **400** with clear error payload (e.g. `{ "error": "Invalid", "fields": { "balance_amount_cents": "Must be non-negative" } }`). No cross-field balance checks (e.g. "debits exceed credits") per PRD.

**Idempotency and concurrency**

- MVP: no ETag or versioning. Simple read-after-write is sufficient.

---

## 6. Frontend structure

**Routing (MVP)**

- `/` — if not logged in → Login page; if logged in → redirect to project detail (single project).
- `/login` — login form (username, password). On success → `/`.
- `/project` (or `/`) — project detail with **tabs**: Current state, Assumptions, Yearly balance sheet.

**Pages / views**

- **Login:** Single form; submit to POST `/api/login`; on success set session (token or cookie) and redirect. Show error on 401.
- **Project detail (tabbed):**
  - **Current state:** List/edit accounts (name, tax treatment, balance, as-of date, "source for near-term goals"); edit single income and single spending (COL). Accounts: add/edit/delete (MVP: max 50; disable add or show message when at limit); income and spending (MVP): edit only (one each). Validation errors shown inline or at top; do not allow save until valid.
  - **Assumptions:** Form or grouped inputs for all assumptions in PRD Section 6 (inflation, COL, returns, SS claiming age and benefit for user and partner, pre-tax withdrawal age, RMD age, tax rate, income growth). Reset-to-default action. Same validation rule: block invalid values.
  - **Yearly balance sheet:** Read-only. One table: rows = balance sheet line items (aggregated by account category per PRD), columns = years. Horizontal scroll. Projection end selector (user age / partner age / calendar year) that only changes how many columns are shown and how many years are calculated; refetch projection after change. If API returns error (projection not computable), show message and no table.

**Components**

- Reusable: Button, Input, Select, Table, Tabs, Card/Layout, ErrorMessage. No need for a large component library; keep minimal.
- Forms: Use controlled components; validate on submit and optionally on blur. Display server-side validation errors when returned.

**State**

- Auth: context or simple store (e.g. user/session from GET `/api/me` on load); redirect to login when 401.
- Project data: fetch on tab or page load; after mutations (POST/PATCH/DELETE), refetch or update local state so UI reflects server state.
- No global cache layer required for MVP; avoid stale data by refetching after updates.

**API client**

- Centralized base URL (env or config). Helper functions per resource (e.g. `getProject()`, `updateAccounts()`, `getProjection()`). Include session (cookie or Authorization header) on every request. On 401, clear session and redirect to login.

**Accessibility and browser**

- Desktop only; target modern Chrome. No formal WCAG for v1; use semantic HTML and basic labels so the app is usable.

---

## 7. Auth (MVP vs v1)

**MVP**

- Username and password **hardcoded in source code** (e.g. in server config or a single constants file). No env var or config file for credentials per PRD.
- No signup. Login only. Session: in-memory (e.g. a Map of token → userId). No HTTPS requirement.
- Single project: after login, user always sees the one project; no project list or project creation.

**v1 (reference only; do not implement in MVP)**

- Environment variable selects environment (local vs other). Local: username/password (can remain or move to config). Other: Google Auth (Gmail sign-in). Account created on first sign-in; project list; create/delete project; sharing with view/edit.

---

## 8. Validation rules (summary)

- **All user input:** Must be valid before save. Block invalid data; show errors in UI and return 400 from API.
- **Accounts:** balance_amount_cents >= 0; balance_as_of_date present; tax_treatment in enum; name non-empty. **MVP:** Max 50 accounts per project; reject create when at limit.
- **Income / spending:** amount_cents >= 0; period in { monthly, annual }; label non-empty.
- **Near-term goals:** target_amount_cents >= 0; target_date (if one-time) not in past; recurring: start_date <= end_date; frequency_interval_years >= 1.
- **Assumptions:** numeric values in reasonable ranges (e.g. rates between 0 and 100); ages positive; SS benefit >= 0.
- **Project:** projection_end_value and user_age, partner_age valid (e.g. positive ages).
- **No cross-field validation** (e.g. "total debits must not exceed account balance") and **no partial projection**: if projection cannot be computed, return error with a **specific message** (e.g. missing COL, invalid SS claiming age) so the user can correct the issue; do not show partial results.

---

## 9. Projection engine (yearly balance sheet)

**Purpose:** Produce a year-by-year projected balance sheet from current state and assumptions. Output is **raw data only** (no recommendations or gap messaging).

**Inputs**

- Current state: accounts (balances, tax treatment, as-of date), income, spending (e.g. COL).
- Assumptions: inflation, COL, long/short-term returns, SS claiming age and benefit (user + partner), pre-tax withdrawal start age, RMD age, tax rate on withdrawals, income growth.
- Projection end: user age, partner age, or calendar year (determines number of years to compute).
- Near-term goals: the projection **shall** deduct goal amounts from "source for near-term goals" accounts in the years they are due (per schedule). No progress display for MVP; the yearly balance sheet reflects these draws for projection consistency.

**Logic (high-level)**

- **Time steps:** Year-by-year. Start from "as of" state; advance one year at a time until projection end.
- **Income:** Apply income growth until retirement (e.g. when user/partner reach claiming or a defined retirement age if needed). Model Social Security from claiming age for user and partner; use SS benefit and inflation.
- **Spending:** COL (and any other spending) grows with inflation each year.
- **Near-term goals:** For recurring/one-time goals, deduct from designated accounts in the year(s) they are due (per schedule). No progress display; just use target amount and date/schedule.
- **Withdrawal order:** Taxable → pre-tax → Roth (and HSA/After-tax per product rules). Apply tax on taxable withdrawals using tax_rate_on_withdrawals; RMD from pre-tax when age >= RMD start age.
- **Returns:** Apply long-term and short-term nominal returns to appropriate account types (e.g. savings vs investment). Inflation is used for COL and nominal SS; real vs nominal handling must be consistent (e.g. all nominal with inflation-adjusted spending).
- **Output:** Rows aggregated by **account category** (e.g. "Taxable", "Pre-tax", "Roth") per PRD; columns = years. Return structure as in Section 5 (e.g. years array + rows with valuesByYear).

**Implementation note**

- Implement the engine as a **pure function** or a small service that takes project state + assumptions + projection end and returns the table data. No DB access inside the engine; all data passed in. This allows testing and reuse. The API handler loads project, accounts, income, spending, goals, assumptions from DB and calls the engine.

**Edge cases**

- Missing assumption or invalid input → return **specific error message** (e.g. "Missing cost of living," "Invalid SS claiming age"); do not compute partial result.
- Social Security is always modeled (no "no SS" option).

---

## 10. Environment and configuration

**Environment variable**

- e.g. `NODE_ENV=development` or `APP_ENV=local`. Use it to select config (DB URL, auth method, API base URL for client). For MVP, "local" only.

**Config contents**

- **Database:** Connection URL (e.g. `DATABASE_URL`). For local dev, default to `postgresql://localhost:5432/finplanner` or similar.
- **Server:** Port (e.g. 3000 or 5000).
- **Client:** API base URL (e.g. `http://localhost:3000/api` for dev). Set via env at build time or runtime (e.g. `import.meta.env.VITE_API_URL` with Vite).

**Secrets**

- MVP: credentials hardcoded in source. No .env for secrets; .env can hold non-secret defaults (DB URL, port). Do not commit real production secrets when they are introduced later.

---

## 11. Build order and implementation phases

An agent should implement in roughly this order so that each step has the necessary foundation.

**Phase 1: Foundation**

1. Initialize repo: root package.json, TypeScript config, lint/format (e.g. ESLint, Prettier).
2. Backend: Express (or Fastify), health check route (e.g. GET `/api/health`), config from env, DB connection. No auth yet.
3. Database: Create PostgreSQL database; add migration tool; first migration with enums and tables (project, account, income, spending, near_term_goal, assumptions). Ensure one project exists with default assumptions and projection defaults; no income or spending rows until user adds them. No seeded accounts or sample data (blank project after first login).
4. Frontend: Vite + React + TypeScript, React Router, minimal layout. Single "Hello" or login placeholder page. Proxy API to backend in dev.

**Phase 2: Auth and project**

5. MVP auth: Hardcoded username/password; POST `/api/login` and session (in-memory). Middleware to protect API routes. GET `/api/me`. Frontend: Login page; redirect to `/project` on success; use session on all API calls; redirect to login on 401.
6. Project API: GET/PATCH `/api/project` (single project). Frontend: load project in project layout; show name and projection-end controls (type + value, user_age, partner_age).

**Phase 3: Current state**

7. Accounts API: CRUD. Frontend: Current state tab — list accounts, add/edit/delete, validate (non-negative balance, valid enum, etc.).
8. Income and spending API: GET (200 or 404), POST (create first), PATCH (one income, one spending per project). Frontend: Income and spending sections in Current state tab; create first income/spending when none; single form each; period selector (monthly/annual) and stored derived value.
9. Near-term goals API: CRUD. Frontend: Goals section; one-time vs recurring; category; dates and frequency_interval_years (every N years). Validation (no past dates, valid amounts, interval >= 1).

**Phase 4: Assumptions**

10. Assumptions API: GET/PATCH and POST reset. Defaults in code or migration. Frontend: Assumptions tab; form for all fields; **Reset to default** button/action.

**Phase 5: Projection**

11. Projection engine: Implement core logic (year-by-year, withdrawal order, SS, COL, returns, goal draws). Unit tests with fixed inputs recommended.
12. Projection API: GET `/api/project/projection` (or chosen path). Load project data and assumptions; call engine; return table or 4xx with specific error message. Frontend: Yearly balance sheet tab; projection-end selector; fetch and render table; horizontal scroll; show specific error message when API returns 4xx.

**Phase 6: Polish**

13. Validation: Ensure all server-side validation rules from Section 8 are applied and error payloads are clear. Frontend: display validation errors; block submit when invalid.
14. UX: Tip on account creation (do not use real bank name or account number). US locale for numbers and dates. No PII or account number prompts anywhere.
15. README: How to install dependencies, set up PostgreSQL, run migrations, start server and client, and log in (with the hardcoded MVP credentials).

**v1 and later**

- Do not implement multi-user, project list, Google Auth, sharing, or super-admin in MVP. After MVP, add users table, project ownership, project list view, and environment-based auth per PRD Section 1 and 7.

---

## 12. References

- [Product Requirements](product-requirements.md) — source of product behavior and scope.
- [Project context](.cursor/rules/project-context.mdc) — role and product vision.
- Stack docs: Express, React, Vite, PostgreSQL, and chosen ORM/migration tool — use official or widely adopted guides for setup and patterns.

---

## 13. Questions to be answered

Clarification questions for the decision maker to tighten scope and reduce ambiguity. Resolve before or during implementation.

**All questions in this section have been resolved.** Decisions are reflected in the body of this document (Sections 2–12).
