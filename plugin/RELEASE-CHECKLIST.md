# Project SOR plugin release checklist

Status: source-ready draft. The package is not submitted, approved, or published.

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
2. Verify where MCP requests and provider logs are retained. Remove or update any unsupported no-retention claim. Minimize response identifiers and raw input echoes.
3. The support, privacy, and terms pages are implemented in the site source. Publish them, verify all three HTTPS pages are reachable without the staff password, then verify the hosting account's actual logging retention and update the privacy page before submission.
4. The package uses a new Project SOR SVG mark in `assets/`; inspect its appearance in the plugin portal before submission.
5. Run five positive and three negative review cases against the exact production deployment, including `needs_input`, `review_required`, and supported numeric cases. Save request and response receipts without real student data. Do not use the October 6 production build for this gate: its health endpoint reports engine 1.4.0 and MCP 0.8.0, not the reviewed 1.4.1 and 0.8.2.
6. Verify live MCP `tools/list` annotations, schemas, and tool descriptions; compare the deployment marker with the reviewed source build.
7. Prepare a reviewer-accessible demo recording, verify domain control and developer identity in the OpenAI portal, then submit for review. Approval is separate from publication.

Publisher draft: Tirath Chhatriwala, tirath@outlook.com. Project SOR is independent and does not claim Department, Anthology, or Ellucian endorsement.
