# FinPlanner — Financial Advisor Recommendations

Recommendations for default assumptions, projection methodology, and development guidance. This document is written from a **financial advisor perspective** to help the app developer implement assumptions and calculations in a way that aligns with sound financial planning practice and regulatory expectations. It supplements the [Product Requirements](product-requirements.md) and [Technical Design](technical-design.md); when in conflict, the PRD remains source of truth for product scope.

**Document conventions**

- **Defaults** = values used when the user has not edited an assumption.
- **Projection** = the year-by-year balance sheet forecast (output only; no recommendations per PRD).
- All amounts and rates in this doc use the same units as the PRD/technical design (e.g. annual rates in percent, amounts in dollars unless noted).

---

## 1. Default assumptions — recommended values and rationale

### 1.1 Inflation rate

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 2.5% | Aligns with long-run U.S. CPI expectations used by many planners and the Fed’s inflation target (2%). Slightly above 2% reflects historical variance and avoids understating future spending. |
| **Documentation** | Document in code/README that this is a planning default, not a forecast. Consider a short in-app note (e.g. in Assumptions tab) that users can change based on their view. |

**Guidance:** Do not tie the default to a live economic data feed for MVP/v1; keep it a fixed constant so results are reproducible and auditable.

---

### 1.2 Cost of living (COL)

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | No default; user must enter | COL is highly individual. Pre-populating a number could be misleading. Require user input before a projection can run (already implied by “missing COL” error in PRD). |
| **Optional enhancement** | Consider a “use current spending as COL” action that copies the single spending amount into the COL assumption, with a clear label so the user knows what was copied. |

---

### 1.3 Long-term investment return (nominal)

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 6% | Conservative for a blended (stocks/bonds) long-term portfolio over 20–40 years. Historical equity risk premium and bond yields support a range of roughly 5–7% nominal for a moderate allocation; 6% is a reasonable middle ground and avoids over-optimism. |
| **Consistency** | Use the same rate for all long-term accounts (e.g. 401(k), IRA, brokerage) in the projection. Different account-level return assumptions add complexity and can confuse users; tax treatment already differs by account type. |

**Guidance:** Treat this as a single “blended long-term return” assumption. If the app later supports multiple return assumptions (e.g. by asset class), document the source and keep defaults conservative.

---

### 1.4 Short-term investment return (nominal)

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 4% | Reasonable for high-yield savings / money market in a normal rate environment. Can be adjusted when rates are unusually high or low; 4% is a stable planning default. |

**Guidance:** Apply this to accounts or balances designated as “short-term” or “savings” (e.g. cash, money market) so that near-term goals and emergency funds are not projected with equity-like returns.

---

### 1.5 Social Security claiming age

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 67 (user and partner) | Full retirement age (FRA) for anyone born 1960 or later is 67. Using 67 as default is neutral and avoids implying early or delayed claiming. |
| **Documentation** | In UI or help text, note that 67 is full retirement age and that claiming earlier reduces benefits, later increases them. No need to compute PIA or reduction factors in-app; user enters benefit amount. |

---

### 1.6 Social Security benefit

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | Use a documented maximum benefit (e.g. SSA current-year maximum at FRA). Implementation plan uses $48,216/year (2025 max). | Gives a visible, auditable default. Most users will replace with their own estimate (e.g. from SSA statement). |
| **Updates** | Do not auto-update from SSA each year for MVP; document the source and year in code/README. When SSA updates maximums, updating the constant in a release is sufficient. |
| **Inflation** | Grow the user-entered (or default) benefit with inflation each year after claiming, per PRD. |

---

### 1.7 Pre-tax withdrawal start age

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 59 | IRS 10% early withdrawal penalty generally applies before 59½. The app uses **whole years only**; 59 is the default. The app does not need to model the penalty explicitly if withdrawals are assumed to start at or after this age. |
| **Clarity** | Label in UI so users understand this is “age when you plan to start drawing from 401(k)/IRA” (not necessarily retirement date). |

---

### 1.8 RMD start age

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 73 | Under SECURE 2.0, RMDs start at 73 for those who reach 72 after 2022 (and 75 for later cohorts). 73 is a safe default for current planning; document in code that this may change with law. |
| **Documentation** | Note in README or assumptions help that RMD rules are subject to law; consider adding a short in-app note so users know the default can be edited. |

---

### 1.9 Tax rate on withdrawals

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 22% | Corresponds to a common marginal federal bracket for middle-income retirees (e.g. 2024 22% bracket). User should adjust for their expected bracket and state tax if material. |
| **Scope** | Apply to ordinary income from pre-tax and (per product rules) after-tax earnings. Taxable accounts use capital gains/dividend treatment where applicable; document that the “tax rate” assumption is for ordinary income. |

---

### 1.10 Income growth rate

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 2% | Roughly in line with long-run wage growth and inflation. Conservative relative to historical periods; avoids overstating future income. |

