
# Fix the partial-entry disbursement bug

## The issue to correct

Yes — the bug is real, and the behavior you described is consistent with the current engine logic.

What is happening now:
- You enter **Paid Sub = 666** for term 1.
- The engine immediately treats term 1 as having historical activity.
- Because **Paid Unsub** is still sitting at its default `0`, the engine interprets that as **“Unsub for this term is locked at $0”** instead of **“user has not entered Unsub yet.”**
- It then redistributes the full remaining Unsub pool to future eligible terms, which is why you see **0** in term 1 and **1,750 / 1,750** pushed into terms 2 and 3.

So the app is currently confusing:
- **blank / not entered yet**
with
- **explicitly entered zero**

That is the core bug.

## Root cause in code

The current disbursement walker in `src/lib/sor.ts` uses term-level history, not loan-type-specific history:

- `hasHistoricalActivity(term)` becomes true as soon as **either** Paid Sub **or** Paid Unsub is non-zero.
- Then both of these are computed:
  - `lockedSub`
  - `lockedUnsub`
- Since `paidUnsub` is still `0`, `lockedUnsub` becomes `0` instead of `null`.
- `distributeRemainingPool(...)` then assumes term 1 already consumed **zero Unsub**, so it moves the whole Unsub pool forward.

That is why the screen “acts like you already decided Unsub = 0” before you have finished typing.

## What Lovable should change

### 1. Separate Sub history from Unsub history
**Edit:** `src/lib/sor.ts`

Replace the single term-level locking behavior with separate checks:

- `hasSubHistory(term)` → true only when Sub has actually been entered/refunded/committed
- `hasUnsubHistory(term)` → true only when Unsub has actually been entered/refunded/committed

Then use them separately:
- `lockedSub` should only lock Sub
- `lockedUnsub` should only lock Unsub

In other words:
- entering **Paid Sub** must **not** automatically lock **Unsub**
- entering **Paid Unsub** must **not** automatically lock **Sub**

### 2. Stop treating an unfilled Paid Unsub field as a real zero
**Edit:** `src/routes/index.tsx`
**Edit:** `src/lib/sor.ts`

Right now the numeric inputs coerce empty to `0` immediately:
- `CompactNum` converts `""` to `0`
- so the engine cannot distinguish “not entered yet” from “intentionally zero”

Fix this by making the paid/refund inputs support a pending blank state:
- use `number | null` for paid/refund fields, or
- keep local draft strings and only commit numeric values when the field is actually entered/confirmed

Required behavior:
- **blank** = not yet entered, do not anchor this loan type
- **0** = explicit user decision, do anchor at zero if confirmed

This is the most important usability fix.

### 3. Use Disbursed only for term-level credit history, not for both loan buckets
**Edit:** `src/lib/sor.ts`

Keep these concepts separate:

- **Term disbursed / actual credits** → affects historical credits and AY% recalculation
- **Paid Sub entered** → anchors only Sub for that term
- **Paid Unsub entered** → anchors only Unsub for that term

Do not let one bucket’s entry force the other bucket to zero.

### 4. Add UI guardrails in the disbursement grid
**Edit:** `src/routes/index.tsx`

Add a short helper note near the Paid Sub / Paid Unsub columns:

- “Entering Paid Sub does not zero Paid Unsub. Each loan type is anchored separately.”

Optionally:
- disable paid/refund inputs until **Disbursed** is checked, or
- show a subtle “pending entry” state until both values are intentionally committed

That will make the behavior understandable for users while they type.

### 5. Add regression tests for the exact bug
**Edit:** `src/lib/sor.test.ts`

Add these tests:

1. **Partial-entry bug repro**
   - 3 standard terms
   - dependent grade 1
   - annual need = 2000
   - full-time 12/12/12
   - disbursement view
   - enter `Paid Sub = 666` for term 1
   - leave `Paid Unsub` unentered
   - expect term 1 **Unsub is NOT forced to 0**
   - expect terms 2 and 3 **do NOT jump to 1750 / 1750**

2. **Explicit zero still works**
   - same scenario
   - explicitly commit `Paid Unsub = 0`
   - expect Unsub to redistribute to future eligible terms

3. **Symmetry test**
   - enter `Paid Unsub` first
   - confirm Sub is not zeroed or redistributed incorrectly

4. **Final committed pair**
   - `Paid Sub = 666`, `Paid Unsub = 1166`
   - term 1 anchors correctly
   - future terms remain correct

## Acceptance criteria

After the fix:

- If the user types **Paid Sub = 666** and has **not yet entered Paid Unsub**, the app should still show term 1 as having its planned Unsub eligibility, not zero.
- The app should **not** immediately push the whole Unsub pool into later terms.
- Only after the user explicitly enters or confirms **Paid Unsub = 0** should the engine treat term 1 Unsub as zero and redistribute the remainder.
- Sub and Unsub must anchor independently.

## Exact message to give Lovable

Tell Lovable:

- “The disbursement engine is anchoring both loan buckets from a single partial edit. When I type Paid Sub first, the app treats blank Paid Unsub as an explicit zero and redistributes all Unsub to future terms.”
- “Fix this by separating Sub history from Unsub history in `src/lib/sor.ts`. Entering Paid Sub must not lock Unsub, and entering Paid Unsub must not lock Sub.”
- “Do not coerce blank paid/refund inputs to `0` while the user is still typing. Blank must mean ‘not entered yet’; explicit `0` must mean ‘intentionally zero.’”
- “Add regression tests for the exact case: 3 terms, dependent grade 1, annual need 2000, term 1 Paid Sub 666 entered before Paid Unsub. The app must not show term 1 Unsub as 0 or move all Unsub to terms 2 and 3.”

## Files to change

- **Edit:** `src/lib/sor.ts`
- **Edit:** `src/routes/index.tsx`
- **Edit:** `src/lib/sor.test.ts`

## Small recommended polish while in there

If Lovable wants to make this extra clear in the UI:
- add a “pending / not yet entered” state for paid amounts
- add helper copy in disbursement mode explaining that Sub and Unsub are anchored independently
