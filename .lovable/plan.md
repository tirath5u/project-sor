
# Fix the SOR math regression and make the walkthrough/PDF show the real numbers used

## What is correct vs incorrect

### Correct rule to preserve
For a **dependent first-year undergrad** using the normal statutory lookup:
- **Sub cap = $3,500**
- **Combined annual limit = $5,500**
- Therefore the base Unsub allowance comes from the **combined limit shifting rule**, not remaining need.

So the correct Step 1 math is:

- If **Annual Need = $5,000**:
  - Sub baseline = `min($5,000, $3,500) = $3,500`
  - Unsub baseline = `$5,500 - $3,500 = $2,000`
- If **Annual Need = $2,000**:
  - Sub baseline = `min($2,000, $3,500) = $2,000`
  - Unsub baseline = `$5,500 - $2,000 = $3,500`

Then Step 2 reduces those baselines by the AY % when the student is less than full-time.

### What is incorrect now
1. Some app/PDF states are showing **Unsub = $0** for cases that should still have combined-limit Unsub eligibility.
2. The walkthrough/PDF only shows real numbers in Steps 1–2; **Steps 3–5 fall back to generic prose**.
3. Labels like **“AY %” / “EI percentage” / “Intensity %”** are not self-explanatory enough.

## Root cause to fix

The engine already contains the right combined-limit formula in `src/lib/sor.ts`:
- `subBaseline = min(sub cap, need)`
- `unsubBaseline = combined limit - subBaseline`

But the app is still vulnerable to **stale statutory cap state**:
- Several scenarios in `src/lib/scenarios.ts` hard-code `unsubStatutory: 0`
- `src/routes/index.tsx` only auto-refreshes caps when grade/dependency/PLUS-denial changes
- So if a scenario is loaded with the same grade/dependency as the current state, the app can keep stale caps and produce the wrong PDF/app output

That is why you are seeing cases like ED-5 export as `$3,500 / $0` even though the lookup should give a first-year dependent borrower combined-limit Unsub headroom.

## What Lovable should change

### 1. Centralize statutory-cap normalization in the engine
**Edit:** `src/lib/sor.ts`

Add one source of truth such as `resolveStatutoryCaps(inputs)`:
- If `overrideLimits === false`, always derive caps from `lookupLimits(inputs.gradeLevel, inputs.dependency, inputs.parentPlusDenied)`
- If `overrideLimits === true`, use the manual caps from `inputs`

Then calculate Step 1 from those **effective caps**, not directly from raw `inputs.subStatutory` / `inputs.unsubStatutory`.

Also return these in `SORResults` so UI and PDF use the exact same numbers:
- `effectiveSubStatutory`
- `effectiveUnsubStatutory`
- `effectiveCombinedLimit`

This prevents the engine from ever drifting because of stale scenario state.

### 2. Fix scenario loading so non-override scenarios never inject stale caps
**Edit:** `src/routes/index.tsx`
**Edit:** `src/lib/scenarios.ts`

When loading a scenario:
- If `overrideLimits` is false, immediately normalize its caps from lookup before saving it to state

Also clean up the scenario builders:
- Remove hard-coded `$0` Unsub caps from normal dependent first-year scenarios unless the scenario is intentionally testing a manual override case
- Rewrite any scenario summaries/expected text that currently imply the wrong Step 1 baseline

This is the app-state bug that is most likely causing the regression you’re seeing.

### 3. Make the walkthrough use actual numbers in Steps 3–5
**Edit:** `src/components/sor/StepWalkthrough.tsx`
**Edit:** `src/lib/sor.ts`

Extend `SORResults` so the walkthrough can print the real values used, not generic text.

Add/derive display-ready data for:
- **Step 3:** annual Sub/Unsub pool, distribution model, number of eligible terms, each term’s `shareSub` / `shareUnsub`
- **Step 4:** each term’s `enrolled`, `ftCredits`, `termPct`, `intensityPct`, eligibility status
- **Step 5:** each term’s `calcSub`, `calcUnsub`, carry-forward effect, COA clamp, final `finalSub` / `finalUnsub`

Then rewrite the walkthrough so each step shows the actual numbers:
- Step 3 example style:
  - `Reduced annual Sub $2,205 split equally across 2 eligible terms = Fall $1,102, Spring $1,103`
