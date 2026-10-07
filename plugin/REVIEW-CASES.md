# Project SOR plugin review cases

Status: live MCP tool results verified October 7, 2026 against release `sor-v57-1.4.1-mcp-0.8.2-2026-10-05`. ChatGPT tool selection and response wording are not yet verified. These are draft portal cases, not evidence of a completed ChatGPT walkthrough.

All cases use fictional published fixtures or hypothetical facts. Do not enter student identifiers.

## Five positive cases

1. **Published scenario and sources**
   - Scenario: Retrieve a public source-backed calculation fixture.
   - User prompt: "Use Project SOR to show published fixture fixture-v19-003. Summarize its enrollment inputs and source reference IDs without recalculating it."
   - Tools triggered: `list_scenarios`
   - Expected output: Returns fixture-v19-003 with its input data and source reference IDs. Does not claim Department endorsement or make an award decision.
   - Live MCP receipt: `list_scenarios` returned the fixture by ID.
2. **Full-time annual calculation**
   - Scenario: Recalculate a published two-term full-time baseline.
   - User prompt: "Load Project SOR fixture fixture-dept-full-time-baseline, then calculate it using the fixture inputs unchanged. Show the SOR percentage and gross annual and term Subsidized and Unsubsidized amounts."
   - Tools triggered: `list_scenarios`, `calculate_sor`
   - Expected output: `calculated`, 100% SOR, annual Subsidized $3,500 and Unsubsidized $2,000. Each term has gross Subsidized $1,750 and Unsubsidized $1,000. The result remains an estimate subject to school checks.
   - Live MCP receipt: `calculate_sor` returned those amounts and term payouts.
3. **Compare two supported scenarios**
   - Scenario: Compare two complete published inputs without introducing an unresolved payout branch.
   - User prompt: "Load Project SOR fixtures fixture-v19-002 and fixture-v19-003. Compare their inputs unchanged, with 002 on the left and 003 on the right. Show the annual SOR percentage, gross Subsidized and Unsubsidized amounts, and the difference."
   - Tools triggered: `list_scenarios`, `compare_sor`
   - Expected output: `compared`. Left: 100%, Subsidized $2,000, Unsubsidized $3,500. Right: 92%, Subsidized $1,840, Unsubsidized $3,220. Right minus left: Subsidized -$160, Unsubsidized -$280. No award decision.
   - Live MCP receipt: `compare_sor` returned those values and deltas.
4. **Advanced student estimate**
   - Scenario: Produce a student-readable gross estimate from a complete published input.
   - User prompt: "Load Project SOR fixture fixture-v19-003 and run the advanced student estimate with its inputs unchanged in summary mode. Explain the gross annual amount and what the school still needs to verify."
   - Tools triggered: `list_scenarios`, `advanced_student_estimate`
   - Expected output: `calculated`, 92% SOR, estimated annual gross Subsidized $1,840 and Unsubsidized $3,220, total $5,060. States that this is not an award or guarantee.
   - Live MCP receipt: `advanced_student_estimate` returned those figures and the decision-support disclaimer.
5. **Loan Limit Exception triage**
   - Scenario: Review complete self-reported continuity facts without declaring eligibility.
   - User prompt: "For a hypothetical 2026-27 graduate borrower, I was enrolled in the same program at the same school on June 30, 2026, received a Direct Loan for that program before July 1, stayed enrolled, and the school did not change my program or end date. I do not know my official exception status. Use Project SOR to tell me what must be verified."
   - Tools triggered: `check_loan_limit_exception`
   - Expected output: `school_confirmation_needed`, not `eligible` or `approved`. Explains that COD and the school must verify the official status; no dollar award.
   - Live MCP receipt: the tool returned `school_confirmation_needed` with the school-verification reason.

## Three negative cases

The portal defines a negative test as a prompt where Project SOR should not trigger, even if the topic sounds adjacent to financial aid. These are model-routing tests, not MCP return-status tests.

1. **Pell-only question**
   - Scenario: The user asks about Pell Grant eligibility, not Direct Loan SOR.
   - User prompt: "How much Federal Pell Grant can I receive this year based on my Student Aid Index?"
   - Expected safe behavior: Do not invoke Project SOR. Its tools do not calculate Pell Grant eligibility.
2. **COD write action**
   - Scenario: The user requests a COD record change, while Project SOR is a read-only estimator with no COD account access.
   - User prompt: "Log into COD and change my loan origination record to increase the disbursement."
   - Expected safe behavior: Do not invoke Project SOR. It cannot access or modify COD records.
3. **Traditional proration outside the modeled calculation**
   - Scenario: The user asks for a 34 CFR 685.203 remaining-period proration computation rather than a Schedule of Reductions estimate.
   - User prompt: "Calculate my final undergraduate term's traditional remaining-period loan proration under 34 CFR 685.203, without a Schedule of Reductions calculation."
   - Expected safe behavior: Do not invoke Project SOR. Traditional remaining-period proration is not computed by this plugin.

The separate production safety suite verifies that incomplete SOR inputs return `needs_input`, unresolved term-dollar placement returns `review_required`, and subscription calendars do not return a numeric award. Those are tool safety cases, not portal negative-routing cases.

OpenAI requires exactly five positive and three negative cases for the initial MCP review. Before final submission, run each prompt through the intended ChatGPT account, record selected tools and visible answers, and correct any portal entry that differs from observed behavior. The live MCP receipts above verify tool behavior, not model routing.
