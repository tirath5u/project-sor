# V19 UI / Tooltip Polish + Audit Gap Closure

## Goal

Bring the live site at `sor.myproduct.life` to V19 audit parity in the **UI layer only**: the engine math is already correct, but the matrix, tooltips, labels, and Section A field order all leak v18 vocabulary, conflate SOR % with Enrollment Intensity, hide the Grad PLUS track, and let the user pick grade levels that aren't valid for the selected award year. None of this changes the calculator's outputs; it changes how we *talk to the user* about them.

---

## 1. Strip every "v18" / "v19" / "spreadsheet" reference from user-facing text

End users have no concept of v18/v19 - those are *our* internal milestones. Every tooltip, label, and visible string on the page should stand on its own with reference only to:

- The regulation (e.g., 34 CFR 685.203, OBBBA, the Combined Limit Shifting Rule),
- The award year (2025-26 vs 2026-27),
- The plain-English thing it does.

**Files to scrub** (user-visible strings only - JSDoc / code comments stay as-is):


| File                                     | What to change                                                                                                                                                                                                                                                                                          |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/sor/ResultsPanel.tsx`    | "Schedule of Reductions" header tooltip currently says "v18". Rewrite to: *"Calculates how Direct Loan annual limits are reduced for less-than-full-time enrollment under 34 CFR 685.203. Shows the SOR %, the reduced Sub/Unsub/Grad PLUS annual pools, and the per-term disbursements."*              |
| `src/components/sor/TermsMatrix.tsx`     | Regression strip text `"✓ Matches v18 to the dollar"` → `"✓ Matches expected scenario values"`. Header tooltips drop "v18".                                                                                                                                                                             |
| `src/routes/index.tsx`                   | Comment `{/* Section A — compact inputs */}` is fine (code comment). But the visible string `"Table = spreadsheet-style matrix mirroring v18 (sections B–J)..."` (line 949) → `"Table = compact spreadsheet view of every calculation step. Cards = per-term card layout, easier on narrow viewports."` |
| `src/components/sor/StepWalkthrough.tsx` | Already user-friendly; verify no v18 strings render.                                                                                                                                                                                                                                                    |


**Rule**: if a user looking at the page can see the text, it cannot say "v18", "v19", "the spreadsheet", "master spreadsheet", or "§ G/H".

---

## 2. Replace every em-dash (`—`) with a regular hyphen (`-`) in user-visible strings

Found in 14+ places across `src/routes/index.tsx`, `src/components/sor/ResultsPanel.tsx`, `src/components/sor/TermsMatrix.tsx`, `src/components/sor/StepWalkthrough.tsx`. These are all in tooltips, headers, comments-that-render, and inline body text.

**Scope**: only replace em-dashes inside **strings that render to the DOM** (JSX text content, `tooltip=`, `hint=`, `description=`, `label=`, `placeholder=` props, `<InfoTip>` children). Do NOT touch:

- JSDoc block comments at the top of files (those are dev docs, not rendered).
- The TS file headers (`* Card view — same data as TermsMatrix`).

Also check the `placeholder="—"` on line 1058 of `index.tsx` and replace with `placeholder="-"` so blank cells display as a regular dash.

---

## 3. Rename "Grade Code" → "Grade Level" + reorder Section A so Award Year comes first

The audit caught this: the dropdown is labeled **Grade Code** but the field is the Grade Level (SLC). Also today the layout is:

> Row 1: Grade Code, Dependency, Annual Need, AY FT Credits  
> Row 2: Award Year, LLE, COA, Other Aid, Requested Grad PLUS

Per the user, **Award Year drives which Grade Levels are valid**, so AY must be picked first. Reorder Section A:

> **Row 1 (new):** Award Year · Loan Limit Exception (Grandfathered) · Dependency · AY Full-Time Credits  
> **Row 2 (new):** Grade Level · Annual Financial Need · Cost of Attendance · Other Non-PLUS Aid · Requested Grad PLUS

`Grade Level` label change is a one-line edit in `src/routes/index.tsx` line 381 + `QuickTermCalc.tsx` line 93. also ensure all references to grade code are called grade level. 

---

## 4. Filter the Grade Level dropdown by selected Award Year

The user said "I'll send you the exact mapping in chat" - so I will **not invent values**. Instead I will set up the *plumbing* so when they send the mapping, dropping it into one constant in `loanLimits.ts` is a 30-second edit.

**Plumbing changes** (in `src/lib/loanLimits.ts`):

```ts
// Add a new constant - placeholder until the user provides the official mapping
export const GRADE_LEVELS_BY_AWARD_YEAR: Record<"2025-26" | "2026-27", GradeLevel[]> = {
  "2025-26": [/* TODO: user to provide */],
  "2026-27": [/* TODO: user to provide */],
};

