# FinPlanner — Product Requirements

High-level product requirements to reference during development.  
*(Aligned with [project vision](.cursor/rules/project-context.mdc).)*

---

## MVP scope

The first shippable release is a reduced-scope **MVP**. Full multi-user, account creation, and project list come in v1.

**MVP behavior**

- **Single user.** No account creation. Username and password are hardcoded; no signup flow.
- **Single project.** No project creation or project list. After login, the user goes directly to the tabbed **project details / management** experience (Current state, Assumptions, Yearly balance sheet).
- **Local-only.** Runs on a single machine (developer’s Mac). Stack must be chosen so the app can later transition to Docker → Kubernetes → cloud-hosted without rework.

**Decisions (resolved for MVP / technical design)**

| Topic | Decision |
|--------|----------|
| Near-term goals | Definition only: name, amount, target funding date, recurrence config. No progress display. |
| Income / spending period | User chooses monthly or annual; app calculates and stores the other. |
| Current state | Amount + “as of” date per item. No full history. |
| Projection end | User’s age, partner’s age, and optional partner. Projection end is chosen as user’s age, partner’s age, or a calendar year. |
| Withdrawal order | Default per financial best practice (e.g. taxable → pre-tax → Roth). |
| Retirement income | Social Security in scope; pension, annuity, etc. out of scope. |
| Audit trail | Out of scope for MVP and v1. |
| Data export | Out of scope. |

---

## 1. Primary user & app structure

**Primary user:** For the product owner only (personal use), but the app supports multiple users so projects can be shared when needed.

**Structure: accounts and projects**

- **Real-world user : Google accounts** = 1 : M (one person can use multiple Google accounts, e.g. personal + work).
- **Google account : FinPlanner account** = 1 : 1 (each Google login maps to exactly one FinPlanner account; account is created on first sign-in).
- **Project** = one independent planning workspace (income, spending, goals, etc.). Each project is completely independent of others. Projects are owned by and shared among FinPlanner accounts.

**Auth & access**

- Auth method is **environment-dependent** (see Section 7): local defaults to username/password; other environments use Google Auth.
- Users can sign up (create account) and log in / log out.
- Users can create a new project, view any existing projects they have access to, and delete projects they own.
- Users can grant other users access to a project they own, with permission levels: **view** or **edit** (no delete via sharing).
- **Delete:** Only the project owner (creator) can delete the project.
- **Super-admin:** A single pre-configured super-admin account exists; it can view, edit, and delete any project (effectively full owner of all projects).

---

## 2. Data & inputs

**How data gets in:** All data is manually entered. No file import (CSV/OFX) and no bank/brokerage connections (e.g. Plaid) in scope.

- Income, spending, and investment data are entered by the user within each project.
- **Multiple accounts per project:** A project supports defining multiple financial accounts (e.g. checking, savings, 401(k), brokerage). Each account has its own balance. When defining an account, the user can label its **tax treatment** (e.g. Roth, pre-tax, post-tax, 401(k), HSA) so the app can apply the right withdrawal/tax impact in forecasts.

---

## 3. Near-term goals (short-term goals)

- Users can **define their own** short-term goals (custom goals).
- The app will also offer a **default set** of short-term goals; the exact set is captured in the to-be-answered section below.

---

## 4. Long-term goals (v1 scope)

**In scope for v1:** Retirement / financial independence planning and calculation.

**Product intent:** The app does not aim to give yes/no answers (e.g. “Will I have enough?”). It provides **forecasts** of the **balance sheet on a year-by-year basis**, based on:

- **Known current state** (accounts, balances, income, spending, etc.)
- **Assumptions** (e.g. interest rates, 401(k) withdrawal date — exact list to be defined later; see to-be-answered questions)

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
    - **Assumptions** — view/edit assumptions used for forecasting (e.g. rates, withdrawal date; exact list TBD).
    - **Yearly balance sheet** — horizontally scrolling table: **rows** = balance sheet items, **columns** = years. Shows the projected balance sheet over time (raw data only).

---

## 6. Assumptions & tax (v1)

**Assumptions**

- Assumptions start with **sensible defaults**.
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

**Data & privacy**

- Design for **data living in the cloud** with standard security practices (e.g. when not running local-only).
- Store only **names and balances** (and similar planning data); risk is intentionally limited.
- **Do not prompt for PII** (no real name, SSN, etc. required) and **do not prompt for account numbers** (no bank account numbers, routing numbers, etc.).
- When creating a financial account, show a **tip** that users should not use the real bank name or account number (use labels like “Checking” or “Savings” instead).

---

## To-be-answered questions

Questions to resolve during product or technical design. Move items here as they come up; remove or fold into the main sections once answered.

- **What is the default set of short-term goals?** (e.g. emergency fund, big purchase, debt payoff — exact list and definitions TBD.)
- **What is the exact list of assumptions for long-term / retirement forecasting?** (e.g. interest rates, 401(k) withdrawal date, inflation, growth rates — to be defined later.)

---

*Further sections will be added as we complete each question.*
