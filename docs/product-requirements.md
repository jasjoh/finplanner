# FinPlanner — Product Requirements

High-level product requirements to reference during development.  
_(Aligned with [project vision](.cursor/rules/project-context.mdc).)_

---

## MVP scope

The first shippable release is a reduced-scope **MVP**.
Full multi-user, account creation, and project list come in v1.

**MVP behavior**

- **Single user.** No account creation. Username and password are hardcoded; no signup flow.
- **Single project.** No project creation or project list. After login, the user goes directly to the tabbed **project details / management** experience (Current state, Assumptions, Yearly balance sheet).
- **Local-only.** Runs on a single machine (developer’s Mac). The MVP may **require being online** (no requirement for full offline operation). Stack must be chosen so the app can later transition to Docker → Kubernetes → cloud-hosted without rework.

**Decisions (resolved for MVP / technical design)**

| Topic                    | Decision                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Near-term goals          | Definition only: name, amount, schedule (one-time date or recurrence: start date, end date, frequency default yearly). No progress display. |
| Income / spending period | User chooses monthly or annual; app calculates and stores the other.                                                        |
| Current state            | Amount + “as of” date per item. No full history.                                                                            |
| Projection end           | User's age, partner's age, or calendar year. Switchable: only affects column count and years calculated; no change to stored data or calculation logic. |
| Withdrawal order         | Default per financial best practice (e.g. taxable → pre-tax → Roth).                                                        |
| Retirement income        | Social Security in scope; pension, annuity, etc. out of scope.                                                              |
| Audit trail              | Out of scope for MVP and v1.                                                                                                |
| Data export              | Out of scope.                                                                                                               |

---

** V1 behaviors **
(note: The MVP behavior overrides these requirements for the MVP deliverable.)

## 1. Entities and Auth

**Structure: accounts and projects**

- **Real-world user : Google accounts** = 1 : M (one person can use multiple Google accounts, e.g. personal + work).
- **Google account : FinPlanner account** = 1 : 1 (each Google login maps to exactly one FinPlanner account; account is created on first sign-in).
- **Project** = one independent planning workspace (income, spending, goals, etc.). Each project is completely independent of others. Projects are owned by and shared among FinPlanner accounts.

**Auth & access**

- Auth method is **environment-dependent** (see Section 7): local defaults to username/password; other environments use Google Auth.
- Users can sign up (create account) and log in / log out.
- Users can create a new project, view any existing projects they have access to, and delete projects they own.
- Users can grant other users access to a project they own, with permission levels: **view** or **edit** (no delete via sharing).
- **Delete:** Only the project owner (creator) can delete the project. Delete is **hard** — data is removed; no soft delete or recovery period.
- **Super-admin:** A single pre-configured super-admin account exists; it can view, edit, and delete any project (effectively full owner of all projects). Super-admin identity is determined via **config file** (not env var or first-created account).
- **Editing / collaboration:** **MVP** — Only one person uses the app; no need to handle multiple users editing the same project. **v1** — Explicit **open** and **close** action for a project; a **timeout** auto-closes the project after inactivity. (One editor at a time per project, with open/close and inactivity-based release.)

---

## 2. Data & inputs

**How data gets in:** All data is manually entered. No file import (CSV/OFX) and no bank/brokerage connections (e.g. Plaid) in scope.

- Income, spending, and investment data are entered by the user within each project.
- **Multiple accounts per project:** A project supports defining multiple financial accounts (e.g. checking, savings, 401(k), brokerage). Each account has its own balance. When defining an account, the user can label its **tax treatment** (e.g. Roth, pre-tax, post-tax, 401(k), HSA) so the app can apply the right withdrawal/tax impact in forecasts.
- **Validation:** For all user-input fields, **enforce valid data** — the user cannot save or add invalid data (e.g. negative balance, target date in the past). Invalid input is blocked until corrected.
- **Limits:** **No hard limits** for v1 (e.g. max accounts per project, max years in projection, max shared users per project are not capped).

---

## 3. Near-term goals (short-term goals)

- Users can **define their own** short-term goals (custom goals).
- The app offers a **default set** of short-term goal categories: **vacations**, **home improvement**, **miscellaneous**, and **new car**.

**Schedule (calendar-event style)**

When defining a short-term goal, the user indicates how it is scheduled:

