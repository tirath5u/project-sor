# V57 Independent Audit Reconciliation

Base commit: `2e629dd10d292caf6d8d13cf1cc748352b0ab8fc`

Branch: `codex/v57-audit-fixes`

Source: `C:/my-ai/pm - claude/projects/sor-calculator/deliverables/2026-10-05-sor-v57-independent-audit.md`

All five High and all nine Medium findings were independently reproduced before edits. None was disputed. The policy-dependent items remain open by Tirath's instruction. This branch has not been published.

| Finding | Reproduction on base | Disposition |
| --- | --- | --- |
| H1 | Excel subscription code 4, 6/6 credits: `B43=No`, Sub $3,500 and $1,750 in each term, `B95=RECONCILED` | Workbook now returns Review and no approved payout for unresolved calendars. No new calculation policy was inferred. |
| H2 | Paid Fall $1,750, Fall credits blank: 50% and Spring $0. Explicit Fall 6 credits: 75% and Spring $875. | Workbook now requires actual paid-term credits and returns Review while blank. Explicit zero remains distinct. |
| H3 | Single-term Spring 9 credits paid $1,313 in Spring, but `B96` incorrectly warned below half time from unselected Fall. | Workbook status and enrollment checks now use the selected-period mask. |
| H4 | Single-term 8.5/15 credits gave online Sub $997 versus Excel $998. | Shared half-up rounding helper and boundary tests; all three online surfaces now return $998. |
| H5 | UI and PDF displayed a second SOR multiplier even though the engine did not apply it. | Walkthrough and PDF allocation text now describe the actual calculation and payout. |
| M1 | Two-term residual placement differs between Excel and online. | Open policy choice. No residual rule changed. |
| M2 | Paid history inside or outside selected single term disagrees across surfaces. | Open policy choice. No second-disbursement or outside-period allocation behavior changed. |
| M3 | OpenAPI required-only request failed Zod validation. | OpenAPI now reflects required input fields and the needs-input response; conformance test added. |
| M4 | Public LTHT and double-reduction toggles could produce authoritative noncompliant results. | Removed UI controls and rejected unsafe values in schemas and direct engine calls. |
| M5 | Parent PLUS documented exceptional circumstances differ between Excel and online. | Open policy choice. No exceptional-circumstances calculation was added. |
| M6 | REST v1 returned 200 where v2 required missing facts. | v1 now shares the v2 missing-fact gate while retaining its numeric response contract. |
| M7 | MCP calculated without asking for program calendar. | Calendar category is now required; absent calendar returns a specific question. |
| M8 | MCP advanced student estimate labeled a single-term loan amount annual. | Single-term output uses loan-period names and an explicit amount scope. |
| M9 | Disbursement-mode effective payout method used planned rather than actual paid-term credits. | Method selection now reads paid actual credits; regression covers planned 12/12/12 with paid Fall actual 6. |

Verification: the workbook is at `C:/my-ai/PM - Codex/09-projects/financial-aid-core/work/outputs/tc-SOR-calculator-2026-27-v57-audit-fixed.xlsx`. Workbook scenario, structure, shared parity, and 648-case noninterference gates pass. The branch has 199 passing Vitest tests, a clean TypeScript check, a successful build, and a local development-server REST v1/v2/MCP replay with matching ordered payout vectors and source fingerprints. The compiled build was not served independently, and production has not been republished or verified.

Release holds: M1, M2, M5, DQ7/non-SE9W treatment, and the institution-defined half-time question still require Tirath's decisions. The new workbook review gate prevents unresolved calendar categories from appearing authoritative; it does not resolve their policy.