// Helper that respects the mapping
export function gradeLevelsForAwardYear(ay: "2025-26" | "2026-27"): GradeLevel[] {
  return GRADE_LEVELS_BY_AWARD_YEAR[ay] ?? Object.keys(LIMITS) as GradeLevel[];
}
```

**As a starting placeholder** (so the UI works today and the user can correct later), seed with the audit's hint - 2025-26 hides graduate/professional/prep tiers, 2026-27 shows the full set. I'll mark this with a visible `// TODO: confirm with regulations` and a small InfoTip on the Grade Level field saying "Grade levels available depend on the selected Award Year. Confirm with current ED guidance before production use."

**UI changes** (`src/routes/index.tsx` + `QuickTermCalc.tsx`):

- Filter `GRADE_GROUPS` rendering to only show codes in `gradeLevelsForAwardYear(inputs.awardYear)`.
- Add a `useEffect` that auto-resets `inputs.gradeLevel` to a valid one (e.g. first allowed code) when the user toggles AY and the current selection is no longer in the allowed list.
- Same logic in `QuickTermCalc.tsx`.

When the user posts the official mapping in chat, the only edit needed is updating `GRADE_LEVELS_BY_AWARD_YEAR` - everything else flows.

---

## 5. Separate "SOR %" from "Enrollment Intensity (EI) %"

Per the user's clarification:

- **SOR %** = Σ AY enrolled credits ÷ AY FT credits, rounded. **Used by the engine** to reduce annual limits.
- **Enrollment Intensity (EI) %** = per-term enrolled ÷ term FT. **Reported to COD**, never used in the SOR calculation.

The engine already computes both correctly (`results.sorPctRounded` is SOR %, `term.intensityPct` is EI). The bug is **labeling**: the Results panel header card is labeled "Academic Year %" but should be **SOR %**, and the per-term EI display in the matrix should make clear it's the COD-reportable number, not part of the calc.

**Edits**:

- `src/components/sor/ResultsPanel.tsx` (lines 81-90): Rename the "Academic Year %" stat card to **"SOR %"** with subtitle *"Σ AY enrolled credits ÷ AY FT credits"*. Tooltip: *"The Schedule of Reductions percentage applied to the annual Sub/Unsub (and Grad PLUS) baselines. This is the calculation input - distinct from Enrollment Intensity (EI), which is the per-term value reported to COD."*
- `src/components/sor/TermsMatrix.tsx`: Rename the row currently labeled "Enrollment Intensity (EI) %" - keep the label, but update the tooltip to: *"Per-term Enrollment Intensity = (Enrolled + lapsed below-half-time credits) ÷ FT. **Reported to COD on disbursement records.** Not used in the SOR reduction itself - that uses the annual SOR % shown in the Results panel."*
- `StepWalkthrough.tsx`: Rename Step 2 header from "Academic Year Enrollment %" to "SOR % (Academic Year reduction factor)"; same disambiguating sentence.
- `QuickTermCalc.tsx`: Rename the "AY %" stat to "SOR %".

---

## 6. Add Grad PLUS to the Per-term Calculation Matrix

Currently `TermsMatrix.tsx` only emits Sub/Unsub rows. Per the user's choice, render Grad PLUS rows **only when `results.initialGradPlus > 0**` so the UG/2025-26 view stays clean.

**Edits to `src/components/sor/TermsMatrix.tsx**`:

- Add 3 conditional rows after the existing `Final Unsub` row (or interleaved with the Sub/Unsub Share / Calc / Final block to mirror their structure):
  - **Step-3 Share Grad PLUS** → `t.shareGradPlus`
  - **Calc Grad PLUS (Step 5)** → `t.calcGradPlus`
  - **Final Grad PLUS** (emphasized) → `t.finalGradPlus`, with COA-cap warning shading like Sub/Unsub.
- Build the row list dynamically: `const ROWS = baseRows.concat(results.initialGradPlus > 0 ? gradPlusRows : []);` - keep the static `ROWS` const for Sub/Unsub and append.
- Same conditional shading rules: `t.coaCapGradPlus > 0 && t.calcGradPlus > t.coaCapGradPlus` → warning color.

**Edits to `src/components/sor/TermsCards.tsx**`:

- Add a Grad PLUS final tile in the bottom grid (same conditional `results.initialGradPlus > 0`), 3-column layout instead of 2.
- Add a "Net Paid Grad PLUS" row in the `<dl>` block.

**Edits to `src/components/sor/StepWalkthrough.tsx**`:

- In the Step 4/5 table, add Calc Grad PLUS / Final Grad PLUS columns when applicable.
- In Step 1, add a third equation block when `initialGradPlus > 0` showing the COA derivation: `min(requested, COA - other aid - Sub - Unsub) = $X`.