- **One-time:** a single target date.
- **Recurring:** start date, end date, and **frequency** (default **yearly**). The experience is akin to a calendar event schedule (e.g. “vacation fund every year” from 2025 to 2030).

---

## 4. Long-term goals (v1 scope)

**In scope for v1:** Retirement / financial independence planning and calculation.

**Product intent:** The app does not aim to give yes/no answers (e.g. “Will I have enough?”). It provides **forecasts** of the **balance sheet on a year-by-year basis**, based on:

- **Known current state** (accounts, balances, income, spending, etc.)
- **Assumptions** (see list in Section 6)

So the primary output is projected balance sheet over time, not a binary on-track / not-on-track or a single recommendation.

---

## 5. Outputs & views (v1)

**v1 stance:** No analysis or suggestions. The app **only shows raw data** — no recommendations, gap messaging, or scenario suggestions.

**View structure**

- **Logged-out state**
  - Simple login / create-account page (auth method depends on environment: local = username/password; other = Google Auth).

- **Logged-in state**
  - **Account / access management view** — manage the user’s account and access (e.g. linked Google identity, or project access).
  - **Project list view** — list of projects the user has access to; create / open / delete (if owner).

  - **Project details / manage view** — one project at a time, with tabs:
    - **Current state** — view/edit current state (accounts, balances, income, spending, etc.).
    - **Assumptions** — view/edit assumptions used for forecasting (see Section 6 for the full list).
    - **Yearly balance sheet** — horizontally scrolling table: **rows** = balance sheet items **aggregated by account category** (not one-per-account), **columns** = years. Shows the projected balance sheet over time (raw data only). **Projection end** (user’s age, partner’s age, or calendar year) is **switchable**: changing it only changes how many columns display and how many years are calculated; the calculation logic and stored project data do not change.

---

## 6. Planning Assumptions

**Assumptions list (long-term / retirement forecasting)**

The app supports the following user-editable assumptions, with sensible defaults:

| Assumption                                 | Description                                                                                                                         | Example default              |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **Inflation rate**                         | Annual rate used to grow future spending and nominal values. Spending growth is **the same as inflation** (not tracked separately). | 2.5%                         |
| **Long-term investment return (nominal)**  | Blended expected annual return for long-term investments: stocks, bonds, CDs.                                                       | 6%                           |
| **Short-term investment return (nominal)** | Expected annual return for short-term / savings (e.g. high-yield savings, money market).                                            | 4%                           |
| **Social Security claiming age**           | Age at which the user (and partner, if any) start(s) benefits.                                                                      | 67                           |
| **Social Security benefit**                | Estimated annual benefit at claiming (or derived from inputs); can grow with inflation.                                             | User-entered or placeholder. |
| **Pre-tax withdrawal start age**           | Age when withdrawals from 401(k) / traditional IRA begin (e.g. before 59½ may incur penalty).                                       | 59½                          |
| **RMD start age**                          | Age when required minimum distributions begin for pre-tax accounts.                                                                 | 72 (or current law).         |
| **Tax rate on withdrawals**                | Marginal rate applied to taxable withdrawals (traditional, 401(k)) for projection.                                                  | 22% (user-editable).         |
| **Income growth rate**                     | Annual growth of salary/wages during working years.                                                                                 | 2%                           |

**Assumptions behavior**

- Assumptions start with **sensible defaults** (as in the table above).
- Users can **edit** assumptions (e.g. in the Assumptions tab).
- Users can **reset** assumptions (or individual values) back to default.

**Tax modeling (v1)**

- v1 supports **tax-aware** modeling. When defining a financial account, the user can label it by tax treatment (e.g. Roth, pre-tax, post-tax, 401(k), HSA). The app uses these labels to apply the correct **withdrawal impacts** in the yearly balance sheet forecast (e.g. taxable vs tax-free withdrawals).

---

## 7. Environment & privacy

**Hosting (v1)**

- Start with **local-only** development and hosting.
- An **environment variable** defines which environment the app is running in; use environment-specific configuration (e.g. different auth, DB, URLs per environment).

**Auth by environment**

- **Local environment:** Default to **username + password** for signup and login. This allows delaying Google Auth integration until later.
- **Other environments:** Use Google (Gmail) sign-in for signup and login (as in Section 1).

**Browser and device scope (MVP / v1)**

