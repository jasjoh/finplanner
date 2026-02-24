# FinPlanner — Product Requirements

High-level product requirements to reference during development.
_(Aligned with [project vision](.cursor/rules/project-context.mdc).)_

<!--
DOCUMENT CONVENTIONS (for AI agents / line-based editors):
- Main sections: "## N. Title" (N = 1..8) or "## Title" for unnumbered (MVP scope, v1 behaviors).
- Grep numbered sections: ^## [0-9]+\.
- Tables: one row per line; do not wrap cell content across lines.
- Lists: one item per line, marker "- "; subsections use "**Bold label**" then bullets.
- To-be-answered: each question is "N. **Title**" with sub-bullets; add/remove by line.
- Cross-references: "Section N" refers to "## N. ..." in this file.
- Use ASCII double quotes " rather than curly double quotes
-->

---

## MVP scope

The first shippable release is a reduced-scope **MVP**.
Full multi-user, account creation, and project list come in v1.

**MVP behavior**

- **Single user.** No account creation. Username and password are hardcoded in source code; no signup flow.
- **Single project.** No project creation or project list. After login, the user goes directly to the tabbed **project details / management** experience (Current state, Assumptions, Yearly balance sheet).
- **Local-only.** Runs on a single machine (developer’s Mac). The MVP may **require being online** (no requirement for full offline operation). Stack must be chosen so the app can later transition to Docker → Kubernetes → cloud-hosted without rework.

**Decisions (resolved for MVP / technical design)**

| Topic                    | Decision                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Near-term goals          | Definition only: name, amount, schedule (one-time date or recurrence: start date, end date, frequency default yearly). No progress display.                                                                         |
| Income / spending period | User chooses monthly or annual; app calculates and stores the other.                                                                                                                                                |
| Current state            | Amount + "as of" date per item. No full history.                                                                                                                                                                    |
| Projection end           | User's age, partner's age, or calendar year. Switchable: only affects column count and years calculated; no change to stored data or calculation logic.                                                             |
| Withdrawal order         | Default per financial best practice (e.g. taxable → pre-tax → Roth).                                                                                                                                                |
| Retirement income        | Social Security in scope; pension, annuity, etc. out of scope.                                                                                                                                                      |
| Audit trail              | Out of scope for MVP and v1.                                                                                                                                                                                        |
| Data export              | Out of scope.                                                                                                                                                                                                       |
| Data persistence (MVP)   | PostgreSQL. Chosen so the app can later move to Docker → Kubernetes → cloud without rework.                                                                                                                         |
| Local-only (MVP)         | App and data run only on the developer's Mac; everything is hosted and served via localhost. No cloud or multi-tenant in MVP.                                                                                       |
| MVP credentials          | Username and password are hardcoded in source code (not config or env).                                                                                                                                             |
| HTTPS / security (MVP)   | Deferred until post-MVP. No HTTPS or "no plaintext password over the wire" requirement for MVP.                                                                                                                     |
| Scale & future-proofing  | No need to optimize for scale now. Prioritize maintainability and future refactoring. Avoid overengineering; do not lay a whole foundation for future work. Do not design into a box, but do not over-build either. |

---

## v1 behaviors

Note: MVP behavior overrides these requirements for the MVP deliverable.

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
- **Multiple accounts per project:** A project supports defining multiple financial accounts (e.g. checking, savings, 401(k), brokerage). Each account has its own balance. When defining an account, the user assigns a **tax treatment** from a **fixed enum** (see **Account tax-treatment enum** below) so the app can apply the correct withdrawal order and tax impact in forecasts. The user can also **mark an account as a source for covering near-term goals** (so the projection can draw from it for goal funding).

- **Income and living expenses (current state):** The user can **create one or more income amounts** and **one or more living expense amounts** per project. The user can **edit or remove** any income or living expense they have created. **No default income or spending rows are created** — the project starts with none until the user adds them. For projection, total income is the sum of income amounts; total spending (COL) is the sum of living expense amounts (each grows with inflation).

**Account tax-treatment enum**

Tax treatment is a fixed set of values (not free-form). "Post-tax" and "taxable" are **different**: withdrawal and tax logic differ (e.g. taxable = brokerage; after-tax = after-tax 401(k) / non-deductible IRA with basis vs earnings).

| Enum value    | Description / use                                                          | Withdrawal / tax impact in projection                                         |
| ------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Roth**      | Roth IRA, Roth 401(k).                                                     | Qualified withdrawals tax-free.                                               |
| **Pre-tax**   | Traditional IRA, traditional 401(k).                                       | Withdrawals taxable as ordinary income (use tax-rate assumption).             |
| **Taxable**   | Brokerage, checking, savings. Contributions already taxed.                 | Growth subject to capital gains/dividend tax; no withdrawal tax on principal. |
| **HSA**       | Health Savings Account.                                                    | Tax-free for qualified medical; otherwise taxable (model per product rules).  |
| **After-tax** | After-tax 401(k), non-deductible IRA. Contributions (basis) already taxed. | Basis non-taxable on withdrawal; earnings taxable as ordinary income.         |

