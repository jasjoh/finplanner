# Doc discrepancies: Implementation plan, Technical design, Product requirements

This document lists discrepancies and resolved tensions among:

- **[Implementation plan](implementation-plan.md)** (skeleton agent plan + decisions)
- **[Technical design](technical-design.md)** (stack, schema, API, projection engine)
- **[Product requirements](product-requirements.md)** (PRD — source of truth when in conflict)

Convention: when the PRD and technical design conflict, the PRD is source of truth (as stated in both implementation plan and technical design). Resolutions are noted where the implementation plan has made an explicit decision.

---

## 1. Auth mechanism (MVP)

| Doc | Stance |
|-----|--------|
| **Technical design** | Presents two options: “(1) HTTP Basic, (2) POST `/api/login` returning a simple session token (or cookie).” Build order (Phase 2) describes “POST `/api/login` and session (in-memory)” and “GET `/api/me`.” |
| **Implementation plan** | **Decision:** “Auth mechanism (MVP) — HTTP Basic.” Phase 2: “Hardcoded username/password in source; HTTP Basic,” “Middleware: validate `Authorization: Basic`,” “Send `Authorization: Basic` on all API calls.” No POST `/api/login` or GET `/api/me`. |
| **PRD** | “Username and password are hardcoded in source code; no signup flow.” Does not specify HTTP Basic vs session-based login. |

**Discrepancy:** Technical design leaves auth open and its build order assumes session + POST `/api/login` and GET `/api/me`. Implementation plan fixes MVP auth to HTTP Basic only, so no login/logout/session endpoints. Technical design’s listed auth endpoints (POST `/api/login`, POST `/api/logout`, GET `/api/me`) do not apply if MVP uses HTTP Basic as decided.

**Recommendation:** Either (a) update the technical design to state that MVP uses HTTP Basic only and that POST `/api/login`, POST `/api/logout`, and GET `/api/me` are v1/session-based only, or (b) treat the implementation-plan decision as the binding resolution and note it in the technical design.

---

## 2. API JSON naming (camelCase vs snake_case)

| Doc | Stance |
|-----|--------|
| **Technical design** (Section 4) | “Use **snake_case** in DB and **in API JSON** for consistency with PostgreSQL. Frontend can use camelCase and map at the API boundary.” |
| **Implementation plan** (Decisions) | “**API JSON convention** — camelCase in API; map to/from DB (snake_case) server-side so the frontend uses API shape as-is.” |

**Discrepancy:** Direct conflict: technical design says API JSON is snake_case; implementation plan says API JSON is camelCase with mapping on the server.

**Recommendation:** Pick one and align both docs. Implementation plan’s choice (camelCase in API) is common for JS/TS clients and is a valid resolution; technical design should be updated to “camelCase in API; snake_case in DB; map at server” if that is kept.

---

## 3. ORM / query layer

| Doc | Stance |
|-----|--------|
| **Technical design** (Section 2) | “Use an ORM or query builder that supports migrations and type-safe access (e.g. **Drizzle, Prisma, or Knex** + raw types). Pick one and use it consistently.” Does not mention TypeORM. |
| **Implementation plan** (Phase 1 & Decisions) | “Add migration tool (**TypeORM**),” “**ORM / query layer** — TypeORM.” |

**Discrepancy:** Technical design’s examples are Drizzle, Prisma, Knex; implementation plan commits to TypeORM. Not a behavioral conflict, but the technical design does not list the chosen tool.

**Recommendation:** Update technical design to include TypeORM in the list and/or state that TypeORM is the chosen ORM for implementation.

---

## 4. Frontend state (minimal store)

| Doc | Stance |
|-----|--------|
| **Technical design** (Section 2) | “State: Prefer local component state and React context (**or a minimal store**) for MVP.” |
| **Implementation plan** (Decisions) | “**Frontend state** — React context + local state only; **no minimal store** (e.g. Zustand). Keep it simple.” |

**Discrepancy:** Technical design allows a minimal store; implementation plan explicitly rules it out for MVP.

**Recommendation:** Treat implementation plan as the resolution and update technical design to “React context and local state only for MVP; no minimal store” (or equivalent) so both docs match.

---

## 5. Pre-tax withdrawal start age (59½ vs integer age)

| Doc | Stance |
|-----|--------|
| **PRD** (Section 6) | “**Pre-tax withdrawal start age** … Default: **59½**.” |
| **Implementation plan** (Decisions) | “Store all ages as **full years (integer)**; no half-years (e.g. **59, not 59.5**). Applies to `pre_tax_withdrawal_start_age`, RMD, claiming ages, retirement ages.” |

**Discrepancy:** PRD gives 59½ as the example default; implementation plan constrains storage to integers (e.g. 59). So the default becomes 59 in the app, not 59.5.

**Recommendation:** Either (a) document in implementation plan/technical design that “59½” is implemented as 59 (integer), and keep PRD as the user-facing description, or (b) add a short note in the PRD that the app stores ages as whole years (e.g. 59 for 59½).

---

## 6. Retirement age vs SS claiming age (separate assumptions)

