# Reconciliation safety verification, 2026-09-13

Not published. No services enabled, purchases made, or calculator access changed.

## Dependency and current boundary
The backend diagnostic returned: this project has no Lovable Cloud backend for the requested environment. No database integration or Worker storage binding is present. Existing AI credits are not durable storage.

Instance-memory lab counters have been removed. All normal-case model requests fail closed with HTTP 503 and quota_storage_unavailable. Comparison and retrieval remain usable. Conflict and no-source cases return explicitly rule-based escalation, no correction, no model call, and no token usage.

## Verification
- 154 automated tests passed across 10 files, including 36 lab tests.
- Body-stall timeout tested after response headers; no retry.
- Provider error details withheld for 400, 401, 402, 403, 429, 500.
- Empty citations rejected when retrieved passages exist.
- 250 concurrent requests to the closed reservation boundary all denied.
- Live preview: normal case denied, conflict and no-source cases returned rule-based results. Browser verified comparison and explanation states.

## Actual limitations and unfinished work
No shared atomic reservation implementation is active. Multiple-instance reservation correctness and UTC day rollover cannot be verified without a real shared store. Concurrent denial tests are not evidence of database atomicity.

Next dependency: owner-approved connection of durable storage, without changing calculator access. Then implement a database transaction that atomically checks and reserves both the global UTC-day allowance (200) and visitor limits (20 seconds, 10/hour), using database time and a trusted caller identifier. Keep consumed reservations on failed/ambiguous model calls. Storage errors must deny calls, never fall back to memory. Verify concurrency from independent clients, rollover, and failure behavior against that database.

A real successful normal-case explanation was deliberately not requested because it would bypass the missing quota boundary. The configured model remains google/gemini-3.8-flash, but no model success is claimed for this change. Citation validation checks source membership, not semantic support. Visitor limits will not be identity guarantees (shared networks and proxy changes matter).