**Guidance:** Apply only until the chosen “retirement age” (or last income year). Keep retirement age and SS claiming age as separate assumptions so users can model “stop working at 65, claim SS at 67.”

---

### 1.11 Retirement age (user and partner)

| Recommendation | Default | Rationale |
|----------------|---------|-----------|
| **Value** | 67 (align with SS claiming age for simplicity) | Many people retire near FRA. Defaulting retirement age to 67 keeps the model simple; users can set different retirement and claiming ages if desired. |
| **Logic** | After retirement age, wage/salary income stops; SS and withdrawals fund spending. No need to model part-time work unless added in a future version. |

---

## 2. Projection calculation — recommended approaches

### 2.1 Nominal vs real

| Recommendation | Approach | Rationale |
|----------------|----------|------------|
| **Rates and amounts** | Use **nominal** rates and amounts throughout: nominal returns, nominal COL growth (inflation), nominal SS growth. | Easiest to explain and audit; matches how users think about dollars. Real-rate math (e.g. real return = nominal − inflation) is equivalent but can confuse users and developers if mixed. |
| **Consistency** | Ensure COL, SS, and any other growing cash flows use the same inflation assumption. PRD already states spending growth = inflation. |

---

### 2.2 Year-by-year sequencing

| Recommendation | Approach | Rationale |
|----------------|----------|------------|
| **Order within a year** | (1) Start with prior-year ending balances. (2) Add income (wages if before retirement, SS if at/after claiming). (3) Apply investment returns (e.g. multiply appropriate balances by (1 + rate)). (4) Subtract COL and near-term goal draws. (5) Apply withdrawal order to fund any shortfall; apply tax to taxable withdrawals. (6) Apply RMD from pre-tax if age ≥ RMD start; treat RMD as forced withdrawal. | Order matters for tax and liquidity. Doing returns before spending is conventional; then spending and goals are funded from cash/withdrawals; then RMDs. |
| **Rounding** | Round to whole dollars (or cents) at a defined step (e.g. after each year’s balance update) to avoid floating-point display issues. Be consistent year over year. |

---

### 2.3 Withdrawal order

| Recommendation | Order | Rationale |
|----------------|-------|------------|
| **Sequence** | Taxable → Pre-tax (traditional/401(k)) → Roth. HSA and After-tax per product rules (e.g. HSA tax-free for qualified; after-tax basis first, then earnings). | Taxable first preserves tax-advantaged growth; pre-tax before Roth uses up taxable income at lower brackets when possible and preserves tax-free Roth for later. This is standard planning practice. |
| **Shortfall** | If COL + goals exceed income + available liquidity in a given year, the projection can show withdrawals from the next bucket (or show a shortfall). PRD says no partial results on error; define clearly what “cannot be computed” means (e.g. insufficient assets to cover spending in a year). |

---

### 2.4 RMD calculation

| Recommendation | Approach | Rationale |
|----------------|----------|------------|
| **Method** | Use IRS life-expectancy divisor for the taxpayer’s age (e.g. Uniform Lifetime Table). RMD = prior-year-end pre-tax balance ÷ divisor. | Matches IRS rules. Store divisors in a table or formula; document source (IRS Publication 590-B or current regs). |
| **Scope** | Apply RMD to **pre-tax** accounts only. Roth has no RMD; taxable and after-tax are not subject to IRA/401(k) RMD. |
| **Replacement** | If the user has already withdrawn more than the RMD from pre-tax in that year (e.g. to fund spending), the RMD is still “satisfied” by those withdrawals; no need to withdraw again. Model: required = RMD amount; actual withdrawal = max(shortfall needed, RMD) from pre-tax, so RMD is met. |

---

### 2.5 Near-term goals

| Recommendation | Approach | Rationale |
|----------------|----------|------------|
| **Funding** | Deduct goal amount in the year(s) it is due from accounts marked “source for near-term goals,” per PRD. Use the same withdrawal order within that subset (e.g. taxable first among designated accounts). | Keeps near-term goals explicit and avoids double-counting or hiding draws. |
| **Recurring** | For recurring goals (e.g. every N years), deduct in each occurrence year. No progress tracking in MVP; just deduct full target amount in the relevant years. |

---

### 2.6 Returns application

| Recommendation | Approach | Rationale |
|----------------|----------|------------|
| **Timing** | Apply return at year-end (or as a single annual step): new_balance = prior_balance × (1 + r). No need for monthly compounding for a yearly table. | Simple and consistent with annual columns. |
| **Which rate** | Long-term rate for retirement/brokerage accounts; short-term rate for savings/cash designated for near-term use. If an account is not clearly “short-term,” use long-term rate. |

---

## 3. Additional guidance for the developer

### 3.1 Disclosures and limitations