- **Validation:** For all user-input fields, **enforce valid data** — the user cannot save or add invalid data (e.g. negative balance, target date in the past). Invalid input is blocked until corrected. No cross-field validation and no checks for negative balances based on calculated debits. When the projection cannot be computed (missing assumption, inconsistent inputs), **show an error** — do not show partial results or degrade. Social Security is always modeled; no "no Social Security" (zero benefit or opt-out) option in scope.
- **Limits:** **No hard limits** for v1 (e.g. max accounts per project, max years in projection, max shared users per project are not capped).

---

## 3. Near-term goals (short-term goals)

- Users can **define their own** short-term goals (custom goals).
- The app offers a **default set** of short-term goal categories: **vacations**, **home improvement**, **miscellaneous**, and **new car**.

**Schedule (calendar-event style)**

When defining a short-term goal, the user indicates how it is scheduled:

- **One-time:** a single target date.
- **Recurring:** start date, end date, and **frequency** (default **yearly**). The experience is akin to a calendar event schedule (e.g. "vacation fund every year" from 2025 to 2030).

---

## 4. Long-term goals (v1 scope)

**In scope for v1:** Retirement / financial independence planning and calculation.

**Product intent:** The app does not aim to give yes/no answers (e.g. "Will I have enough?"). It provides **forecasts** of the **balance sheet on a year-by-year basis**, based on:

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
  - **Account / access management view** — manage the user’s account and access (e.g. linked Google identity, or project access). User sets **current age** and **partner's current age** here (no DOB; age only). Partner's age is **required** in v1.
  - **Project list view** — list of projects the user has access to; create / open / delete (if owner).

  - **Project details / manage view** — one project at a time, with tabs:
    - **Current state** — view/edit current state (accounts, balances, income, spending, etc.).
    - **Assumptions** — view/edit assumptions used for forecasting (see Section 6 for the full list).
    - **Yearly balance sheet** — horizontally scrolling table: **rows** = balance sheet items **aggregated by account category** (not one-per-account), **columns** = years. Shows the projected balance sheet over time (raw data only). **Projection end** (user’s age, partner’s age, or calendar year) is **switchable**: changing it only changes how many columns display and how many years are calculated; the calculation logic and stored project data do not change.

---

## 6. Planning Assumptions

**Assumptions list (long-term / retirement forecasting)**

The app supports the following user-editable assumptions, with sensible defaults. **Partner is required in v1;** the Assumptions tab supports defining assumptions for both the user and the partner (e.g. separate retirement age, SS claiming age, SS benefit, RMD).

| Assumption                                 | Description                                                                                                                                                 | Example default                  |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| **Inflation rate**                         | Annual rate used to grow future spending and nominal values. Spending growth is **the same as inflation** (not tracked separately).                         | 2.5%                             |
| **Cost of living (COL)**                   | Annual or monthly COL expense; maintained **separately from near-term goals**. Increases yearly according to inflation.                                     | User-entered.                    |
| **Long-term investment return (nominal)**  | Blended expected annual return for long-term investments: stocks, bonds, CDs.                                                                               | 6%                               |
| **Short-term investment return (nominal)** | Expected annual return for short-term / savings (e.g. high-yield savings, money market).                                                                    | 4%                               |
| **Retirement age**                         | Age at which the user (and partner) stop working; salary/wages and **income growth** apply until this age. **Defined separately for user and partner.** Can differ from SS claiming age. | 67                               |
| **Social Security claiming age**           | Age at which the user (and partner) start(s) benefits; **defined separately for user and partner**.                                                         | 67                               |
| **Social Security benefit**                | User-entered estimated annual benefit at claiming; can grow with inflation. **User and partner each have an assumption.** Default: maximum benefit allowed. | Maximum benefit (user-editable). |
| **Pre-tax withdrawal start age**           | Age when withdrawals from 401(k) / traditional IRA begin (e.g. before 59 may incur penalty). All age assumptions are **whole years only** (no half-years). | 59                               |
| **RMD start age**                          | Age when required minimum distributions begin for pre-tax accounts. All age assumptions are **whole years only**.                                          | 72 (or current law).             |
| **Tax rate on withdrawals**                | Marginal rate applied to taxable withdrawals (traditional, 401(k)) for projection.                                                                          | 22% (user-editable).             |
| **Income growth rate**                     | Annual growth of salary/wages during working years (applies until **retirement age**).                                                                                                         | 2%                               |

**Assumptions behavior**

- **Ages:** All age assumptions (claiming age, pre-tax withdrawal start age, RMD start age, retirement age, user/partner age) are **whole years only** (integer); the app does not use half-years (e.g. 59, not 59½).
- Assumptions start with **sensible defaults** (as in the table above).
- Users can **edit** assumptions (e.g. in the Assumptions tab).
- Users can **reset** assumptions (or individual values) back to default.

**Tax modeling (v1)**

- v1 supports **tax-aware** modeling. When defining a financial account, the user assigns a **tax treatment** from the **fixed enum** (Roth, Pre-tax, Taxable, HSA, After-tax). The app uses this to apply the correct **withdrawal order** (e.g. taxable first, then pre-tax, then Roth) and **withdrawal/tax impacts** in the yearly balance sheet forecast. **Taxable** and **After-tax** are distinct: taxable = brokerage (capital gains/dividend on growth); after-tax = after-tax 401(k) / non-deductible IRA (basis vs earnings, ordinary income on earnings).

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
- When creating a financial account, show a **tip** that users should not use the real bank name or account number (use labels like "Checking" or "Savings" instead).
