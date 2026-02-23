# FinPlanner — Agent Implementation Plan (Skeleton)

Step-by-step plan for an agentic AI to implement the FinPlanner web application from the [Technical Design](technical-design.md) and [Product Requirements](product-requirements.md). This is a **skeleton**; flesh it out in detail after resolving the **Questions to be answered** below.

**Conventions**

- **MVP** = first shippable release (single user, single project, local-only, hardcoded auth).
- Order of phases should be respected so each step has the necessary foundation.
- When the PRD and technical design conflict, the PRD is source of truth.

---

## Skeleton plan (high-level steps)

### Phase 1: Foundation

1. **Repo and tooling**
   - Initialize root `package.json`, TypeScript config (strict), ESLint, Prettier.
   - Pin Node version (`.nvmrc` or `engines`); lockfile committed.
   - Document package manager: pnpm.

2. **Backend shell**
   - Add `server/` (or chosen layout): Express or Fastify, config from env, health route (e.g. `GET /api/health`), DB connection.
   - No auth in this phase.

3. **Database**
   - Create PostgreSQL database; add migration tool (TypeORM).
   - First migration: enums (tax treatment, period, goal category, projection end type, etc.) and tables: `project`, `account`, `income`, `spending`, `near_term_goal`, `assumptions`.
   - Ensure one project row exists with default assumptions and projection defaults; no income or spending rows until user adds them. No seeded accounts or sample data.

4. **Frontend shell**
   - Vite + React + TypeScript, React Router, minimal layout.
   - Single placeholder (e.g. Hello or login placeholder).
   - Proxy API to backend in dev; centralized API base URL (env/config).

### Phase 2: Auth and project

5. **MVP auth**
   - Hardcoded username/password in source; HTTP Basic.
   - Middleware: validate `Authorization: Basic` on protected routes; 401 when missing or invalid.

6. **Frontend auth and project**
   - Login page; on success store credentials (e.g. in memory or sessionStorage) and redirect to project.
   - Send `Authorization: Basic` on all API calls; on 401 clear stored credentials and redirect to login.
   - GET/PATCH `/api/project` (single project). Load project in layout; show name, projection-end controls (type + value), user_age, partner_age.

### Phase 3: Current state

7. **Accounts**
   - API: GET/POST/PATCH/DELETE for `/api/project/accounts`. Enforce max 50 accounts (400 + message when at limit). Validation: non-negative balance, valid enum, name non-empty, balance_as_of_date present.
   - Frontend: Current state tab — list accounts, add/edit/delete; inline or top validation errors; disable add or show message at 50.

8. **Income and spending**
   - API: GET (200 or 404), POST (create first row; 400 if already exists), PATCH for `/api/project/income` and `/api/project/spending` (one per project). Store both period (user choice) and derived value.
   - Frontend: Income and spending sections in Current state tab; allow creating first income and first spending; single form each; period selector (monthly/annual).

9. **Near-term goals**
   - API: CRUD for `/api/project/near-term-goals`. Validation: non-negative amount, no past target_date, recurring: start_date ≤ end_date, frequency_interval_years ≥ 1, valid category.
   - Frontend: Goals section; one-time vs recurring; category; dates and frequency_interval_years (every N years).

### Phase 4: Assumptions

10. **Assumptions API and UI**
    - API: GET/PATCH `/api/project/assumptions`, POST `/api/project/assumptions/reset`. Defaults in code or migration; validate ranges (e.g. rates 0–100, ages positive).
    - Frontend: Assumptions tab; form for all PRD Section 6 fields; Reset to default action.

### Phase 5: Projection

11. **Projection engine**
    - Pure function or small service: inputs = project state (accounts, income, spending, goals, assumptions) + projection end. Output = years array + rows with valuesByYear (aggregated by account category).
    - Logic: year-by-year; income growth until retirement; SS from claiming age (user + partner); COL + inflation; near-term goal draws from designated accounts; withdrawal order (taxable → pre-tax → Roth, etc.); RMD; returns (long/short-term). No DB inside engine.
    - On missing/invalid input: return specific error message; no partial results.
    - Add unit tests with fixed inputs.

12. **Projection API and UI**
    - API: GET `/api/project/projection`. Load project data; call engine; return table or 4xx with specific message.
    - Frontend: Yearly balance sheet tab; projection-end selector; refetch on change; render table with horizontal scroll; show API error message when 4xx.

### Phase 6: Polish

13. **Validation and errors**
    - Apply all server-side validation rules (technical design Section 8); clear 400 payloads (e.g. `fields: { ... }`). Frontend: show validation errors; block submit when invalid.

14. **UX and copy**
    - Tip on account creation (no real bank name or account number). US locale for numbers and dates. No PII or account number prompts.

15. **Documentation**
    - README: install deps, set up PostgreSQL, run migrations, start server and client, log in (hardcoded MVP credentials).

---

## Decisions (resolved questions)

- **Backend framework** — Express.
- **ORM / query layer** — TypeORM.
- **Styling approach** — CSS Modules.
- **Directory layout** — `server/` and `client/` at repo root.
- **Auth mechanism (MVP)** — HTTP Basic.
- **Projection endpoint path** — `/api/project/projection`.
- **Default Social Security benefit (MVP)** — 4,821,600 cents/year ($48,216) for both user and partner. Source: SSA 2025 maximum monthly benefit at full retirement age, $4,018/month × 12. Document value and source in code or README.
- **Retirement age** — Separate assumptions: (1) age at which user/partner stop working (income growth stops), (2) SS claiming age (when benefits start). Both user and partner have each; projection engine uses retirement age for income, claiming age for SS.
- **Pre-tax withdrawal and ages** — Store all ages as full years (integer); no half-years (e.g. 59, not 59.5). Applies to `pre_tax_withdrawal_start_age`, RMD, claiming ages, retirement ages, etc.
- **HSA and After-tax in projection (MVP)** — Simplified rules, documented in engine or README: HSA treated like Roth (tax-free growth and withdrawals); after-tax tracks basis vs earnings, withdrawals consume basis first (tax-free) then earnings (taxable).
- **Frontend state** — React context + local state only; no minimal store (e.g. Zustand). Keep it simple.
- **API JSON convention** — camelCase in API; map to/from DB (snake_case) server-side so the frontend uses API shape as-is.
- **Package manager** — pnpm.
- **Error message catalog** — Single module/constants file for projection and validation error messages (consistency and i18n readiness).
- **"Blank project" semantics** — No default or empty income/spending rows. Project starts with default assumptions and projection defaults, no accounts, and no income or spending rows until the user adds them. API and UI support creating the first income and first spending (MVP still one of each per project).

---

## References

- [Technical Design](technical-design.md) — stack, schema, API, projection engine, build order.
- [Product Requirements](product-requirements.md) — scope, validation, assumptions, UX.
- [Project context](.cursor/rules/project-context.mdc) — role and product vision.
