# V20 — Public SOR Calculation API (Final Comprehensive Plan)

## Goal

Expose the existing V19 SOR calculation engine as a free, public, portfolio-grade HTTP API on `sor.myproduct.life`, with full provenance, parity testing against the canonical spreadsheet, an open challenge workflow, and a transparent build narrative. Source the repo to GitHub so practitioners, vendors, and reviewers can inspect, use, and challenge the math.

**Non-goal**: changing the engine math. The Balance-Forward engine + cent-precision rounding from V19 is correct and the regression suite stays green.

---

## Architecture: One Engine, Two Consumers

```
┌─────────────────────────────────────────────────┐
│           src/lib/sor.ts (engine)               │
│   Pure TypeScript, deterministic, zero deps     │
└──────────────┬───────────────────────┬──────────┘
               │                       │
       direct import              HTTP wrapper
               │                       │
               ▼                       ▼
   ┌─────────────────────┐   ┌─────────────────────────┐
   │  React UI (today)   │   │ /api/public/v1/calculate│
   │  zero-latency math  │   │ Zod-validated, CORS     │
   └─────────────────────┘   └─────────────────────────┘
```

**Rule**: the UI never goes through the API, the API never re-implements engine logic, and `src/lib/sor.ts` stays the single source of truth.

---

## Stage 1 — Contract & Parity (do this BEFORE the API)

### 1.1 Version & policy metadata — `src/lib/sor.version.ts` (new)

Separated from the schema so validation logic and release identity stay decoupled:

```ts
export const ENGINE_VERSION = "19.0.0";        // bumps on math/code changes
export const POLICY_SET = "direct-loan-sor";
export const POLICY_YEAR = "2026-27";
export const POLICY_SNAPSHOT_DATE = "2026-04-24";
// Injected at build time; fallback for local dev
export const SOURCE_COMMIT =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_COMMIT_SHA) ||
  process.env.VITE_COMMIT_SHA ||
  "local-dev";

/**
 * Award-year support matrix. Reflected in /scenarios and /api-docs.
 */
export const SUPPORT_MATRIX = {
  "2025-26": { supported: true,  status: "confirmed",            notes: "Stable; 34 CFR 685.203 baseline." },
  "2026-27": { supported: true,  status: "preliminary-OBBBA",    notes: "OBBBA non-grandfathered behavior is preliminary; subject to final ED rulemaking." },
} as const;
```

**When each version bumps** (documented in `docs/methodology.md`):
- `ENGINE_VERSION` — math or code change in `src/lib/sor.ts`.
- `POLICY_YEAR` / `POLICY_SNAPSHOT_DATE` — ED publishes new guidance that changes a rule (e.g., OBBBA final rule).

### 1.2 Shared schema — `src/lib/sor.schema.ts` (new)

Pure shape validation only — no version metadata here.

```ts
import { z } from "zod";

// Reject empty strings, nulls, whitespace for required numeric fields.
// z.coerce.number() alone silently turns "" into 0, which corrupts SOR math.
const strictNumber = z.preprocess((v) => {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") {
    const t = v.trim();
    if (t === "") return undefined; // forces "Required" error
    const n = Number(t);
    return Number.isFinite(n) ? n : v;
  }
  return v;
}, z.number().finite());

export const SORInputSchema = z.object({
  awardYear: z.enum(["2025-26", "2026-27"]),
  gradeLevel: z.string().min(1).max(8),
  dependency: z.enum(["dependent", "independent"]),
  loanLimitException: z.boolean().default(false),
  ayFullTimeCredits: strictNumber.refine((n) => n > 0, "must be > 0"),
  annualNeed: strictNumber.nonnegative(),
  cost: strictNumber.nonnegative(),
  otherAid: strictNumber.nonnegative(),
  requestedGradPlus: strictNumber.nonnegative().default(0),
  terms: z.array(/* term schema */).min(1).max(6),
}).strict(); // reject unknown fields → 422

export type SORInput = z.infer<typeof SORInputSchema>;
```

### 1.3 Canonical fixtures — `src/lib/sor.fixtures.ts` (new, single source of truth)

`sor.fixtures.ts` is canonical. The `/scenarios` endpoint serializes to JSON at request time — we do **not** maintain a parallel `.json` file.

```ts
export type SourceStatus =
  | "confirmed"
  | "operational-clarification"
  | "inferred"
  | "pending-federal-guidance"
  | "school-policy-dependent";

export type AssertionLevel =
  | "canonical"               // matches the published spreadsheet exactly
  | "implemented-interpretation"
  | "exploratory";

export interface Fixture {
  id: string;                 // e.g. "fixture-v19-001"
  name: string;
  description: string;
  input: SORInput;
  expected: SORResults;
  sourceStatus: SourceStatus;
  assertionLevel: AssertionLevel;
  sourceRefs: string[];       // e.g. ["psr-001", "psr-014"] → docs/public-source-register.md
  asOf: string;               // ISO date — when this rule was last verified
  notes?: string;
}
```

