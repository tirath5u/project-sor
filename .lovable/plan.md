
# v19 Implementation Plan — Grad PLUS, Award Year Gate, LLE Switch

This plan maps your v19 spreadsheet rules into `src/lib/sor.ts` and the React UI without breaking the v18 Sub/Unsub balance-forward engine you just fixed (the $1,840 / 12-6-15 → $669/$335/$836 test stays green).

---

## 1. Engine changes (`src/lib/sor.ts` + `src/lib/loanLimits.ts`)

### 1.1 New input fields on `SORInputs`
Add to the interface (with sensible defaults in `defaultInputs()` so existing callers don't break):

- `awardYear: "2025-26" | "2026-27"` — drives the SOR gate. Default `"2026-27"`.
- `loanLimitException: boolean` — grandfathered? Switches Sub/Unsub limit table. Default `false`. Does NOT gate Grad PLUS.
- `coa: number` — Cost of Attendance. Default `0`.
- `otherAid: number` — Pell, grants, scholarships, outside loans (excludes Sub/Unsub/PLUS). Default `0`.
- `requestedGradPlus: number` — student's requested Grad PLUS amount. Default `0`.
- `applyGradPlus: boolean` — UI convenience flag (only meaningful when grade ≥ 8). Default `false`.

Per-term additions on `TermInput`:
- `paidGradPlus: number | null` — same null/zero semantics as `paidSub`.
- `refundGradPlus: number | null`.
- `coaCapGradPlus: number` — optional per-term COA cap (Section I row 81).

### 1.2 Loan limit tables (`src/lib/loanLimits.ts`)
Per spec §3.2: two parallel tables, both keyed by grade + dependency.

- Rename current `LIMITS` → `LEGACY_LIMITS` (these are today's values — the v18 grandfathered table).
- Add `OBBB_LIMITS`: **mirror of LEGACY_LIMITS values** as a working placeholder per spec (one-row edits later when ED publishes).
- Update `lookupLimits(grade, dep, plusDenied, useLegacyTable)` — new boolean parameter chooses table. When `useLegacyTable === true` (LLE = Yes), use legacy; otherwise OBBB. Defaults to legacy for backward compatibility so existing callsites don't silently change behavior.
- Add a constant `OBBB_TABLE_IS_PLACEHOLDER = true` so the UI can render the warning banner.

### 1.3 Grad PLUS engine (`src/lib/sor.ts`)
Grad PLUS runs as a **third parallel bucket** alongside Sub/Unsub, reusing the same balance-forward distributor. Logic per spec §4.3 and §4.7:

- **Initial Max DLGP** (mirrors B26): if `gradeLevel` is grad/professional (`isGradOrProf`), `MAX(0, MIN(requestedGradPlus, coa - otherAid - subBaseline - unsubBaseline))`. Otherwise 0. (Grade is the only access gate; LLE does NOT gate Grad PLUS.)
- **Reduced Annual DLGP** (mirrors B45): if `awardYear === "2026-27"` → `round2(SOR% × initialGradPlus)`; else `round2(initialGradPlus)`.
- **Per-term Calc DLGP**: pass `reducedGradPlus`, the term's net-paid Grad PLUS as `locked`, the same `eligible[]` array, and the existing weights through `distributeRunningPoolDetailed(...)`. Same balance-forward semantics as Unsub.
- **Final DLGP**: `MIN(calcGradPlus, coaCapGradPlus)` when cap > 0, then `round2`. Mirrors §4.6.

### 1.4 Award Year SOR gate (spec §4.5)
Apply uniformly across DLSU, DLUN, **and** DLGP reduced limits:
- `sorApplicable = awardYear === "2026-27"`
- If false: `reducedSub = round2(subBaseline + additionalUnsubBase carry as today)`, `reducedUnsub = round2(unsubBaseline)`, `reducedGradPlus = round2(initialGradPlus)` — i.e. **no SOR % applied at all** (still subject to combined-limit shifting & PLUS-denial uplift, which are statutory not SOR).
- If true: behave exactly as today, **plus** the new Grad PLUS reduction.

Add `sorApplicable: boolean` and `awardYear: "2025-26" | "2026-27"` to `SORResults` so the UI can render the badge / disabled state.

### 1.5 Cent-precision rounding (spec §2.1, §4.6)
Introduce a `round2(n) = Math.round(n * 100) / 100` helper.
- Apply to: Reduced Annual Limits (Sub, Unsub, GradPlus), all `final*` per-term values, and the totals on results.
- Keep `Math.round()` (whole-dollar) inside the **internal** distributor to preserve the current $669/$335/$836 fixed test. We round to cents only at the **final boundary** (Final Approved Payout + Reduced Annual Limit). This avoids regressing the v18 balance-forward test you just shipped while honoring the COD SmallCurrencyType requirement.
- Update `fmtCurrency` to allow 2 decimal places via a new `fmtCurrencyCents(n)`; keep `fmtCurrency` (whole-dollar) for backward compatibility but switch the user-facing dollar cells per spec §9.2 to `fmtCurrencyCents`.

### 1.6 New result fields on `SORResults`
- `awardYear`, `sorApplicable`
- `loanLimitException: boolean`
- `coa`, `otherAid`
- `initialGradPlus`, `reducedGradPlus`, `remainingGradPlus`
- `paidGradPlusTotal`, `refundGradPlusTotal`, `netPaidGradPlusTotal`, `totalFinalGradPlus`
- `verifyGradPlus`
- `obbbTableIsPlaceholder: boolean` — surfaces the banner state
- `perTermCapSub`, `perTermCapUnsub`, `perTermCapGradPlus` — diagnostic per spec §4.8 (`reducedAnnual / numActiveTerms`)

Per-term `TermResult` additions:
- `shareGradPlus`, `calcGradPlus`, `finalGradPlus`
- `paidGradPlus`, `refundGradPlus`, `netPaidGradPlus`
- `coaCapGradPlus`
- `adjustmentGradPlus`
- Boolean flags `exceedsPerTermCapSub/Unsub/GradPlus` — drives the yellow row tint in the matrix per §4.8 ("informational only — Proportional front-loading is permitted").

### 1.7 FT credit default by grade (spec §4.4)
In `defaultTerm()` / `defaultInputs()`, seed FT credits from grade level: 9 for grad/prof (SLC ≥ 8), 12 for UG, 5 for grad summer / 6 for UG summer. **One-time on grade change** (existing `useEffect` pattern) — never formulaic. Cell remains user-editable; we do not lock it.

---

## 2. Test coverage (`src/lib/sor.test.ts`)
Add the v19 verification scenarios from spec §8:

1. **Regression guard** — keep the existing `$1,840 / 12-6-15 → $669/$335/$836` test untouched.
2. **Scenario 6** Basic Grad PLUS (grandfathered, 2 terms × 9 grad credits, $40k COA, $5k other aid, $15k requested) → Initial DLGP $14,500, Reduced $14,500, Equal split $7,250 / $7,250.
3. **Scenario 7** Grad PLUS with SOR reduction (Term 2 = 5 credits) → SOR% = 78, Reduced DLGP = $11,310.
4. **Scenario 8** Non-grandfathered grad → DLGP identical to scenario 6 (proves LLE does NOT gate Grad PLUS).
5. **Scenario 9** Undergrad with Requested Grad PLUS = $5,000 → Initial DLGP = 0 (grade gate).
6. **Scenario 10** Proportional Grad PLUS (3 terms 9/6/9 credits, SOR 89%) → DLGP $4,839.38 / $3,226.25 / $4,839.38 ±2¢.
7. **Scenario 11** AY 2025-26, non-grandfathered, UG → `sorApplicable === false`, Reduced = Initial Max, no SOR factor applied.
8. **Award year toggle** — same inputs at 2026-27 produce reduced limits; at 2025-26 produce unreduced limits.

---

## 3. Frontend (`src/routes/index.tsx`)

### 3.1 Section A additions (above Annual Need)
- **Award Year** segmented control: `2025-26` / `2026-27`. Wire to `inputs.awardYear`. Show a small chip "SOR Applies" / "SOR Does Not Apply (pre-OBBB rules)".
- **Loan Limit Exception (Grandfathered)** Switch with InfoTip explaining: "Switches the Sub/Unsub limit table between Legacy and OBBB. Does NOT affect Grad PLUS access — Grad PLUS gating is grade-level only."
- When `loanLimitException === false` AND OBBB table is the placeholder mirror, show a small amber banner under Section A: *"OBBB 2026-27 limits for non-grandfathered students currently mirror the Legacy values pending final ED rule. Verify before production use."* (Spec §3.2.)

### 3.2 Section B additions (need / aid block)
Add three new `NumberField`s next to "Annual Financial Need":
- **COA** (`inputs.coa`)
- **Other Non-PLUS Aid** (`inputs.otherAid`) — InfoTip: "Pell, grants, scholarships, outside loans. Excludes Sub/Unsub/PLUS."
- **Requested Grad PLUS** (`inputs.requestedGradPlus`) — disabled with a muted "Grad/Professional only" hint when grade < 8.

Show derived: `Initial Max DLGP: {fmtCurrencyCents(results.initialGradPlus)}` next to existing "Sub baseline / Unsub baseline" hint line.

### 3.3 Per-term inputs
Extend the per-term editor (whether in `TermsCards.tsx`, `TermsMatrix.tsx`, or wherever paid/refund fields render) to include three new fields **only when grade ≥ 8 AND `applyGradPlus`** (or always-visible but greyed out for UG, mirroring spec §8.4):
- Paid Grad PLUS (with null-vs-0 semantics)
- Refund Grad PLUS
- COA cap Grad PLUS (Section I)

Add the third disbursement column in `TermsMatrix.tsx`: Calc DLGP → Final DLGP, with the same dotted-underline adjustment indicator.

### 3.4 Results panel (`ResultsPanel.tsx`)
- Add a Reduced Annual DLGP card next to the existing Sub / Unsub cards (only render when `initialGradPlus > 0`).
- Add a "DLGP" column to the per-term final payout summary table.
- Add a per-term-cap diagnostic row (informational, yellow if exceeded — non-blocking) per §4.8.
- Add an audit chip: `RECONCILED` when `|verify*| ≤ $2` for all three buckets, else `DISCREPANCY DETECTED`. Spec §4.9.
- Display the SOR-applicable status: green "SOR applied" pill for 2026-27, neutral "SOR not applicable (2025-26 award year)" pill otherwise.

### 3.5 StepWalkthrough.tsx + pdfExport.ts
- Mention Award Year gate in Step 2 narrative.
- Show the Grad PLUS sub-step in Step 5 when `initialGradPlus > 0`.
- PDF: add Reduced DLGP, per-term DLGP columns, and the placeholder banner footer when applicable.

### 3.6 Currency display (spec §9.2)
Replace `fmtCurrency` with `fmtCurrencyCents` throughout the user-facing dollar cells: Section B inputs, Section D reduced limits, Section E paid/refund cells, Section F remaining, Section H calc, Section I COA caps + final payouts, Section J verification. Keep whole-dollar `fmtCurrency` for chart labels / chip displays where two decimals would clutter.

---

## 4. Scenarios (`src/lib/scenarios.ts`)
- Existing scenarios: stamp `awardYear: "2026-27"`, `loanLimitException: false` so behavior is unchanged.
- Add new scenarios under a new "v19: Grad PLUS" group matching §8.2 (#6, #7, #8, #10) and a "v19: Award Year Gate" group (#11, #12, #13).
- For grad scenarios, set `coa`, `otherAid`, `requestedGradPlus`, and the `expectedTerms` map for the regression strip in `TermsMatrix.tsx`.

---

## 5. Things explicitly NOT changing
Per spec §9.3:
- DLSU and DLUN core balance-forward math (the dynamic distributor you just fixed). Untouched.
- Lifecycle Tracker route (`src/routes/lifecycle.tsx`). No v19 changes.
- The fixed-test contract: `$1,840` / 12-6-15 → `$669/$335/$836`.
- `$0 disbursement warning` (spec §1, out of scope).

---

## 6. Risks & how this plan handles them
| Risk | Mitigation |
|---|---|
| Cent-rounding inside the distributor would drift the locked $669/$335/$836 test | Round to cents only at the **boundary** (Reduced Annual + Final Payout). Distributor remains whole-dollar internally. |
| OBBB table values are placeholders | `OBBB_TABLE_IS_PLACEHOLDER` constant + always-visible banner per spec §3.2. One-row edits later. |
| Adding many new optional fields could break stored scenarios | All new fields have safe defaults; `defaultInputs()` populates them; scenarios that omit them inherit defaults. |
| Grad PLUS UI clutter for UG users | Grad PLUS inputs hidden / greyed when grade < 8, matching spec §8.4 "visually greyed out for UG". |
| TermsMatrix already crowded | Render Grad PLUS rows conditionally on `initialGradPlus > 0` so UG/2025-26 views stay clean. |

---

## 7. Order of implementation (one batched edit per file group)
1. `src/lib/loanLimits.ts` — add OBBB table + `useLegacyTable` param + placeholder constant.
2. `src/lib/sor.ts` — extend `SORInputs`, `TermInput`, `SORResults`, `TermResult`; add `round2`, Grad PLUS computation, Award Year gate, per-term-cap diagnostic, cent-rounding boundary; add `fmtCurrencyCents`.
3. `src/lib/sor.test.ts` — add v19 scenarios (keep balance-forward regression intact).
4. `src/lib/scenarios.ts` — backfill `awardYear` / `loanLimitException` on existing entries; add new v19 scenarios.
5. `src/routes/index.tsx` — Section A (Award Year + LLE), Section B (COA + Other Aid + Requested Grad PLUS), banner.
6. `src/components/sor/TermsMatrix.tsx` + `TermsCards.tsx` — DLGP rows/columns + per-term-cap diagnostic shading.
7. `src/components/sor/ResultsPanel.tsx` + `StepWalkthrough.tsx` — DLGP card + walkthrough copy + audit chip + SOR-applicable pill.
8. `src/lib/pdfExport.ts` — DLGP columns, banner footer, currency-cents formatting.
9. Run `bunx vitest run` — all tests including new Grad PLUS + Award Year scenarios pass; the $669/$335/$836 lock test stays green.

Once you approve, I'll execute steps 1-9 in default mode.
