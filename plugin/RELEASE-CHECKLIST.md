# Project SOR plugin release checklist

Status: package built and live MCP verified on October 6, 2026. The plugin is not submitted, approved, or published in ChatGPT.

Tirath confirmed on October 6, 2026 that he is authorized to publish the code, visuals, and insight content independently of his employment. The COD case study remains historical and is not part of the plugin listing. This confirmation does not establish third-party rights for any material added later.

## Supported first-release scope

- Source-backed SOR estimates for complete standard-term and supported substantially equal nonstandard-term scenarios.
- Follow-up questions when required facts are missing.
- Explicit review response with no dollar result for a held policy branch or an unmodeled requested cap.
- Loan Limit Exception self-reporting remains triage, not a school or COD eligibility determination.

## Review-only or excluded scenarios

- Two payable terms with an unresolved odd-dollar residual allocation and no paid history.
- Single-term requests that include paid history or a later disbursement question.
- Parent PLUS documented exceptional circumstances or other unverified basis.
- Nonstandard calendars whose SOR treatment remains unresolved, and subscription programs pending review.
- Nonterm credit-hour and clock-hour programs, where this SOR tool does not apply.
- Traditional remaining-period proration, overlapping-loan eligibility, remaining aggregate or lifetime room, and any caller-provided cap not applied by the engine.
- Student-reported Loan Limit Exception facts that need school and COD verification.

## Before public submission

1. Publication rights for the current code, visuals, and insight content were confirmed by the publisher. Recheck rights for any new third-party material before adding it. Keep the historical COD case study outside the plugin listing.
2. MCP request bodies are not intentionally stored by application code. Accessible Lovable server-log samples showed request metadata and tool-event metadata, not bodies or arguments. The log-view ranges are not deletion commitments. Obtain provider-confirmed retention/deletion timelines for Lovable, Cloudflare, and the separate lab AI Gateway, and update the privacy page before public submission. OpenAI's plugin guidelines require retention timelines in the privacy policy. Do not substitute a log-view range for a deletion period.
3. The support, privacy, and terms pages are live at their HTTPS URLs and reachable without the staff password. The privacy page now distinguishes calculator/MCP traffic from the separate lab AI Gateway. The Gateway exposes a 180-day query window for stored fictional lab fixture content, but its deletion period remains unconfirmed.
4. The package uses a new Project SOR SVG mark in `assets/`; inspect its appearance in the plugin portal before submission.
5. Run five positive and three negative review cases against the exact production deployment, including `needs_input`, `review_required`, and supported numeric cases. Save request and response receipts without real student data. Confirm health reports engine 1.4.1 and MCP 0.8.2 before using the receipts for review.
6. Verify live MCP `tools/list` annotations, schemas, and tool descriptions; compare the deployment marker with the reviewed source build.
7. Record the ChatGPT walkthrough using `plugin/DEMO-RUNBOOK.md`, host it at a reviewer-accessible HTTPS URL, and add that URL to the review metadata. A direct MCP replay is not a substitute for a ChatGPT test.
8. Verify domain control using the exact token and path supplied by the OpenAI portal. On October 7, 2026, OpenAI Platform showed the individual identity approved and the upload dialog selected `TIRATH ATUL CHHATRIWALA`. The ZIP has not been uploaded: automated file selection in Edge was blocked by the extension's file-URL permission. Tirath can select the ZIP manually in the open upload dialog without changing that permission. Confirm the intended ChatGPT testing account separately. Approval is separate from publication.

## Current artifact and evidence

- Local package: `dist/project-sor-plugin-0.1.0.zip` (ignored build output). SHA-256: `41D9B06829EFFF30AF5C961D9668DB51AA0883131259B59DB0CAC3E5DD266C62`.
- Production deployment verifier passed October 6, 2026 at release `sor-v57-1.4.1-mcp-0.8.2-2026-10-05`, fingerprint `4f811e2e18a7b3185272d807a79e711c69b95ec988898b38e114b1f20456f3ca`. It checked five public tools, annotations, numerical parity, and held responses.
- `plugin/REVIEW-CASES.md` contains draft cases, not completed ChatGPT receipts.

Publisher draft: Tirath Chhatriwala, tirath@outlook.com. Project SOR is independent and does not claim Department, Anthology, or Ellucian endorsement.