**Privacy/safety on fixtures**:
- All inputs are synthetic personas or federally-published examples. No real student data, ever.
- `sourceRefs` point to entries in `docs/public-source-register.md`, not to private spreadsheet paths.
- The internal worksheet path (e.g. `spreadsheets/v19.xlsx#sheet=Scenario-A`) is **not** published. If a reviewer needs it, it lives in the public source register only when the spreadsheet itself is public and scrubbed.

### 1.4 Parity test — `src/lib/sor.parity.test.ts` (new)

For every fixture: run engine → assert cent-exact equality with `expected`. This is the credibility layer; CI fails if any canonical fixture drifts.

### 1.5 Rounding policy — `docs/rounding-policy.md` (new)

Documents the four cases the local SOR guide flags as open: cents rounding, term rounding, percentage rounding (SOR % vs EI %), and carry-forward behavior. Every fixture proves one of these.

---

## Stage 2 — Public API MVP

### 2.1 `POST /api/public/v1/calculate` — `src/routes/api/public/v1/calculate.ts` (new)

Strict HTTP semantics:
- `415 Unsupported Media Type` if `Content-Type` is not `application/json`.
- `406 Not Acceptable` if `Accept` is set and excludes `application/json`.
- `405 Method Not Allowed` for non-POST/OPTIONS, with `Allow: POST, OPTIONS`.
- `413 Payload Too Large` if body > 32 KB.
- `400` for malformed JSON; `422` for valid JSON that fails Zod.
- `200` on success.

CORS:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Accept, X-Request-Id` *(Accept is included because we validate it)*
- `Access-Control-Max-Age: 86400`
- `OPTIONS` returns **204 No Content** — checklist will be aligned to 204 (single source of truth).

Response envelope:
```json
{
  "data": { /* SORResults */ },
  "meta": {
    "engineVersion": "19.0.0",
    "policySet": "direct-loan-sor",
    "policyYear": "2026-27",
    "policySnapshotDate": "2026-04-24",
    "sourceCommit": "abc1234",
    "sourceRepo": "github.com/<owner>/<repo>",
    "sourceSet": ["direct-loan-sor-v1"],
    "citations": [],
    "requestId": "01HXXX...",
    "computedAt": "2026-04-25T12:34:56Z"
  }
}
```

`citations` is an array, only populated when the engine can map the scenario to specific rule tags. We do **not** stamp every response with `34 CFR 685.203(a)(2)` — that would overclaim.

### 2.2 Logging & privacy

`src/lib/api-logger.ts` (inline in handler initially; extract on second use):
- Log: `requestId`, `duration`, `status`, `userAgent`, `awardYear`, `gradeLevel`, `engineVersion`, `policyYear`.
- **Do not log raw IP.** Raw IP is used transiently for rate-limit bucketing only and is never written to logs. If we ever need IP-shaped analytics, log a daily-salted SHA-256 hash, never the raw value.
- Structured JSON output for grep-ability.

### 2.3 Rate limiting — `src/lib/rate-limit.ts` (new)

Best-effort, per-Worker-isolate, in-memory: 30 req/min and 5,000 req/day per IP. Headers on every response:
- `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- `X-RateLimit-Policy: best-effort-per-isolate`
- `Retry-After` on 429.

