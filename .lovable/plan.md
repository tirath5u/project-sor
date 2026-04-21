

# Add Tooltips & Polish UX Across the SOR Calculator

Add inline help (info-icon tooltips) to every field, toggle, option, and column header where the meaning, formula, or regulatory rule is not self-evident. Then make a focused pass on visual hierarchy, alignment, and Ellucian-aligned styling so the page reads like a tool built by a senior product designer.

## Where tooltips will be added (and what they'll say)

### Header & global controls
- **Scenario picker** — "Pre-built test cases from the Debug Guide. Selecting one overwrites all current inputs."
- **Reset button** — "Clears all inputs back to defaults. Cannot be undone."
- **Lifecycle Tracker link** — "Walk a single student through enrollment changes term-by-term."

### Section A — Student & Loan Period
- **Grade Code** — "Determines the statutory Sub/Unsub annual maximums per 34 CFR 685.203."
- **Dependency** — "Independent students get the additional Unsub allowance. Graduate/professional are always Independent (locked)."
- **Annual Financial Need** — "Cost of Attendance minus EFC/SAI minus other aid. Drives the Sub baseline. Unsub is NOT need-based — it's calculated from the Combined Limit Shifting Rule."
- **AY Full-Time Credits** — "The denominator for the Academic Year %. Example: 24 FT credits / year."
- **Standard terms (2/3/4)** — "Number of standard terms in the academic year."
- **Calendar (AC1-AC4)** — Each option gets a tooltip: "AC1 = Standard term Scheduled AY", "AC2 = Standard term Borrower-Based AY", "AC3 = Non-standard term-based", "AC4 = Non-standard, non-term (clock-hour or credit-hour without terms)".
- **Program Level / AY Type** — "SAY = Scheduled Academic Year (fixed calendar). BBAY = Borrower-Based Academic Year (floats with enrollment)."
- **Parent PLUS denied** — "Triggers the additional Unsub allowance for dependent undergraduates whose parent was denied a PLUS loan."
- **Override statutory limits** — "Manually enter Sub/Unsub maximums instead of using the grade-level lookup. Use only for edge cases."
- **All Pills (Sub stat cap, Sub baseline, +PLUS-denial, etc.)** — Hover reveals the formula used to derive that number.

### Section B — Per-term Enrollment
Column-header tooltips:
- **FT** — "Full-time credit threshold for THIS term. Half-time = FT ÷ 2."
- **Enrolled / Planned** — "Plan view: what you expect the student to take. Disbursement view: planned at original disbursement."
- **Disbursed?** — "Mark when funds have actually released. Disbursed terms are anchored — the engine cannot retroactively change them."
- **Actual** — "Credits the student is actually enrolled in at the disbursement point in time."
- **Paid Sub / Paid Unsub** — "Amount already disbursed. Locks this term's Final value (history anchoring)."
- **Refund S/U** — "Subsidized / Unsubsidized refunded back. Reduces the locked Net amount."
- **COA cap S/U** — "Per-term Cost of Attendance cap. Final values are clamped to this."
- Per-row "½ @ X" caption — "Below this credit count, the student is ineligible for any disbursement this term."

Toggle tooltips (these are the highest-priority ones the user called out):
- **View: Plan vs Disbursement** — "Plan = forward-looking projection. Disbursement = honors history; locks paid terms and redistributes the remaining annual pool to future eligible terms."
- **Step-3 distribution: Equal vs Proportional** — "Equal = annual pool ÷ remaining eligible terms. Proportional = weighted by each term's enrolled credits. Equal is the regulatory default."
- **Sub→Unsub shift** — "When the student's Sub need drops below the calculated Sub amount, shift the unused Sub allowance into Unsub (up to the Combined Limit). Off = excess Sub is forfeited."
- **Double-reduction** — "Apply both the AY% intensity reduction AND the per-term enrollment-intensity reduction. Off = single reduction only (most common interpretation)."
- **Count LTHT in AY%** — "Less-Than-Half-Time credits: include them in the Academic Year % numerator (lapsed credits carry forward to boost the next eligible term's intensity, e.g. 125%)."

