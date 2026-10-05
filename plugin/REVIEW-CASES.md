# Draft plugin review cases

These are candidate reviewer prompts, not production test receipts. Replay them against the exact deployed MCP version before adding them to `plugin.json` or submitting.

## Five positive cases

1. **Published source example:** "Show a published Project SOR scenario, its source, and the inputs needed to replay it." Expected tool: `list_scenarios`. Expected behavior: returns a public fixture and source reference without claiming Department endorsement.
2. **Complete three-term calculation:** "Use Project SOR for a dependent first-year undergraduate in Award Year 2026-27, three standard terms, 12 full-time and 12 enrolled credits in each term, 36 full-time AY credits, $10,000 need and COA, no other aid, no exception, and Equal distribution. Show gross annual and term amounts." Expected tool: `calculate_sor`. Expected behavior: calculation uses 100 percent SOR; gross amounts and version are returned with a reminder that final aggregate and packaging checks remain with the school.
3. **Spring-only one-term loan:** "Calculate a one-term loan for Term 2 in a two-term standard academic year. The borrower is a dependent first-year undergraduate in 2026-27, taking 9 of 12 full-time credits in Term 2. Full-time AY credits are 24; need and COA are $10,000; other aid is zero. No prior paid history." Expected tool: `calculate_sor`. Expected behavior: the selected loan period stays Term 2, SOR is 75 percent, and the tested Subsidized result is $1,313.
4. **Two supported scenarios:** "Compare two complete Project SOR standard-term scenarios that differ only in enrolled credits, and identify the annual and term-level differences." Expected tool: `compare_sor`. Expected behavior: computes both sides only when each has complete inputs and no held branch; identifies differences without treating them as an award decision.
5. **Loan Limit Exception triage:** "I think I qualify for the 2026-27 Loan Limit Exception. What school or COD facts need verification before I rely on it?" Expected tool: `check_loan_limit_exception`. Expected behavior: asks for or evaluates the specified facts, never asserts eligibility from self-report alone, and directs the user to school/COD confirmation.

## Three negative cases

1. **Missing facts:** "How much Direct Loan can I get?" Expected tool: `calculate_sor` or `advanced_student_estimate`. Expected behavior: asks for specific missing facts; no demo defaults or dollar estimate.
2. **Unresolved residual placement:** "Split a fresh $2,905 reduced annual Subsidized amount equally across two payable terms and tell me exactly which term gets the extra dollar." Expected tool: `calculate_sor`. Expected behavior: `review_required`, no numeric term payout, with the residual-placement reason.
3. **Unsupported calendar:** "Calculate SOR for my subscription program and tell me exactly what to award." Expected tool: `calculate_sor`. Expected behavior: `blocked` or `needs_input`, no numeric award, with a school-review explanation.

Submission requires exactly five positive and three negative cases. Each must be tested through ChatGPT and the live MCP endpoint after publication of the reviewed build. Replace any prompt whose observed tool call or result differs from the expected behavior.
