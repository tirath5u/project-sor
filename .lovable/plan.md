# V20 — Public SOR Calculation API (Final Comprehensive Plan)

## Goal

Expose the V19 SOR engine as a free, public, portfolio-grade HTTP API on `sor.myproduct.life` with full provenance, spreadsheet parity testing, an open challenge workflow, and a transparent build narrative. Push the repo to GitHub so practitioners, vendors, and reviewers can inspect, use, and challenge the math.

## Award-Year Support Matrix

- **2025-26**: Supported (stable — anchored to 34 CFR 685.203).
- **2026-27**: Supported as `POLICY_YEAR` default, with OBBBA-affected items flagged `pending-federal-guidance` until ED rulemaking finalizes.
- **OBBBA behavior**: Preliminary; surfaced via `meta.policyStatus` per scenario, never silently applied.

## Stage 1 — Contract & Parity (no API surface yet)

**New files**

- `src/lib/sor.version.ts` — exports `ENGINE_VERSION` (semver, code-driven), `POLICY_YEAR` (`"2026-27"`), `POLICY_SNAPSHOT_DATE`, `SOURCE_COMMIT` (from `VITE_COMMIT_SHA` with `"local-dev"` fallback).
- `src/lib/sor.schema.ts` — Zod schemas for `CalculateInput` / `CalculateOutput`. Implements `strictNumber` helper that rejects empty strings, `null`, and whitespace for required numeric fields (no silent `0` coercion).
- `src/lib/sor.fixtures.ts` — **single source of truth** for canonical scenarios. Each fixture: `id`, `description`, `input`, `expectedOutput`, `sourceRefs: ["psr-001", ...]` (public-source-register IDs only — no internal spreadsheet paths).
- `src/lib/sor.parity.test.ts` — Vitest suite running every fixture through `runSOR()` and asserting field-level equality with expected outputs.

**Acceptance**: `bun test` passes all parity fixtures; schemas reject malformed inputs; `ENGINE_VERSION` and `POLICY_YEAR` are decoupled.

## Stage 2 — Public API Surface

**New files** (TanStack Start file-route handlers under `/api/public/v1/`)

- `src/routes/api/public/v1/calculate.ts` — `POST` runs validated input through engine; returns `{ data, meta }`. `meta.citations` populated **only** when engine maps scenario to specific rule tags; otherwise `meta.sourceSet: ["direct-loan-sor-v1"]`.
- `src/routes/api/public/v1/scenarios.ts` — `GET` serializes `sor.fixtures.ts` to JSON dynamically (no duplicate file).
- `src/routes/api/public/v1/health.ts` — `GET` returns `{ status, engineVersion, policyYear, sourceCommit }`.
- `src/routes/api/public/v1/openapi.json.ts` — `GET` serves OpenAPI 3.1 spec generated from Zod schemas.
- `src/lib/api-errors.ts` — uniform `{ error: { code, message, details? } }` envelope.
- `src/lib/rate-limit.ts` — token-bucket using daily-salted-hash of IP (raw IP never logged or persisted).

**CORS / OPTIONS**: `OPTIONS` returns **204** with `Access-Control-Allow-Headers` including `Content-Type, Accept`. `Accept` is validated on `POST`.

**Acceptance**: `curl` calculate/scenarios/health/openapi all green; rate limiting works; no raw IP in logs.

## Stage 3 — Public Evidence & Docs

**New files**

- `docs/methodology.md` — calculation walkthrough with regulatory citations (34 CFR 685.203, OBBBA status notes).
- `docs/process.md` — **Process Narrative**: how the engine was derived, LLM-assisted critique loop, and governance note ("LLMs helped derive, critique, and implement; source documents, fixtures, and parity tests are the authority").
- `docs/rounding-policy.md` — explicit half-up vs banker's rounding rules per field.
- `docs/public-source-register.md` — `psr-001` → 34 CFR 685.203(a)(2), `psr-002` → 2026-27 COD Tech Ref, etc. All fixture `sourceRefs` resolve here.
- `LICENSE` (MIT), `CONTRIBUTING.md` (challenge workflow), `.github/ISSUE_TEMPLATE/scenario-challenge.yml`.

**Audience phrasing**: "higher-ed practitioners, vendor teams, and reviewers can inspect, use, and challenge" — no implied ED endorsement.

## Stage 4 — CI & Safety

- `.github/workflows/ci.yml` — runs `bun test` (parity + unit), typecheck, build; injects `VITE_COMMIT_SHA=${{ github.sha }}`.
- **Public-safety pre-launch checklist**: scrub repo for internal spreadsheet paths, client names, raw IPs in logs, private URLs in fixtures.
- **Versioning policy** (in `CONTRIBUTING.md`): additive fields → v1.1; changed input/output meaning → v2.0. Disbursement-mode is v2 because it changes output shape.

## Out of Scope (this plan)

- Disbursement-mode calculations (v2.0).
- Authenticated/quota endpoints.
- Non-Direct-Loan programs (Pell, TEACH, Plus parent/grad nuances beyond current engine).

## Files Touched

**New**: `src/lib/sor.{version,schema,fixtures,parity.test}.ts`, `src/lib/{api-errors,rate-limit}.ts`, `src/routes/api/public/v1/{calculate,scenarios,health,openapi.json}.ts`, `docs/{methodology,process,rounding-policy,public-source-register}.md`, `LICENSE`, `CONTRIBUTING.md`, `.github/workflows/ci.yml`, `.github/ISSUE_TEMPLATE/scenario-challenge.yml`.
**Modified**: none in `src/lib/sor.ts` (engine is frozen for parity); `vite.config.ts` only if `VITE_COMMIT_SHA` define needed.