- **Desktop only.** No mobile or tablet requirement.
- **Designed to support only modern Chrome** (other browsers not guaranteed).
- **Accessibility:** No formal accessibility bar for v1 (no WCAG or similar requirement).

**Currency and locale**

- **US dollars only.** Single currency per project; no multi-currency support.
- **English-only UI.** Users are English-speaking in the United States; number and date formatting use US locale.

**Data & privacy**

- **Data migration:** No need to support migration between versions. When schema or assumptions change, **re-enter or re-import** is acceptable for MVP and v1; existing projects are not required to auto-migrate.
- Design for **data living in the cloud** with standard security practices (e.g. when not running local-only).
- Store only **names and balances** (and similar planning data); risk is intentionally limited.
- **Do not prompt for PII** (no real name, SSN, etc. required) and **do not prompt for account numbers** (no bank account numbers, routing numbers, etc.).
- When creating a financial account, show a **tip** that users should not use the real bank name or account number (use labels like “Checking” or “Savings” instead).

---

## To-be-answered questions
Questions to resolve during product or technical design. Move items here as they come up; remove or fold into the main sections once answered.

**Technical-design drivers (PM input needed)**

1. **Data persistence & MVP storage**
   - Where does MVP data live? (e.g. SQLite, JSON file, in-memory.) Need a clear choice that doesn’t block later Docker → K8s → cloud.
   - Does “local-only” mean data never leaves the machine, or only single-machine / no multi-tenant cloud? (Affects encryption, backups, future cloud design.)

2. **Calculation engine & projection logic**
   - Is there a reference for the yearly balance sheet math (e.g. spreadsheet, formula doc), or should engineering derive it from the assumptions list?
   - How do near-term goals interact with the projection? Do they reduce balances in the forecast? If yes, from which accounts and in what order (same withdrawal-order rules as retirement)?
   - Income and spending: only recurring (monthly/annual) with growth, or do we need one-time events? Is spending separate from near-term goals, or do goals consume from “spending” or from specific accounts?

3. **User / partner / projection end**
   - Where do we get the user’s (and partner’s) age? Is there a project-level or user-level DOB (or age) used for “projection end by user’s age / partner’s age”?
   - Is “partner” a first-class entity in v1 (e.g. DOB, SS claiming age, SS benefit, separate RMD), or only a flag that affects projection end?

4. **Social Security & assumptions**
   - For v1, is Social Security benefit always user-entered, or do we ever derive it from earnings? How is “placeholder” defined?
   - If there is no partner, how does “projection end by partner’s age” behave? (Hidden, disabled, or N/A?)

5. **Accounts & tax treatment**
   - Is tax treatment a fixed enum (e.g. Roth, pre-tax, taxable, 401(k), HSA) or free-form labels? (Affects withdrawal-order and tax-impact logic.)
   - Clarify “post-tax” vs “taxable”: same withdrawal/tax impact, or different (e.g. after-tax 401(k) vs brokerage)?

6. **Validation, errors & edge cases**
   - Beyond “valid data” and type checks: any cross-field rules? (e.g. goal end date ≥ start date; projection end year ≥ current year; no negative balances after withdrawals.)
   - When the projection can’t be computed (missing assumption, inconsistent inputs): show error and block, show partial results, or degrade gracefully?
   - Do we need to support “no Social Security” (e.g. benefit = 0 or opt out) in the model and UI?

7. **MVP auth & security**
   - “Username and password are hardcoded”: literally in source code, or in a config file / env (e.g. `MVP_USER`, `MVP_PASSWORD`)? Config is preferable to avoid committing secrets.
   - If MVP “may require being online,” is there any HTTPS or “no plaintext password over the wire” requirement, or is that deferred to v1/cloud?

8. **Non-functional & future-proofing**
   - Any expectation for “reasonable” scale even if there are no hard limits? (e.g. max years, max accounts, max goals.) Drives whether we design for lazy/virtualized balance sheet vs “load all.”
   - v1 after MVP: single big release or phased? Affects how much we design for multi-user, sharing, and Google Auth in the first technical design (schema, auth abstraction, env handling).

9. **Product-requirements doc**
   - For the technical design, should we explicitly call out “design for v1 data model and auth model, implement MVP only” so the doc states which v1 scope is in scope for the first tech design?
   - Consider adding a short “Technical design inputs” subsection here that references: persistence choice, calculation reference (or “derive from PRD”), partner/DOB model, and tax-treatment enum vs free-form.

---
