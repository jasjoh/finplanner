# FinPlanner — Project Plan

Development plan for implementing the FinPlanner MVP per [Product Requirements](product-requirements.md) and [Technical Design](technical-design.md). This document defines high-level phases with entry/exit criteria and a task-level breakdown so that an agentic AI can perform the work.

**Conventions**

- **MVP** = first shippable release (single user, single project, local-only, hardcoded auth).
- Phases are sequential unless noted; exit criteria of one phase are the entry criteria of the next where applicable.
- Tasks are written for an AI agent: each task is self-contained with inputs, outputs, and references to the tech design or PRD where relevant.

---

## Phases (high level)

| Phase | Name                               | Entry criteria                                                                                                                  | Exit criteria                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | Foundation & environment           | PRD and technical design are the source of truth; repo exists.                                                                  | Monorepo with `server/` and `client/` is runnable; PostgreSQL is used via TypeORM; migrations run; HTTP Basic auth middleware rejects unauthenticated requests; developer can start server and client with a single command (or two documented commands).                                                                                                                                                                                                  |
| **2** | Data model & API — current state   | Phase 1 complete. Database is reachable and auth middleware is in place.                                                        | Project (single row) is readable/updatable; accounts, income, and spending have full CRUD via REST API; validation rules from technical design Section 8 are enforced; API returns camelCase JSON and uses integer cents and ISO dates; 50-account cap is enforced on create.                                                                                                                                                                              |
| **3** | Assumptions & project settings     | Phase 2 complete. Current-state entities are persisted and exposed via API.                                                     | Assumptions (one per project) are stored and editable via GET/PATCH; POST reset-to-defaults exists; project fields (projection_end_type, projection_end_value, user_age, partner_age) are PATCHable; validation and defaults match PRD Section 6 and technical design Section 8.                                                                                                                                                                           |
| **4** | Near-term goals                    | Phase 3 complete. Assumptions and project settings are in place.                                                                | Near-term goals CRUD API exists; schedule_type (one_time vs recurring), target_date, start_date/end_date/frequency_interval_years and category enum are implemented; validation from technical design Section 8 is enforced; API is documented in this plan or the technical design.                                                                                                                                                                       |
| **5** | Projection engine & projection API | Phase 4 complete. All inputs to the projection (accounts, income, spending, goals, assumptions, project) are available via API. | A pure projection engine (no DB access) takes project state + assumptions + projection end and returns yearly balance sheet structure; GET `/api/project/projection` returns the structure from technical design Section 5 and returns 4xx with a specific error message when projection cannot be computed; engine is unit-tested; withdrawal order, COL, SS, near-term goal draws, and aggregation by account category match technical design Section 9. |
| **6** | Frontend integration & MVP polish  | Phase 5 complete. Projection API is implemented and tested.                                                                     | Login page and Basic auth flow work; project detail has three tabs (Current state, Assumptions, Yearly balance sheet); all CRUD and projection are usable from the UI; validation errors are shown; projection end selector refetches projection; no partial projection shown on error; desktop Chrome is supported; MVP is feature-complete and runnable locally.                                                                                         |

---

## Phase breakdown

### Phase 1: Foundation & environment

**Objective:** Establish the monorepo, tooling, database, and auth so that an agent (or developer) can run the app and all subsequent work builds on this base.

**References:** Technical design Sections 2 (tech stack), 3 (architecture, directory layout), 10 (environment and configuration); PRD MVP scope and environment.

---

#### Task 1.1 — Initialize monorepo and root tooling

**Description:** Create the repository structure and root-level configuration so that both server and client can be developed and run from the same repo.

**Instructions:**

- Create a root `package.json` with `pnpm` as the package manager. Include a `name` (e.g. `finplanner`), `private: true`, and scripts that delegate to `server` and `client` (e.g. `dev`, `build`, `test` running in both workspaces or via a single dev command). Use pnpm workspaces: add a `packages` or list `server` and `client` in `workspaces` so that `pnpm install` at root installs dependencies for both.
- Pin Node version: add `.nvmrc` with the version specified in the technical design (e.g. Node 24) or set `engines.node` in root `package.json`.
- Use TypeScript in strict mode for the project. Each of `server` and `client` will have their own `tsconfig.json`.
- Ensure the lockfile (e.g. `pnpm-lock.yaml`) is committed.

**Acceptance:** From repo root, `pnpm install` succeeds; `pnpm run <script>` can run workspace scripts. Node version is documented and pinned.

**Outputs:** Root `package.json`, `pnpm-workspace.yaml` (or equivalent), `.nvmrc` or `engines`, lockfile in repo.

