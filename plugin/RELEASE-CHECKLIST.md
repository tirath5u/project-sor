# Project SOR plugin release checklist

Status: version 0.1.1 uploaded as the active draft on October 7, 2026. Five positive cases, three negative routing cases, and release notes survived the upload. OpenAI now shows `Education & Research` with no category finding. The MCP domain is verified and all five tools are discovered with no scan issues. The plugin is not submitted, approved, or published in ChatGPT.

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
5. Five positive tool cases were replayed against the exact production deployment on October 7, 2026, and their expected results were saved as draft review information. Three negative cases in the portal test when the plugin should not be invoked at all. ChatGPT model routing and visible wording are not yet verified. Separately, the live safety verifier checked `needs_input`, `review_required`, and blocked calendar behavior. Confirm health still reports engine 1.4.1 and MCP 0.8.2 before final review.
6. Verify live MCP `tools/list` annotations, schemas, and tool descriptions; compare the deployment marker with the reviewed source build.
7. Record the ChatGPT walkthrough using `plugin/DEMO-RUNBOOK.md`, host it at a reviewer-accessible HTTPS URL, and add that URL to the review metadata. A direct MCP replay is not a substitute for a ChatGPT test.
8. Domain control is verified. `/.well-known/openai-apps-challenge` serves the portal token as plain text, and OpenAI Platform shows `Domain verified`. The portal discovered `calculate_sor`, `list_scenarios`, `compare_sor`, `advanced_student_estimate`, and `check_loan_limit_exception` with no MCP scan issues. The tools remain `Not live` until review and publication. Confirm the intended ChatGPT testing account separately. Identity approval and draft upload are not publication.
9. The 0.1.1 upload cleared the category warning. The privacy-policy assessment remains inconclusive while provider retention timelines are unconfirmed. The portal's remaining incomplete review field is the video walkthrough URL. Add a real demo URL and verify ChatGPT case routing with the intended publisher account before submission; do not treat direct MCP calls as a completed ChatGPT walkthrough.

## Current artifact and evidence

- Local package: `dist/project-sor-plugin-0.1.0.zip` (ignored build output). SHA-256: `41D9B06829EFFF30AF5C961D9668DB51AA0883131259B59DB0CAC3E5DD266C62`.
- Active metadata package: `dist/project-sor-plugin-0.1.1.zip` (ignored build output). SHA-256: `CFB18715ABA07026B5F5EE86C5E3967D022B9D24DC735806093BC949258BB2E6`.
- Production deployment verifier passed October 7, 2026 at release `sor-v57-1.4.1-mcp-0.8.2-2026-10-05`, fingerprint `4ce52b3b136d8502b02bea6c187db82d927248fd43d086fcb148b2ddf3c04e93`. It checked five public tools, annotations, numerical parity, and held responses.
- OpenAI Platform draft: `https://platform.openai.com/plugins/manage/plugin_asdk_app_6ac5658b32908191b846907bb1ef577d`. Review status: `Not submitted`; publication: `Not published`.
- `plugin/REVIEW-CASES.md` records five production-replayed positive tool cases and three negative routing prompts. The portal has saved those cases and release notes, but the demo URL is still blank.

Publisher draft: Tirath Chhatriwala, tirath@outlook.com. Project SOR is independent and does not claim Department, Anthology, or Ellucian endorsement.