- Step 4 example style:
  - `Fall term % = 9 ÷ 12 = 75%; Spring term % = 6 ÷ 12 = 50%`
- Step 5 example style:
  - `Fall Sub = $1,102 × 75% = $827`
  - `Spring Sub = $1,103 × 50% = $551`
  - if history anchoring / carry-forward applies, say exactly where the dollars moved

That will make the walkthrough auditable by users.

### 4. Make the PDF mirror the real walkthrough math
**Edit:** `src/lib/pdfExport.ts`

Update Section 6 so it uses the same detailed walkthrough data as the on-screen panel.

Change the PDF from generic statements to real-number narratives:
- Step 1: use effective statutory caps + combined limit
- Step 2: show numerator, denominator, raw AY %, rounded AY %, reduced Sub, reduced Unsub
- Step 3: list actual per-term shares
- Step 4: list actual term % / intensity % per term
- Step 5: show formula outputs and final clamped results per term

Also change the PDF “Computed baselines” line to explicitly say:
- `Combined annual limit = effective Sub cap + effective Unsub cap`
- `Unsub baseline = combined annual limit - actual Sub baseline`

So the PDF itself teaches the rule.

### 5. Replace unclear labels with plain English
**Edit:** `src/components/sor/ResultsPanel.tsx`
**Edit:** `src/components/sor/TermsMatrix.tsx`
**Edit:** `src/lib/pdfExport.ts`

Rename or expand labels so first-time users understand them:
- `AY %` → `Academic Year enrollment %`
- If `EI` appears anywhere, remove the acronym unless it is formally defined; use plain English instead
- `Intensity %` → keep the label but add explanatory subtext/tooltips like:
  - `Enrollment intensity after carried LTHT credits`
- In annual totals and PDF, add one-line definitions under the labels

The current issue is not only math; it is also interpretability.

### 6. Add targeted regression tests for this exact bug
**Edit:** `src/lib/sor.test.ts`

Add explicit tests for the scenarios you described:

1. **Dependent first-year, need $5,000, normal lookup caps**
   - Expect `subBaseline = 3500`
   - Expect `unsubBaseline = 2000`

2. **Dependent first-year, need $2,000, normal lookup caps**
   - Expect `subBaseline = 2000`
   - Expect `unsubBaseline = 3500`

3. **Scenario-load normalization**
   - Build/load a scenario with stale manual caps while `overrideLimits = false`
   - Expect calculation to use lookup-derived caps, not stale ones

4. **PDF walkthrough parity**
   - Verify exported Step 1/2/3 strings use the same effective caps and reduced totals as the engine results

This makes the bug hard to reintroduce.

## Exact message to give Lovable

Tell Lovable:

- “The combined limit shifting rule regressed again. For a dependent first-year borrower, do not calculate Unsub from remaining need. Use:
  - Sub baseline = min(annual need, subsidized cap)
  - Unsub baseline = combined annual limit - actual Sub baseline
  - so need $5,000 => Sub $3,500 / Unsub $2,000, and need $2,000 => Sub $2,000 / Unsub $3,500.”
- “Normalize statutory caps from `lookupLimits(...)` whenever `overrideLimits` is false. Do not trust stale scenario/state cap values.”
- “Fix scenario loading so a same-grade scenario cannot leave stale caps in state.”
- “Update the on-screen walkthrough and PDF Step 3–5 to show the actual numbers used per term, not generic formulas.”
- “Spell out AY % / intensity terms in plain English.”
- “Add regression tests for the $2,000 and $5,000 need cases plus stale-cap scenario loading.”

## Files to change

- **Edit:** `src/lib/sor.ts`
- **Edit:** `src/routes/index.tsx`
- **Edit:** `src/lib/scenarios.ts`
- **Edit:** `src/components/sor/StepWalkthrough.tsx`
- **Edit:** `src/components/sor/ResultsPanel.tsx`
- **Edit:** `src/components/sor/TermsMatrix.tsx`
- **Edit:** `src/lib/pdfExport.ts`
- **Edit:** `src/lib/sor.test.ts`

## Small extra cleanup to include while in there
There is also a separate hydration mismatch in the project. While implementing the above, Lovable should do a quick SSR-safety pass on any client-only random/date rendering so the preview stays stable after these changes.