---

#### Task 1.2 — Initialize server package (Express + TypeScript)

**Description:** Create the backend application under `server/` with Express and TypeScript, and minimal health or root route so the server can be started and verified.

**Instructions:**

- Under `server/`, create `package.json` with dependencies: `express`, `typescript`, and types as needed; devDependencies for build and run (e.g. `ts-node` or `tsx`, or build script with `tsc`). Use pnpm.
- Create `server/src/index.ts` (or equivalent) that: loads configuration (port 3001), creates an Express app, and starts listening. Add a simple GET route (e.g. `GET /api/health`) that returns a 200 and a small JSON payload so that the server is clearly running.
- Configure TypeScript for the server (e.g. `server/tsconfig.json`) with strict mode. Ensure the server can be run in development (e.g. `pnpm run dev` using `tsx` or `ts-node`).

**Acceptance:** Running the server (e.g. `pnpm run dev` from `server/`) starts the process and `GET /health` (or chosen path) returns 200.

**Outputs:** `server/package.json`, `server/src/index.ts`, `server/tsconfig.json`, and any minimal config loading (e.g. `server/src/config/index.ts` for port).

**References:** Technical design Section 2 (Node, Express), Section 3 (directory layout: `server/src/`).

---

#### Task 1.3 — Configure PostgreSQL and TypeORM

**Description:** Add PostgreSQL as the database and TypeORM as the ORM, with connection and migration capability. No application entities or routes yet; only connection and migration runner.

**Instructions:**

- Add dependencies: `pg`, `typeorm`, and `reflect-metadata` (and any required peer deps per TypeORM docs). Configure the DataSource (or connection) to read `DATABASE_URL` from the environment, with a default for local dev (e.g. `postgresql://localhost:5432/finplanner`). Document the default in a comment or README.
- Create a minimal migration setup: TypeORM migrations in a dedicated folder (e.g. `server/src/db/migrations/`). Provide a script or documented command to run migrations (e.g. `pnpm run migration:run`). Do not create application tables in this task; a single empty migration is acceptable to verify the pipeline.
- Ensure the server (or a separate CLI script) can run migrations on startup or via command, and that the app does not start successfully if the DB is unreachable (or document that migrations are run manually before start). Prefer running migrations explicitly via a script for clarity.

**Acceptance:** `DATABASE_URL` (or default) connects to PostgreSQL; running the migration command applies migrations; no runtime error when connecting from the server.

**Outputs:** TypeORM DataSource config, migration runner script, one minimal or placeholder migration to verify the pipeline.

**References:** Technical design Section 2 (PostgreSQL, TypeORM, migrations as source of truth), Section 10 (DATABASE_URL).

---

#### Task 1.4 — Implement HTTP Basic auth middleware

**Description:** Add middleware that validates HTTP Basic credentials on every request to protected routes. Credentials are hardcoded in source (e.g. in a constants file).

**Instructions:**

