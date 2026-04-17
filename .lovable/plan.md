
## What I found in the docs (the gap)

The ED scenarios doc defines a **5-step** process — our engine implements only Steps 1, 2, and a simplified 3. Steps 3 + 4 are the missing piece that drives Scenarios 1, 2, 3, 8, 10.1, 11:

- **Step 1** — Initial max (grade level + dependency lookup) ← *not in app*
- **Step 2** — AY enrollment % = `Σ enrolled / AY FT credits` ✅
- **Step 3** — Per-term **share** of the AY limit (e.g., 2 terms = 50% each, 3 terms = 33.34/33.33/33.33). Computed in whole-dollar shares of the **annual loan limit**, NOT of "remaining". ❌
- **Step 4** — Per-term enrollment % = `term enrolled / term FT` (can exceed 100%, capped at the term's share of remaining annual capacity). ❌
- **Step 5** — Term disbursement = `term share × term %`. Excess credits in one term re-balance to other terms (Scenarios 1, 2, 8). ❌

**Two big things our app gets wrong today:**

1. **Distribution model is wrong.** "Equal" / "Proportional-to-credits" do not exist in the regulation. The correct model is **Step 3 share × Step 4 term %**, with the residual (from term % < 100%) flowing forward to remaining terms up to each term's own ceiling.
2. **Per-term recalculation on enrollment change isn't modeled.** Scenarios 5, 9.1, 10.1 require: at each disbursement, recompute Steps 2–5 using actuals-to-date, subtract net paid, and apply the difference to the next term (negative = clawback off next term, positive = balloon).

Plus the missing Grade Level / Dependency lookup you flagged.

## Plan — what I'll change (no code yet)

### 1. Add Section A1 — Grade Level + Dependency
- Dropdown: Grade 0/1, Grade 2, Grade 3+, Graduate, Professional
- Toggle: Dependent / Independent (disabled for grad/professional)
- Auto-populates: Sub Max, Combined Cap (Sub+Unsub), and Additional Unsub (PLUS-denial) per the OBBBA 2026-27 table from the deep-dive
- "Override" toggle keeps the current manual statutory/need fields available

### 2. Rewrite the calculation engine to the 5-step ED model
Replace `distributeWithRemainder` with the actual regulatory math:

```
Step 1  initialMax (Sub, Unsub) ← lookup or override
Step 2  ayPct = enrolledAY / ftAY                  (not capped at 100%)
        annualLimit = initialMax × min(ayPct, 100%)
Step 3  termShare[i] = annualLimit ÷ N_terms       (cents-rounded; last term absorbs remainder)
Step 4  termPct[i] = enrolled[i] / termFT[i]       (can be >100%)
Step 5  rawTerm[i] = termShare[i] × termPct[i]
        — overflow when termPct>100% is capped at termShare[i] and the overflow
          dollars flow forward to subsequent terms whose termPct<100% had headroom
          (this is what makes Scenario 1: Fall stays at 50%, Spring absorbs the extra 25%)
        — terms with termPct < 50% → $0 (half-time gate)
```

### 3. Add a "Time-of-disbursement" mode (the big addition you asked about)
A toggle at the top: **"Plan view"** (intent-to-enroll) vs **"Disbursement view"** (recalculate each term).

In Disbursement view, each term row has a **"Disbursed?"** checkbox + **Actual credits at disbursement** field. The engine:
1. Walks terms in order
2. At each disbursed term: locks paid amount, recomputes Steps 2–5 with actuals-to-date + planned for future terms
3. Computes the **adjustment** (over/under-award) and applies it to the **next** undisbursed term — exactly like Scenario 5 (Spring Sub = $1,750 − $875 overaward = $875) and Scenario 9.1
4. If a future term's enrollment goes UP and AY% returns to 100%, the next disbursement gets the "balloon" (Scenario 1, 2)

### 4. UI changes
- Rename "Distribution Model" section → **"Per-term shares (Step 3)"** — show the auto-computed share table, no toggle (the model is the regulation)
- Add **"Per-term recalculation history"** panel under Results showing each disbursement event: before/after AY%, annual limit, and the adjustment applied
- Add the 5 missing canonical scenarios (1, 2, 5, 9.1, 10.1) to the scenario picker so QA can click & verify each matches the ED expected outcome to the dollar
- Logic Walkthrough: rebuild around Steps 1→5 with the per-term share + term % shown explicitly

### 5. Out of scope for this pass (call out, don't build)
- R2T4 mechanics (Scenario 6, 7) — too large; show a "use single-term SOR for re-enrolling students" note
- COA/SAI/OFA need calculator — keep manual `subNeed` / `unsubNeed` inputs for now
- Aggregate lifetime cap check

## Technical files affected
- `src/lib/sor.ts` — replace distribution logic with Steps 3/4/5; add `disbursementMode`, per-term `disbursed` + `actualCredits`, recalc walker, balloon/clawback
- `src/lib/loanLimits.ts` — **new** OBBBA 2026-27 lookup
- `src/lib/scenarios.ts` — add Scenarios 1, 2, 5, 9.1, 10.1 with expected outputs
- `src/components/sor/StepWalkthrough.tsx` — rebuild as 5 steps
- `src/components/sor/ResultsPanel.tsx` — add recalc-history block
- `src/routes/index.tsx` — add Grade/Dependency selector, Plan vs Disbursement toggle, per-term Disbursed checkbox + actual credits input

Approve and I'll switch to build mode and implement, then verify each ED scenario matches to the dollar.
