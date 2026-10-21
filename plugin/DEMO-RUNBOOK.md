# Project SOR ChatGPT review demo

Status: the final eight-case recording is `D:/Downloads/Schedule-of-Reductions-SOR-plugin-demo-8-cases-final.mp4` (7:27.69, SHA-256 `56CA46AF37ACB0BCBA4C520029444DB0D689456171AF975D232645794E5F8028`). It joins the polished six-case draft with the October 22 COD and proration negative cases, crops the Teams border, and omits setup and idle footage. The reviewer URL is `https://raw.githubusercontent.com/tirath5u/project-sor/main/public/review/sor-plugin-demo-8-cases.mp4`; confirm that it returns the same SHA-256 after the GitHub push.

Use the intended publisher ChatGPT account, connected to the production Schedule of Reductions (SOR) MCP at `https://sor.myproduct.life/mcp`. Confirm account ownership before testing. Record the ChatGPT window with the tool invocation and visible answer. Use only fictional public fixtures and hypothetical facts; never enter a student's identity or loan record. Confirm the endpoint still reports the release and tool versions in `RELEASE-CHECKLIST.md`.

Run the exact eight prompts in `REVIEW-CASES.md` in fresh conversations. Keep a short receipt for each: date, prompt, selected tool names, tool status, material numbers, and whether the visible answer matched. The first five should use the named SOR tools. The last three are negative routing tests and should not invoke Schedule of Reductions (SOR) at all.

For the recording, show the plugin or custom MCP connection, then demonstrate all five positive cases in order:

1. `list_scenarios`: fixture-v19-003 and its source reference IDs.
2. `calculate_sor`: fixture-dept-full-time-baseline, 100% SOR, annual $3,500 Subsidized and $2,000 Unsubsidized, with equal term payouts.
3. `compare_sor`: fixture-v19-002 versus fixture-v19-003, including the -$160 and -$280 annual differences.
4. `advanced_student_estimate`: fixture-v19-003, gross annual total $5,060 and the no-award disclaimer.
5. `check_loan_limit_exception`: self-reported continuity facts ending in `school_confirmation_needed`, never an eligibility approval.

Then show the three negative prompts: Pell-only eligibility, COD record-access capability, and traditional 34 CFR 685.203 remaining-period proration inputs. Confirm that none invokes Schedule of Reductions (SOR). If ChatGPT routes any prompt differently or gives misleading regulated guidance, stop, correct the case or tool metadata, and retest before recording a final walkthrough. The COD and proration prompts must match `REVIEW-CASES.md` exactly.

Host the final recording at a reviewer-accessible HTTPS URL. Put that URL in `extensions.com.openai.review.demo_recording_url` in `plugin.json`, rebuild the ZIP, and upload it to the draft. The portal shows review information as ZIP-managed. Do not submit a URL for an unrecorded or inaccessible video. The recording and portal cases must reflect the same deployed MCP behavior; a direct MCP replay alone is not a ChatGPT routing test.
