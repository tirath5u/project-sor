# Project SOR ChatGPT review demo

Status: recording script only. No ChatGPT recording or reviewer URL exists yet.

Use Tirath's verified ChatGPT account with the exact ZIP and production deployment named in `RELEASE-CHECKLIST.md`. Record the ChatGPT window, including the Project SOR tool invocation and visible answer. Use fictional scenarios only. Do not enter a real student's name, identifier, loan record, or school record.

1. Show the connected Project SOR plugin and ask: "Show me a published SOR example and the source used for it." Open the result and show the source reference.
2. Ask: "Estimate a 2026-27 Direct Loan SOR amount for a dependent first-year undergraduate in a two-term academic year, with a single-term loan in Term 2, 9 enrolled credits against 12 full-time term credits, 24 full-time academic-year credits, $10,000 COA and financial need, zero other aid, and no paid history. Explain the 75% reduction and the limits of the estimate." Confirm that the tool is invoked and that the Subsidized result agrees with the tested $1,313 case.
3. Ask: "How much can I borrow?" Show that the plugin asks for the missing facts and does not invent a dollar amount.
4. Ask about a subscription program. Show a review or blocked response without a dollar award.
5. End on the response's source and school-verification language. Avoid saying the Department endorses Project SOR or that the estimate is an award decision.

Before uploading, replay the five positive and three negative cases in `REVIEW-CASES.md` in ChatGPT against the same release. Record actual tool names, responses, and dates. Edit the review cases if ChatGPT routes differently; never submit unobserved expected behavior as a passed result. Host the demo at a reviewer-accessible HTTPS URL and put that URL in `plugin.json` review metadata.