---

## 7. Add the static "Per-term Cap" row to the matrix

Per the user's choice: **Per-term Cap = Reduced Annual ÷ Total Eligible Terms** (static, not running). Cell turns **red** when `Final > Per-term Cap`.

The engine already computes `perTermCapSub`, `perTermCapUnsub`, `perTermCapGradPlus` on `SORResults`, and `exceedsPerTermCapSub/Unsub/GradPlus` boolean flags on each `TermResult`. So this is purely a display addition.

**Edits to `src/components/sor/TermsMatrix.tsx**`:

- Add a new informational row group after Final Sub / Final Unsub (and Final Grad PLUS when shown):
  - **Per-term Cap (Sub)** → all cells show `fmtCurrency(results.perTermCapSub)` (same value across columns since it's static); the cell for the AY Total column shows the static cap too.
  - **Per-term Cap (Unsub)** → same.
  - **Per-term Cap (Grad PLUS)** → conditional on `initialGradPlus > 0`.
- Apply red text + red background tint (`bg-destructive/10 text-destructive`) on the corresponding **Final Sub/Unsub/GradPlus** cell when `t.exceedsPerTermCapSub/Unsub/GradPlus === true`. This is **separate from** the existing yellow COA-cap shading - the two states can co-occur, and red (cap exceeded) takes precedence.
- Add a small InfoTip on each Per-term Cap row: *"Reduced Annual ÷ Number of Eligible Terms. Informational only - proportional front-loading is permitted under 34 CFR 685.301(b)(8). Cells turn red when the final disbursement exceeds this cap so you can flag for audit review."*

**Edits to `src/components/sor/TermsCards.tsx**`:

- Add the same red-vs-yellow precedence on the Final Sub/Unsub/GradPlus tiles.
- Add a small "Per-term cap: $X" line under each Final tile.

---

## 8. Out of scope for this pass (call out to the user)

Things in the audit / transcript that I'm **not** doing in this pass, so the user knows:

- **Engine math changes**: none. The Balance-Forward engine + cent-precision rounding is already correct per the v19 plan and the $1,840 / 12-6-15 → $669/$335/$836 regression test still passes.
- **Public API endpoint**: deferred until after this UI pass lands and the user is ready to expose `/api/public/v1/calculate` (separate scope).
- **Lifecycle Tracker** (`/lifecycle`): not touched. Audit gap on DLGP lifecycle tracking is real but is a separate page; can be a follow-up.
- **PDF export**: not touched in this pass. Will likely need a follow-up to add the Grad PLUS columns + the "Per-term Cap" row to the PDF.

---

## Files that will change

```
src/lib/loanLimits.ts              # Add GRADE_LEVELS_BY_AWARD_YEAR map + helper
src/routes/index.tsx               # Reorder Section A, rename Grade Code, filter dropdown by AY, em-dash sweep
src/components/sor/TermsMatrix.tsx # Add DLGP rows, Per-term Cap rows, red exceedance shading, drop "v18" strings
src/components/sor/TermsCards.tsx  # Add DLGP tile, per-term cap label, red shading
src/components/sor/ResultsPanel.tsx# Rename to SOR %, rewrite header tooltip, em-dash sweep
src/components/sor/StepWalkthrough.tsx # Rename Step 2 to SOR %, add DLGP equations, em-dash sweep
src/components/sor/QuickTermCalc.tsx   # "Grade Code" → "Grade Level", "AY %" → "SOR %", AY-aware grade filter
```

No engine, no test, no scenario, no router changes.

---

## Verification when done

1. Open `/`, confirm Section A reads: Award Year → LLE → Dependency → AY FT (row 1), Grade Level → Annual Need → COA → Other Aid → Requested Grad PLUS (row 2).
2. Switch Award Year between 2025-26 and 2026-27 - the Grade Level dropdown contents change accordingly (using whatever mapping is in `GRADE_LEVELS_BY_AWARD_YEAR`).
3. Hover every InfoTip on the page - none mention "v18", "v19", "spreadsheet", or "§ G/H".
4. Search the rendered page for `—` (em-dash) - should be zero hits.
5. With grade = G/P + Requested Grad PLUS > 0 + COA > 0: matrix shows Share/Calc/Final **Grad PLUS** rows; the Per-term Cap rows render for all three buckets.
6. Force a Final Sub > Per-term Cap (e.g. proportional front-loading): that cell turns **red**, not yellow.
7. Results panel header card is labeled **SOR %** with the disambiguating subtitle; the matrix EI row tooltip explicitly says "reported to COD, not used in the SOR calc".

Once approved, I'll execute these edits in default mode in the order listed.