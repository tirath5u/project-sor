

# Quick clarifications + targeted Step 3 polish + acronym pass

## What I found vs what was reported

**1. The "Combined Limit Shifting" engine bug — already fixed in the current code.**
- `src/lib/sor.ts` line 637: `unsubBaseline = Math.max(0, combinedLimit - subBaseline)` — exactly the formula you specified.
- `resolveCaps()` (line 590) forces the lookup table whenever `overrideLimits` is false, so stale scenario state cannot leak in.
- `src/lib/sor.test.ts` already asserts both your test cases and they pass:
  - Need $5,000 → Sub $3,500 / Unsub $2,000
  - Need $2,000 → Sub $2,000 / Unsub $3,500
- `loadScenario()` in `src/routes/index.tsx` re-normalizes caps from the lookup on every scenario load.

If you are still seeing `Sub $3,500 / Unsub $0` for Need $5,000 in the live preview, the most likely cause is the **"Override statutory limits"** toggle being ON with `Unsub statutory cap = $0` left over from an earlier session. As a safety net I will:
- Add a visible warning chip in the inputs panel whenever `overrideLimits=true` AND the manual caps differ from the lookup, so the override state can never silently break Step 1.
- Add one more regression test: `overrideLimits=true` honors manual caps, and toggling it off snaps back to the lookup.

If you can reproduce the wrong baseline with **Override OFF**, please share a screenshot of the inputs panel — that would be a real regression and I would fix it immediately. Based on current source, it does not exist.

**2. "EI" acronym — does not appear anywhere in the source.**
A repo-wide search for `\bEI\b` returns zero matches. The labels actually rendered are `Term enrollment %` and `Intensity %`. I'll still:
- Rename `Intensity %` → `Enrollment Intensity (EI) %` everywhere it appears (matrix header, cards, walkthrough table, PDF, tooltips) so the carry-over meaning is explicit and the term "EI" is defined in-product for stakeholders who do use the acronym.
- Keep `Term enrollment %` as-is (it is already plain English) but add a one-line tooltip distinguishing it from EI.

**3. Step 3-5 walkthrough numbers — Steps 4 and 5 already show real values per term; Step 3 does not.**
Currently Step 3 prints:
> "Equal model: $2,205 Sub split across 2 eligible terms ... Resulting Sub split: Fall $1,102 · Spring $1,103."

That has the inputs and outputs but not the formula proof you asked for. I will rewrite Step 3 (on-screen and PDF) to show the math like:

> Payout per term = $1,500 ÷ 3 = $500
> Sub: $2,205 ÷ 2 = $1,102 → Fall $1,102, Spring $1,103 (last term absorbs +$1)
> Unsub: $1,260 ÷ 2 = $630 → Fall $630, Spring $630

For the proportional model the proof becomes `share = $2,205 × (12 ÷ 24) = $1,102` per term.

Steps 4 and 5 already render `Fall: 9 ÷ 12 = 75%; Sub $1,102 × 75% = $827; Final $827 Sub` — I'll leave that intact and only tighten the wording slightly.

## Files to change

- **Edit** `src/components/sor/StepWalkthrough.tsx` — Step 3 formula proof; rename Intensity column header.
- **Edit** `src/lib/pdfExport.ts` — mirror Step 3 formula in the exported PDF; rename Intensity column.
- **Edit** `src/components/sor/TermsMatrix.tsx`, `src/components/sor/TermsCards.tsx` — rename `Intensity %` to `Enrollment Intensity (EI) %` with updated tooltip.
- **Edit** `src/routes/index.tsx` — add the "Override active — caps differ from lookup" warning chip near the override toggle.
- **Edit** `src/lib/sor.test.ts` — add the override on/off snap-back regression test.

## Out of scope (call out if you want them)

- Changing any Step 1 / baseline math — current implementation already matches your spec and is test-covered.
- Renaming `Term enrollment %` (already plain English).
- Touching PDF layout beyond the Step 3 paragraph and one column header.