- Define a single username and password in source code (e.g. `server/src/config/constants.ts`. Do not use environment variables or config files for these credentials.
- Implement Express middleware that: reads the `Authorization` header; if missing or not `Basic <base64>`, responds with 401 and a short JSON body (e.g. `{ "error": "Unauthorized" }`); if present, decodes the base64 value and compares username and password to the hardcoded values; if they do not match, responds with 401; if they match, calls `next()`.
- Create separate sections for authenticated and unauthenticated routes. Apply this middleware to all authenticated routes. Do not add auth endpoints (no POST `/api/login`, GET `/api/me`). Ensure the existing health/root route is under the unauthenticated routes section and remains reachable without auth.

**Acceptance:** Unauthenticated request to `GET /api/anything` returns 401; request with valid `Authorization: Basic <base64(username:password)>` passes through middleware.

**Outputs:** Middleware file (e.g. `server/src/middleware/auth.ts`), credentials in source, middleware mounted on API routes.

**References:** Technical design Section 5 (Auth MVP), Section 7 (MVP auth).

---

#### Task 1.5 — Initialize client package (React + Vite + TypeScript)

**Description:** Create the frontend application under `client/` with React, Vite, and TypeScript, and a minimal root view so the client can be built and viewed in the browser.

**Instructions:**

- Under `client/`, create the app using Vite with the React + TypeScript template (e.g. `pnpm create vite . --template react-ts` or equivalent). Use pnpm.
- Configure Vite so that the dev server runs (on port 3000) and the app has a single root component that renders a simple heading or "FinPlanner" so the app loads. Set up React Router: install `react-router-dom` and add a minimal router with a single route (e.g. `/` rendering the placeholder view).
- Add environment handling for the API base URL: e.g. `VITE_API_URL` with a default of `http://localhost:3001/api` for development. Document this in a comment or README.
- Ensure `pnpm run dev` from `client/` starts the Vite dev server and the app is viewable in Chrome.

**Acceptance:** `pnpm run dev` in `client/` starts the dev server; opening the app in Chrome shows the placeholder; build (`pnpm run build`) succeeds.

**Outputs:** `client/package.json`, `client/vite.config.ts`, `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`, minimal router and one view; `VITE_API_URL` usage.

**References:** Technical design Section 2 (React, Vite, TypeScript), Section 3 (client layout), Section 10 (API base URL).

---

#### Task 1.6 — Document run scripts and environment

**Description:** Provide clear instructions so that an agent or developer can start the full stack (database, server, client) and verify the foundation.

**Instructions:**

- In the root or in `docs/`, add or update a "Running the app" section (e.g. in README or `docs/setup.md`). Include: (1) Prerequisites: Node version (from .nvmrc or engines), pnpm, PostgreSQL. (2) How to create the database (e.g. `createdb finplanner`). (3) How to set `DATABASE_URL` if different from default. (4) Order of commands: run migrations (from server), start server (from server or root), start client (from client or root). (5) How to open the app in the browser and how to call the API (e.g. with Basic auth) for a quick smoke test.
- Do not add production or Docker instructions for MVP; focus on local development only.

**Acceptance:** A reader can follow the document to install deps, run migrations, start server and client, and see both the placeholder UI and a successful authenticated API request.

**Outputs:** README section or `docs/setup.md` (or equivalent) with the steps above.

---

### Phase 2: Data model & API — current state

_(Phase 2 task list to be added in a follow-up; exit criteria and scope are defined in the Phases table above. Tasks will cover: first migration with project, account, income, spending entities and enums; project GET/PATCH; accounts CRUD with 50-account cap; income and spending CRUD; validation and error payloads; camelCase JSON and integer cents/ISO dates.)_

---

### Phase 3: Assumptions & project settings

_(Task list to be added; scope: assumptions entity and migration, GET/PATCH/POST reset, project PATCH for projection end and ages, validation and defaults.)_

---

### Phase 4: Near-term goals

_(Task list to be added; scope: near_term_goal entity and migration, CRUD API, validation.)_

---

### Phase 5: Projection engine & projection API

_(Task list to be added; scope: pure engine, GET /api/project/projection, error messages, unit tests.)_

---

### Phase 6: Frontend integration & MVP polish

_(Task list to be added; scope: login page, tabbed project detail, all CRUD UIs, assumptions form, yearly balance sheet view, projection end selector, error handling.)_

---

## Assumptions

The following assumptions are made for this project plan and task breakdown. If any are invalidated, the plan and tasks should be updated accordingly.

1. **Scope:** The plan covers only MVP scope as defined in the PRD and technical design. v1 features (multi-user, Google Auth, project list, sharing, super-admin) are out of scope and are not tasks in these phases.

2. **Single codebase:** The implementation follows the technical design’s single-repo approach with `server/` and `client/` as the main application areas. No separate repos or services are assumed.

3. **Tooling:** pnpm is the package manager; Node version is pinned (e.g. 24); TypeScript strict mode is used. No alternative runtimes or package managers are assumed unless the technical design is updated.

4. **Database:** PostgreSQL is required; no SQLite or file-based storage. One database instance; migrations are the source of truth for schema. TypeORM is used for migrations and data access.

5. **Auth (MVP):** HTTP Basic only; credentials are hardcoded in source. No signup, no session, no auth endpoints. All protected routes require a valid `Authorization: Basic` header.

6. **Order of work:** Phases are executed in order. Within a phase, tasks can sometimes be reordered (e.g. 1.2 and 1.5 can be done in parallel), but dependencies (e.g. 1.3 before 1.4) must be respected.

7. **Agent execution:** Tasks are written so that an AI agent can perform them given the PRD and technical design. The agent should read the referenced sections of those documents when executing a task. If the technical design and PRD conflict, the PRD is the source of truth per the technical design.

8. **No prior code:** The plan assumes starting from a repo that may have docs but no existing server or client application code (or that any existing code can be replaced to match this plan). If significant code already exists, the first phase may be adapted to "align repo with plan" rather than "initialize from scratch."

9. **Desktop and browser:** MVP targets desktop only and modern Chrome; no mobile or formal accessibility bar.

10. **Currency and locale:** US dollars only; amounts in integer cents; dates in ISO 8601; English-only UI; US number/date formatting.
