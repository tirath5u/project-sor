# Reconciliation review verification, 2026-09-13

Not published. Lovable Cloud provisioned successfully through the enable control with existing project access. No purchase, upgrade or auto top-up action was taken. Calculator logic and access gates were not edited. Cloud usage still consumes the applicable allowance.

## Implemented
- Shrinkable mobile grid tracks, min-width containment and wrapped evidence. At 390x844 and 1280x1800, document scroll width equalled viewport width. Expanded missing-record passages checked visually. Tables scroll inside their panel.
- Applicability predicates run before scoring: FP-104 requires every record to match, FP-101 requires a paired nonzero difference under 100000 cents, FP-103 requires equal amounts and differing statuses. Mixed matched/missing fixtures retrieve only FP-102.
- Unmatched absolute amount displayed separately: missing fixture has $0 paired difference and $225 unconfirmed unmatched amount.
- Corrections rejected by schema and forbidden by gate and prompt. Investigation action is exact cited passage text selected by code, not a generated correction. Conflict/no-source paths remain rule-based without model calls.
- Private shared reservation table and transaction-scoped advisory lock. Database clock establishes UTC day; 200/day, rolling 10/hour per HMAC visitor, minimum 20 seconds. No refunds after failed or ambiguous AI calls. Retention cleanup occurs on accepted reservations, with no scheduled job.
- Database RPC restricted to service role. No public table access. Storage errors, invalid reservation results or missing trusted visitor address fail closed. Five-second storage deadline; model deadline continues through body reading. No retries.

## Exact implementation files
- src/routes/reconciliation.tsx
- src/routes/api/public/lab/explain.ts
- src/lib/lab/{compare,fixtures,retrieval,ai-contract,throttle}.ts
- src/lib/lab/{explain,quota}.server.ts
- src/lib/lab/{review,quota}.test.ts
- supabase/migrations/20260913023527_f3f0d3af-775e-48dc-8e7c-a4498ee2790c.sql
- supabase/migrations/20260913023619_c486c866-693b-439f-ac69-badaf932a673.sql
- Cloud-generated integration files and dependency configuration were added by provisioning.

## Actual evidence
- 160 tests across 12 files passed. Includes six scenario expectations, mixed missing in both directions, eligibility thresholds, correction rejection, missing identity, storage outage and malformed storage response.
- Twelve concurrent independent HTTP clients to the real shared reservation RPC: exactly one accepted, eleven throttled. Public direct RPC request returned 401. Database linter clean.
- PostgreSQL UTC day-boundary expression tested at 23:59:59 and 00:00:00: passed. A full midnight reservation transition and exhausted global-cap load test have NOT been run against live storage.
- Real local normal-case endpoint call with synthetic edge visitor address succeeded: google/gemini-3.8-flash, prompt lab-prompt-1.2.0, 5902 ms, 534 prompt tokens, 755 completion tokens, 1289 total. One durable reservation. Source FP-101. This was a real paid-from-allowance model call, not a cache.
- Conflict/no-source endpoint calls returned rule_based with no model and no usage.
- Preview build log reported build OK after implementation.

## Observed limitations
The successful model summary correctly described the $200 discrepancy, but its uncertainty text incorrectly said no discrepancies were identified. Citation membership and JSON validation do not establish semantic correctness. The source-supported action is deliberately deterministic; generated summary/observations/uncertainty remain fallible teaching evidence, not authoritative findings.

Visitor identity uses the edge-overwritten CF-Connecting-IP header and a server-key HMAC, with no raw address stored. Published-edge overwrite behavior still needs deployment verification. Local verification supplied a synthetic address; absence of that header fails closed. Shared networks share limits, address changes can evade visitor limits, but not the atomic global cap. Key rotation changes visitor hashes. No successful published-site verification is claimed.

Preview: https://id-preview--4674989c-8fdf-4671-9e2b-86cb5a97ae9a.lovable.app/reconciliation