### 2.4 Error envelope — `src/lib/api-errors.ts` (new)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...], "requestId": "..." } }
```

### 2.5 Health — `GET /api/public/v1/health`

Returns `{ status, engineVersion, policyYear, policySnapshotDate, sourceCommit, uptime }`.

---

## Stage 3 — Public Evidence Layer

### 3.1 `GET /api/public/v1/scenarios`

Serializes `sor.fixtures.ts` to JSON at request time. Each scenario includes id, name, input, expected, `sourceStatus`, `assertionLevel`, `sourceRefs`, `asOf`. Lets any third party verify engine parity by replaying inputs against `/calculate`.

### 3.2 `GET /api/public/v1/openapi.json`

OpenAPI 3.1 generated from `src/lib/sor.schema.ts` via `zod-to-openapi`. Includes `operationId` for SDK generation and `x-code-samples` (cURL, JS, Python).

### 3.3 `GET /api/public/v1/`

Discovery endpoint listing all v1 routes + links to docs.

### 3.4 Versioning policy (in `docs/methodology.md`)

- **v1.x (additive)**: new optional fields, new endpoints, new fixtures, expanded `sourceRefs`.
- **v2 (breaking)**: any change to the meaning of an existing input or output field (e.g., adding disbursement-mode semantics that change how `paidSub` interacts with `finalSub`).
- Disbursement mode (handling `paidSub`, `refundUnsub`, recalcs) is **v2**, not v1.1, because it changes the semantics of the calculation, not just the surface area.

---

## Stage 4 — Portfolio Polish

### 4.1 Branded `/api-docs` — `src/routes/api-docs.tsx` (new)

- Hero: live API status, current `engineVersion` / `policyYear`.
- Quickstart with code tabs (cURL, fetch, Python `requests`).
- Award-year support matrix (rendered from `SUPPORT_MATRIX`).
- Rate-limit policy explained.
- **"Challenge this calculation" callout** — links to a pre-filled GitHub issue.
- Disclaimer (see §6).

### 4.2 Swagger UI — `/api/v1/docs` (new)

`swagger-ui-react` pointing at `/api/public/v1/openapi.json`. Optional for launch — ship `/api-docs` first if Swagger adds load.

### 4.3 Examples — `examples/` (new)

Runnable: `examples/curl.sh`, `examples/node.mjs`, `examples/python.py`. README in the folder shows expected output.

---

## Stage 5 — GitHub & Documentation

### 5.1 README rewrite

Single image at top showing the **provenance chain**:
**Regulation citation → Spreadsheet screenshot → API call → Matching response → Passing parity test.**

Sections:
- Live app + API quickstart
- Architecture (link to `docs/architecture.md`, Mermaid)
- "How to verify our math": one paragraph — `git clone && bun install && bunx vitest run`. Every canonical fixture passes cent-exact.
- "How to challenge a calculation"
- Methodology + process narrative links
- License (MIT) + disclaimer

### 5.2 Documentation suite

| File | Purpose |
|---|---|
| `docs/architecture.md` | Mermaid diagram, one-engine-two-consumers explanation |
| `docs/methodology.md` | Source-status taxonomy (one paragraph + example per label), version bump rules, versioning policy (v1 vs v2) |
| `docs/process.md` | **Transparent build process** (renamed from "open the kimono"): how the spreadsheet was derived → wiki → LLM-assisted formula derivation → adversarial multi-LLM review → final spec → Lovable build → API plan debate |
| `docs/rounding-policy.md` | Cents, term, percentage, carry-forward rounding rules |
| `docs/public-source-register.md` | Every public citation: URL, source type, `sourceStatus`, last-verified date, which rule it supports. Internal notes / vendor transcripts / client examples are excluded |
| `docs/regulatory-citations.md` | 34 CFR 685.203, OBBBA primary sources |
| `docs/scenario-catalog.md` | Human-readable index of all fixtures with their `assertionLevel` |
| `LICENSE` | MIT (required for the "free, public" framing to be legally valid) |
| `CONTRIBUTING.md` | Includes SLA: *"Issues are triaged weekly. Accepted scenario challenges become fixtures within one release cycle."* |
| `CHANGELOG.md` | Semantic version log keyed to `ENGINE_VERSION` and `POLICY_SNAPSHOT_DATE` |

**LLM governance note** (in `docs/process.md` and `README.md`):
> *LLMs helped derive, critique, and implement this calculator. Source documents (34 CFR 685.203, OBBBA, FSA TechRefs), the published spreadsheet, fixtures, and the parity test suite are the authority. The LLM is the assistant, not the source of truth.*

### 5.3 GitHub repo target

Confirm with the user during execution: does Lovable's sync push to `github.com/<their-account>/<repo>`? If not, fork/mirror to `tirath5u/sor-api` so README badges and `meta.sourceRepo` resolve correctly.

### 5.4 Issue templates — `.github/ISSUE_TEMPLATE/`

- `scenario-challenge.yml` — pre-fills inputs, expected output, source citation, reason. Every accepted challenge becomes a **fixture first, code change second**.
- `citation-update.yml` — for regulatory updates (e.g., OBBBA final rule).
- `bug.yml`.

### 5.5 CI — `.github/workflows/ci.yml` (new)

Mandatory: typecheck, lint, `bunx vitest run` (engine + parity + API). Inject `VITE_COMMIT_SHA=${{ github.sha }}` at build so `meta.sourceCommit` is real.

Deploy workflow is **conditional** — only added once the user confirms Lovable supports the exact GitHub Actions deployment path. Until then, Lovable's sync handles deploys.

### 5.6 Public-safety pre-launch checklist

Before flipping the repo public:
- [ ] No client data in any fixture or doc
- [ ] No internal team names / vendor names
- [ ] No proprietary worksheet tabs or internal file paths
- [ ] No unpublished vendor material
- [ ] No screenshots exposing internal artifacts
- [ ] Disclaimer present in README + `/api-docs`
- [ ] LICENSE committed

---

## 6. Disclaimer (README + `/api-docs`)

> This is an open educational and validation tool, **not** an official ED calculator, legal advice, or an institutional policy substitute. **No real student data is or will ever be in this repository.** All scenarios use synthetic personas or federally-published examples. OBBBA-related behavior for award year 2026-27 is **preliminary** pending final ED rulemaking. Higher-ed practitioners, vendor teams, and reviewers are invited to inspect, use, and challenge the math via GitHub issues.

(Avoids the "ED partners endorse this" overclaim.)

---

## Files Created / Modified

**New logic & contracts**
- `src/lib/sor.version.ts`
- `src/lib/sor.schema.ts`
- `src/lib/sor.fixtures.ts` *(canonical, single source of truth)*
- `src/lib/sor.parity.test.ts`
- `src/lib/api-errors.ts`
- `src/lib/rate-limit.ts`
- `src/lib/openapi-spec.ts`

**New routes**
- `src/routes/api/public/v1/index.ts` *(discovery)*
- `src/routes/api/public/v1/calculate.ts`
- `src/routes/api/public/v1/health.ts`
- `src/routes/api/public/v1/scenarios.ts`
- `src/routes/api/public/v1/openapi.json.ts`
- `src/routes/api/v1/docs.tsx` *(Swagger UI, optional for launch)*
- `src/routes/api-docs.tsx`

**Docs & meta**
- `README.md` (rewrite)
- `LICENSE` (MIT)
- `CONTRIBUTING.md`, `CHANGELOG.md`
- `docs/architecture.md`, `docs/methodology.md`, `docs/process.md`
- `docs/rounding-policy.md`, `docs/public-source-register.md`
- `docs/regulatory-citations.md`, `docs/scenario-catalog.md`
- `examples/curl.sh`, `examples/node.mjs`, `examples/python.py`
- `.github/workflows/ci.yml`
- `.github/ISSUE_TEMPLATE/{scenario-challenge,citation-update,bug}.yml`

**Modified**
- `src/lib/sor.ts` — export types only; no math change.
- `src/routes/index.tsx` — header link to `/api-docs`.

**Untouched**
- Engine math, scenarios, regression tests, lifecycle page.

---

## Verification Checklist

1. `POST /api/public/v1/calculate` with valid body → `200` + `data` + `meta` (with real `sourceCommit`, not `local-dev`, in CI builds).
2. Wrong `Content-Type` → `415`. `Accept: text/html` → `406`. `GET` → `405` with `Allow: POST, OPTIONS`. Body > 32 KB → `413`.
3. Malformed JSON → `400`. Valid JSON, schema fail → `422` with field-level details. Empty-string numeric field → `422` "Required" (not silently `0`).
4. Unknown field in body → `422` (schema is `.strict()`).
5. CORS preflight `OPTIONS` returns **204** with `Allow-Headers` including `Accept`.
6. 31st request in 60s → `429` with `Retry-After` and `X-RateLimit-Policy: best-effort-per-isolate`.
7. Logs contain `requestId`, `duration`, `userAgent` — **never** raw IP.
8. `GET /scenarios` returns fixtures with `sourceStatus`, `assertionLevel`, `sourceRefs`, `asOf`. Replaying any canonical fixture against `/calculate` returns cent-exact `expected`.
9. `meta.citations` is `[]` for generic scenarios; populated only when the engine maps to specific rule tags.
10. `/api-docs` shows the support matrix, "Challenge this calculation" link, and the disclaimer.
11. `bunx vitest run` → all parity tests green; CI blocks merge on failure.
12. Public-safety checklist completed before repo goes public.

---

## Stage Order

1. **Stage 1 — Contract & Parity**: version file, schema with `strictNumber`, fixtures, parity test, rounding doc.
2. **Stage 2 — API MVP**: `/calculate`, `/health`, errors, rate-limit, no-IP logging.
3. **Stage 3 — Evidence Layer**: `/scenarios`, `/openapi.json`, `/` discovery.
4. **Stage 4 — Polish**: `/api-docs` page, examples, optional Swagger.
5. **Stage 5 — GitHub & Docs**: README, all docs, LICENSE, issue templates, CI with `VITE_COMMIT_SHA` injection.
6. **Pre-launch**: public-safety checklist, then flip the repo public.

Once approved, Stage 1 starts in default mode.
