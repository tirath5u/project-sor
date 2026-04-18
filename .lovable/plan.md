

## Plan — Implement v18 parity (full build)

### 1. Engine + data model (`src/lib/loanLimits.ts`, `src/lib/sor.ts`)
- Replace 5-grade enum with full **OBBBA grade codes 0–13** lookup table from v18 (1st-yr undergrad through 4th+ year, plus graduate / professional / preparatory teacher cert tiers). Each row returns `{ subAnnual, combinedAnnual, additionalUnsubIfPlusDenied }`.
- Switch primary input to **single `annualNeed` field**. Engine derives `subBaseline = min(need, subStatutory)` and `unsubBaseline = min(need − subBaseline, unsubStatutory)` internally.
- Rename term keys: `intersession1/2` → `winter1/winter2` everywhere (sor.ts, scenarios.ts, components, route).
- Add `distributionModel: "equal" | "proportional"` toggle (Section G of v18).
- Implement **balance-forward** distribution (Section H): walk eligible terms in order; each term consumes its share but unspent share (term % < 100% or term ineligible/already-paid) flows forward to remaining eligible terms, capped at each term's own ceiling. Keep existing disbursement-mode recalc walker on top of this.
- Keep `disbursementMode` ("plan" vs "disbursement"), `disbursed` flag, `actualCredits` per term, recalc history.

### 2. UI — terms-as-columns matrix (`src/components/sor/TermsMatrix.tsx` new)
Spreadsheet-style results table mirroring v18:

```text
Row \ Col          | Fall  | Winter1 | Spring | Winter2 | Summer | AY Total
-------------------|-------|---------|--------|---------|--------|---------
FT Credits         |  12   |   —     |  12    |   —     |   6    |   30
Enrolled Credits   |  12   |   —     |   9    |   —     |   6    |   27
Term %             | 100%  |   —     |  75%   |   —     | 100%   |   —
Step-3 Share Sub   | $1,750|   —     |$1,750  |   —     |  $0    | $3,500
Net Paid Sub       | $1,750|   —     |$1,313  |   —     |  $0    | $3,063
Net Paid Unsub     | $1,000|   —     |  $750  |   —     |  $0    | $1,750
Final Sub          | $1,750|   —     |$1,313  |   —     |  $0    | $3,063
Final Unsub        | $1,000|   —     |  $750  |   —     |  $0    | $1,750
```

Sticky first column, horizontal scroll only when needed, COA-cap and adjustment cells highlighted inline.

### 3. UI — card view toggle (`src/components/sor/TermsCards.tsx` new)
Existing per-term card layout, kept as a toggle (`Table | Cards`) above results. Default = Table.

### 4. UI — compact inputs (`src/routes/index.tsx`)
- Section A: Grade Code dropdown (0–13 with descriptive labels), Dependency, PLUS-denied toggle, Annual Need — single row, 4 fields.
- Section B: per-term enabled / FT credits / enrolled credits / COA cap, in a compact 5-column inline grid (one row per term, terms stacked vertically) — uses far less vertical space than today's stacked NumberFields.
- Distribution toggle + Plan/Disbursement toggle inline above the matrix.

### 5. Ellucian brand retune (`src/styles.css`)
- Primary: deep purple `#4B2E83` → `--primary: 260 49% 35%` (oklch/HSL converted).
- Accent: gold `#FFB81C` → `--accent: 42 100% 55%`.
- Tighten typography: Inter for body, slightly heavier weights on headings, tabular-nums everywhere numeric.
- Update `--gradient-primary`, `--shadow-elegant` to match. Header chip with "Ellucian · Schedule of Reductions".

### 6. Bonus widgets
- **`src/components/sor/QuickTermCalc.tsx`** — collapsible card on `/`: enter grade + 1 term's FT/enrolled + need → get max Sub/Unsub for that single term using same engine.
- **`src/routes/lifecycle.tsx`** — new route `/lifecycle`: 4 academic years × terms grid; tracks cumulative Sub/Unsub against aggregate caps ($23,000 Sub dependent / $31,000 dependent total / $57,500 independent undergrad / $138,500 graduate). Each AY row links to a saved SOR run (in-memory for now; localStorage persistence).

### 7. Scenarios update (`src/lib/scenarios.ts`)
Re-key all existing scenarios to `winter1/winter2` and `annualNeed`; add 2-3 v18 reference scenarios with expected per-term Sub/Unsub to use as inline regression checks (badge "Matches v18 ✓" / "Off by $X").

### 8. Files touched
- New: `src/lib/loanLimits.ts` (rewrite), `src/components/sor/TermsMatrix.tsx`, `src/components/sor/TermsCards.tsx`, `src/components/sor/QuickTermCalc.tsx`, `src/routes/lifecycle.tsx`
- Modified: `src/lib/sor.ts`, `src/lib/scenarios.ts`, `src/components/sor/StepWalkthrough.tsx`, `src/components/sor/ResultsPanel.tsx`, `src/routes/index.tsx`, `src/routes/__root.tsx` (nav link to /lifecycle), `src/styles.css`
- Removed concept: separate `subNeed`/`unsubNeed` fields (replaced by single `annualNeed`)

### 9. Verification
After build, run all bundled v18 scenarios through the engine and confirm each term's Sub/Unsub matches the spreadsheet to the dollar; surface any deltas in the scenario picker.