### Results — Matrix / Cards / Step Walkthrough
Row-label tooltips on the matrix:
- **Term %** — "Enrolled ÷ FT for that single term."
- **Intensity %** — "(Enrolled + Lapsed credits from prior below-half-time terms) ÷ FT. Can exceed 100% (balloon payment). Capped to 100% in the actual COD export."
- **Share Sub / Share Unsub** — "This term's slice of the running annual pool, calculated AFTER subtracting locked/paid amounts from earlier terms."
- **Net Paid** — "Paid − Refunded for this term."
- **Final Sub / Final Unsub** — "MIN(Step 5 calculation, COA cap). Mirrors the engine output exactly — no averaging."
- **Paid badge** — "This term has historical activity and is anchored. The engine will not change it."

## Implementation approach

1. **New `InfoTip` primitive** (`src/components/sor/InfoTip.tsx`) — a small `(i)` icon button using existing `@/components/ui/tooltip` (Radix). Accessible, keyboard-focusable, `aria-label` on the trigger, content limited to ~2 short sentences. Touch fallback: tap toggles open.
2. **Extend `NumberField`** with an optional `tooltip?: string` prop that renders the InfoTip next to the label.
3. **Extend `Section`** with an optional `tooltip?: string` for section-level context.
4. **Add `TooltipProvider`** wrapper in `__root.tsx` so tooltips work app-wide with shared delay (300ms).
5. **Wrap toggles & radio labels** with InfoTip siblings (small grey `(i)` after the text label). For `Select` options that need explanation (calendar AC1-AC4), put the InfoTip next to the field label and describe each option in a single tooltip body.
6. **Matrix row labels** in `TermsMatrix.tsx` and `TermsCards.tsx` get InfoTips next to the row label cells.
7. **Pills** become hoverable — wrap each Pill in a Tooltip with the formula.

## UX & visual polish pass

- **Visual hierarchy**: Tighten the Section header — make the letter badge slightly smaller (h-8/w-8), bump section title to a clearer scale, add a thin divider under the header. Switch shadows to `shadow-sm` for a flatter, more Ellucian-clean look.
- **Toggle row in Section B**: Currently 5 toggles wrap awkwardly. Group them into a labelled "Calculation rules" sub-bar with a thin top border and a clearer "View" segment-control on the left. All toggles get InfoTips.
- **Pills**: Convert the cluster under Section A into a labelled "Computed baselines" mini-bar with a 1px top border so it reads as derived, not input.
- **Per-term grid**: Add zebra striping (`even:bg-muted/30`), make the header row sticky inside its scroll container, right-align all numeric inputs (already done), and bold the term name column.
- **Disbursed checkbox**: Replace with a small filled pill ("Paid" / "Pending") that's clickable — clearer state + matches the existing StatusChip language.
- **Results header**: Promote to a real tabbed component (Tabs primitive) with Table / Cards as tabs, instead of the custom button group. Add a small "?" InfoTip explaining the difference.
- **Sticky summary panel**: Add a subtle left border accent in primary color so it visually anchors as the "answer".
- **Footer**: Add a small "About the formulas" link that opens a Sheet with the full Debug Guide rules inline (uses existing `sheet.tsx`).
- **Brand alignment**: Ellucian's design language favors generous whitespace, restrained color, and primary blue used sparingly for actions/accents. I'll audit `--primary` usage and reduce decorative gradients on input cards (keep gradient only on the hero header badge).
- **Keyboard & a11y**: Every InfoTip trigger is a real `<button>` with `aria-label`; tooltip content uses `role="tooltip"`. Tab order verified.

## Files to create / edit

- **New**: `src/components/sor/InfoTip.tsx`
- **Edit**: `src/routes/__root.tsx` (add `TooltipProvider`)
- **Edit**: `src/routes/index.tsx` (wire tooltips on every field, toggle, option, pill; restructure toggle bar; convert Results view-switcher to Tabs)
- **Edit**: `src/components/sor/NumberField.tsx` (accept `tooltip` prop)
- **Edit**: `src/components/sor/Section.tsx` (accept `tooltip` prop, tighter header)
- **Edit**: `src/components/sor/TermsMatrix.tsx` (row-label InfoTips, sticky header, zebra rows)
- **Edit**: `src/components/sor/TermsCards.tsx` (card-field InfoTips)
- **Edit**: `src/components/sor/StepWalkthrough.tsx` (step-title InfoTips with the regulatory citation)
- **Edit**: `src/components/sor/ResultsPanel.tsx` (tooltips on the summary numbers + accent border)

## Out of scope (call out if you want them too)

- Changing any calculation logic in `src/lib/sor.ts` — tooltips only describe what the engine already does.
- Adding a guided onboarding tour / coach marks — let me know if you'd like that as a follow-up.
- Localization of tooltip strings.