| Doc | Stance |
|-----|--------|
| **PRD** (Section 6) | Lists “Social Security **claiming age**” and “**Income growth rate**.” Does not list a separate “retirement age” (when salary/wages stop). |
| **Technical design** (Section 9) | “Apply income growth **until retirement** … Model Social Security **from claiming age**.” Two concepts implied but not spelled out as separate stored fields. |
| **Implementation plan** (Decisions) | “**Retirement age** — Separate assumptions: (1) **age at which user/partner stop working** (income growth stops), (2) **SS claiming age** (when benefits start). Both user and partner have each.” |

**Discrepancy:** PRD does not define a distinct “retirement age” assumption; implementation plan (and tech design logic) require it so income growth stops at a different age than SS claiming. PRD table does not include “Retirement age” as a row.

**Recommendation:** Add “Retirement age” (when income stops) to the PRD assumptions table, or add a note that “retirement age” is derived or shared with claiming age for MVP. Then align technical design and implementation plan with that choice.

---

## 7. Income / spending in Current state (create vs “edit only”)

| Doc | Stance |
|-----|--------|
| **Technical design** (Section 6) | “income and spending (MVP): **edit only** (one each).” |
| **Technical design** (Section 5) | API: “POST `/api/project/income` — create the one income row … 400 if one already exists”; same for spending. So create is supported. |
| **Implementation plan** | “allow **creating first** income and first spending; single form each.” |

**Discrepancy:** Technical design’s API allows creating the first income/spending row, but the frontend section says “edit only (one each),” which can be read as “no create.” Implementation plan explicitly says “creating first” is allowed. So there is a wording ambiguity in the technical design, not a difference in intended behavior if API is authoritative.

**Recommendation:** Change technical design wording to something like “one income and one spending per project; create the first when none exist, then edit” so it matches the API and implementation plan.

---

## 8. Node version

| Doc | Stance |
|-----|--------|
| **Technical design** (Section 2) | “**Runtime:** Node.js **(24)**.” |
| **Implementation plan** | “Pin Node version (`.nvmrc` or `engines`); lockfile committed.” Does not specify Node 24. |

**Discrepancy:** Technical design pins Node 24; implementation plan does not mention a version. Risk of different agents/developers assuming different Node versions.

**Recommendation:** Add “Node 24” (or the chosen LTS) to the implementation plan (e.g. in “Repo and tooling” or Decisions) and keep technical design aligned.

---

## 9. Projection endpoint path (alternate name)

| Doc | Stance |
|-----|--------|
| **Technical design** (Section 5) | “GET `/api/project/projection` **or** `/api/project/yearly-balance-sheet`” (two options). |
| **Implementation plan** (Decisions) | “**Projection endpoint path** — `/api/project/projection`.” |

**Discrepancy:** None in behavior; implementation plan resolves the choice. Technical design still presents two paths.

**Recommendation:** Optional cleanup: in technical design, state that the chosen path is `/api/project/projection` and that `/api/project/yearly-balance-sheet` is an alias or deprecated, or remove the alternate so only one path is specified.

---

## 10. Error message catalog

| Doc | Stance |
|-----|--------|
| **Implementation plan** (Decisions) | “**Error message catalog** — Single module/constants file for projection and validation error messages (consistency and i18n readiness).” |
| **Technical design** | Describes validation and projection errors but does not require a single catalog. |
| **PRD** | No mention of error catalog. |

**Discrepancy:** Implementation plan adds an implementation detail (centralized error messages); technical design and PRD do not. No conflict, but technical design could reference this for consistency.

**Recommendation:** Optional: add one sentence in technical design Section 8 (or 5) that projection and validation error messages are defined in a single module/constants file for consistency and i18n.

---

## Summary table

| # | Topic | Nature | Suggested action |
|---|--------|--------|-------------------|
| 1 | Auth: HTTP Basic vs session + POST /api/login | Conflict (implementation plan chooses HTTP Basic; tech design build order assumes session) | Align technical design with HTTP Basic for MVP or document resolution |
| 2 | API JSON: snake_case vs camelCase | Conflict | Choose one; update technical design to match implementation plan (camelCase in API) |
| 3 | ORM: TypeORM not in tech design examples | Mismatch | Add TypeORM to technical design |
| 4 | Frontend state: minimal store allowed vs not | Conflict | Update technical design to “no minimal store” for MVP |
| 5 | Pre-tax withdrawal age: 59½ vs integer 59 | PRD vs implementation | Document integer convention and default 59 in implementation/tech design or PRD |
| 6 | Retirement age as separate assumption | PRD missing field | Add “Retirement age” to PRD or document derivation |
| 7 | Income/spending “edit only” vs “create first” | Wording ambiguity in tech design | Clarify in technical design that first row can be created |
| 8 | Node 24 | Tech design specifies; implementation plan does not | Add Node 24 to implementation plan |
| 9 | Projection path alternate | Resolved; tech design still lists two | Optionally state single path in technical design |
| 10 | Error message catalog | Implementation plan adds detail | Optionally mention in technical design |

---

*Generated from implementation-plan.md, technical-design.md, and product-requirements.md. When PRD and technical design conflict, PRD is source of truth.*