- **No advice.** The app shows projections only; it does not recommend products, claim dates, or strategies. Consider a brief disclaimer on the Yearly balance sheet or Assumptions tab (e.g. “This is a projection, not a guarantee or recommendation. Consider consulting a financial or tax professional.”).
- **Assumptions matter.** Users should understand that outputs depend entirely on inputs and assumptions. A one-line note that “results will change if you change assumptions” is helpful.
- **Social Security.** Recommend users use their actual SSA estimate (e.g. from ssa.gov) for the benefit amount; the default is only a placeholder.

---

### 3.2 Edge cases and validation

- **Ages.** Reject invalid ages (e.g. claiming age before 62 or after 70 if you ever support that range; retirement age before current age). Document min/max in validation rules.
- **Projection end.** If projection end (user age, partner age, or calendar year) is before the current year or before the user’s current age, return a clear error rather than an empty or confusing table.
- **Missing data.** As in the PRD, do not return partial projections. Require: user age, partner age, COL, and any assumption the engine needs. Return a **specific** error message (e.g. “Cost of living is required to run the projection”) so the user knows what to fix.
- **Negative balances.** If the logic ever produces a negative balance in a year (e.g. spending exceeds assets and withdrawals), either treat as “projection cannot be completed” with a message, or show the negative and document that it indicates a shortfall. Prefer failing with a clear message over showing negative balances without explanation.

---

### 3.3 Tax treatment — taxable accounts

- **Capital gains vs ordinary.** Taxable (brokerage) accounts: growth is subject to capital gains/dividend tax, not ordinary income. For MVP, a single “tax on taxable account growth” assumption could be optional; if omitted, use a reasonable default (e.g. 15% for long-term gains) or the same as withdrawal tax with a note. PRD already distinguishes taxable (brokerage) from after-tax (basis vs earnings).
- **Basis.** For taxable accounts, track cost basis only if the app supports it; otherwise, a simplified approach (e.g. treat a portion of withdrawal as gain based on growth ratio) may be acceptable for MVP. Document the simplification.

---

### 3.4 Inflation and COL

- **Single inflation rate.** Using one rate for COL and for growing SS (and any other nominal flows) keeps the model consistent. Do not introduce a separate “healthcare inflation” or “COL inflation” unless the product explicitly adds it.
- **COL entry.** If the user enters COL as monthly, convert to annual for storage and use the annual value in the projection; display in the user’s chosen period in the UI.

---

### 3.5 Longevity and projection horizon

- **Projection end default.** Technical design suggests default projection end = user age 95. That is a reasonable planning horizon; many advisors use 95 or beyond. Document that this is not a life-expectancy forecast but a planning horizon.
- **Partner.** When projection end is “partner age,” use the partner’s age to determine the last year. Ensure both user and partner ages are used correctly for SS and RMD (each person’s age drives their own SS and RMD).

---

### 3.6 Future considerations (out of scope for MVP/v1)

- **Monte Carlo or scenarios.** The PRD specifies a single deterministic projection. If the app later adds stochastic projections or multiple scenarios, keep the deterministic case as the primary output and document how scenarios are generated.
- **Pensions and annuities.** Out of scope per PRD; if added later, model as fixed or COLA-adjusted income streams and document assumptions.
- **Healthcare and LTC.** No explicit healthcare cost or long-term care in scope; COL can implicitly include them if the user enters a COL that reflects that. No need to separate for MVP.
- **State tax.** Single “tax rate on withdrawals” is sufficient for MVP. If state tax is added, document whether the default is federal-only or combined.

---

## 4. Summary table — default assumptions

| Assumption | Recommended default | Notes |
|------------|---------------------|--------|
| Inflation rate | 2.5% | Planning default; document in app/code. |
| Cost of living | User-entered (no default) | Required for projection. |
| Long-term investment return (nominal) | 6% | Blended; conservative. |
| Short-term investment return (nominal) | 4% | Savings/cash. |
| Social Security claiming age (user & partner) | 67 | FRA for 1960+ birth year. |
| Social Security benefit (user & partner) | Documented max (e.g. $48,216/year) | Source and year in code/README. |
| Pre-tax withdrawal start age | 59 | Whole years only; 59 approximates IRS 59½ rule. |
| RMD start age | 73 | SECURE 2.0; document law dependency. |
| Tax rate on withdrawals | 22% | Ordinary income; user can adjust. |
| Income growth rate | 2% | Until retirement age. |
| Retirement age (user & partner) | 67 | Can differ from claiming age. |
| Projection end | User age 95 | Planning horizon, not life expectancy. |

---

## 5. References

- [Product Requirements](product-requirements.md) — Section 6 (Planning Assumptions), Section 4 (Long-term goals), validation and projection behavior.
- [Technical Design](technical-design.md) — Section 9 (Projection engine), Section 8 (Validation).
- [Implementation Plan](implementation-plan.md) — Resolved decisions (SS default, ages, HSA/After-tax).
- IRS Publication 590-B (IRAs) — RMD tables and rules.
- SSA.gov — Full retirement age and benefit estimates (for user guidance and default benefit source).
