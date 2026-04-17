
## Schedule of Reductions — Dynamic Calculator (v1)

A single-page, public web calculator that natively reproduces the v8 SOR spreadsheet logic with an Ellucian-inspired modern UI. No login, no database — everything runs in the browser, instantly.

### Page layout (single scroll, sticky results panel on desktop)

**Left/main column — Inputs**, grouped to mirror the spreadsheet:

1. **Section A — Academic Calendar Configuration**
   - Cal Type (1–5) with inline warning for Type 3/4
   - Program Level (Undergraduate / Graduate) — drives the Summer FT=12 default + warning for UG
   - Summer Term Position (N/A / Trailer / Header) with helper text on which AY limits to enter
   - AY Type (SAY / BBAY1 / BBAY2) — BBAY3 noted as out-of-scope
   - Number of Standard Terms (2–4)
   - Toggles: Include Summer 1, Summer 2, Intersession 1, Intersession 2

2. **Section B — Annual Loan Baselines**
   - Subsidized: Statutory Limit, Student Need → Max Baseline (auto = lower of the two)
   - Unsubsidized: Statutory Limit, Student Need → Max Baseline (auto)

3. **Section C — Term-by-Term Enrollment**
   - Dynamic columns: only the terms enabled in Section A appear
   - Per term: FT credit threshold, half-time cliff (auto = FT ÷ 2), credits enrolled, amount already paid (Sub & Unsub)
   - Eligibility chip per term: "Eligible" / "Below half-time" / "Off"
   - AY Total column

4. **Section E — Distribution Model**
   - Equal / Proportional-to-credits (extendable later)

5. **Section G — COA Safety Gate**
   - Per-term Max Allowed (Sub & Unsub)

**Right column — Live Results (sticky)**:

- **Section D summary**: Enrollment Fraction, SOR %, Reduced Annual Limits (Sub & Unsub), Remaining payout capacity, Eligible terms count
- **Section F — Calculated Disbursements** table (per term + AY total, Sub & Unsub)
- **Section G — Final Approved Payout** table (after COA cap, per term + AY total)
- **Section H — Verification badges**: green "Balanced" or red "Over-allocated by $X" for Sub & Unsub
- Inline warnings: Cal Type 3/4 caution, UG Summer FT≠12, BBAY3 out-of-scope, intersession overlap, etc.

### Calculation engine (pure TypeScript module, fully tested logic)

- **Eligibility**: term active AND credits ≥ half-time cliff
- **SOR %**: min(1, Σ enrolled credits across active terms ÷ Σ FT credits across active terms)
- **Reduced Annual Limit** = Max Baseline × SOR %
- **Remaining capacity** = Reduced Limit − sum(already paid)
- **Distribution** (Equal): split remaining capacity across remaining eligible terms; **remainder applied to the last eligible term** (matches v8 rounding fix → e.g., 1166 / 1166 / 1168)
- **Final Approved Payout per term** = min(calculated disbursement, COA cap)
- **Verification** = Reduced Limit − Σ Final Payouts (should be $0)

### Visual design — Ellucian-inspired modern

- Deep purple/indigo primary, soft neutrals, white surfaces, generous whitespace, subtle shadows
- Clean sans-serif (Inter), rounded inputs, semantic chips for status (green = eligible, amber = warning, red = over-allocation)
- Fully responsive: results panel collapses to a sticky bottom card on mobile (matches your current ~300px viewport gracefully)
- Reset / "Load Example" buttons; a print-friendly view that mirrors the SOR layout

### Out of scope for v1 (call out, don't build)

- Saving scenarios, accounts, PDF/Excel export, BBAY3 (clock-hour), multi-student batch

### Next step

Upload the supporting FSA documents whenever ready — I'll cross-check formulas, exact label wording, and any Cal Type 3/4 / BBAY edge cases before coding, then implement.
