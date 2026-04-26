# Public Source Register

Every fixture in `src/lib/sor.fixtures.ts` carries a `sourceRefs: string[]`
pointing to entries in this register. **Fixtures may only cite IDs listed
here** - no internal documents, spreadsheet paths, or private URLs.

| ID        | Citation                                                      | Status                          |
|-----------|---------------------------------------------------------------|---------------------------------|
| `psr-001` | **34 CFR 685.203** - Annual loan-limit schedule (Direct Loan). | stable                          |
| `psr-002` | **34 CFR 685.203(a)(2)** - Dependent undergraduate base limits. | stable                          |
| `psr-003` | **34 CFR 685.203(c)** - Independent undergraduate / additional unsub. | stable                          |
| `psr-004` | **2025-26 COD Technical Reference** - disbursement & proration framework. | stable                          |
| `psr-005` | **2026-27 COD Technical Reference** - preliminary OBBBA guidance. | pending-federal-guidance        |
| `psr-006` | **34 CFR 685.203(d)** - Graduate / professional limits.        | stable                          |
| `psr-007` | **OBBBA** - One Big Beautiful Bill Act, loan-limit provisions. | pending-federal-guidance        |

## How to add a new entry

1. Add a new row above with a stable `psr-NNN` ID.
2. Cite the **public, durable** source - federal regulation, FSA technical
   reference, or published bill text. No SharePoint links, no client docs,
   no internal wikis.
3. Mark `status` as one of:
   - `stable` - final regulation or finalized guidance.
   - `pending-federal-guidance` - preliminary; subject to ED rulemaking.
   - `superseded` - replaced by a newer entry; keep for historical fixtures.
4. Reference the new ID from any fixture's `sourceRefs` array.

## Status semantics on the API

The `/api/public/v1/calculate` endpoint surfaces the resolved policy status
via `meta.policyStatus`:

- `confirmed` - all relevant register entries are `stable`.
- `supported-preliminary` - at least one entry is
  `pending-federal-guidance`. The result is the engine's best current
  interpretation, not authoritative.

This lets API consumers gate UI ("Preliminary - pending federal guidance")
without having to track regulatory status themselves.