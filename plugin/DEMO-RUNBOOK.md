# Project SOR ChatGPT review demo

Status: recording plan only. No ChatGPT routing receipts, recording, or reviewer URL exists yet.

Use the intended publisher ChatGPT account, connected to the production Project SOR MCP at `https://sor.myproduct.life/mcp`. Confirm account ownership before testing. Record the ChatGPT window with the tool invocation and visible answer. Use only fictional public fixtures and hypothetical facts; never enter a student's identity or loan record. Confirm the endpoint still reports the release and tool versions in `RELEASE-CHECKLIST.md`.

Run the exact eight prompts in `REVIEW-CASES.md` in fresh conversations. Keep a short receipt for each: date, prompt, selected tool names, tool status, material numbers, and whether the visible answer matched. The first five should use the named Project SOR tools. The last three are negative routing tests and should not invoke Project SOR at all.

For the recording, show the plugin or custom MCP connection, then demonstrate all five positive cases in order:

1. `list_scenarios`: fixture-v19-003 and its source reference IDs.
2. `calculate_sor`: fixture-dept-full-time-baseline, 100% SOR, annual $3,500 Subsidized and $2,000 Unsubsidized, with equal term payouts.
3. `compare_sor`: fixture-v19-002 versus fixture-v19-003, including the -$160 and -$280 annual differences.
4. `advanced_student_estimate`: fixture-v19-003, gross annual total $5,060 and the no-award disclaimer.
5. `check_loan_limit_exception`: self-reported continuity facts ending in `school_confirmation_needed`, never an eligibility approval.

Then show the three negative prompts: Pell-only eligibility, a request to edit a COD record, and traditional 34 CFR 685.203 remaining-period proration. Confirm that none invokes Project SOR. If ChatGPT routes any prompt differently, stop, correct the case or tool metadata, and retest before recording a final walkthrough.

Host the final recording at a reviewer-accessible HTTPS URL. Enter that URL in the portal's Review information form. Do not submit a URL for an unrecorded or inaccessible video. The recording and portal cases must reflect the same deployed MCP behavior; a direct MCP replay alone is not a ChatGPT routing test.
