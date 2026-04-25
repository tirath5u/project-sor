# Project SOR: Schedule of Reductions Calculator

An open-source, parity-tested implementation of the OBBBA Less-Than-Full-Time Reduction (Schedule of Reductions) for federal Direct Subsidized and Unsubsidized loans, with a free public HTTP API.

Built and maintained by **Tirath Chhatriwala**, Principal Product Manager at Anthology / Ellucian.

[![CI](https://github.com/tirath5u/project-sor/actions/workflows/ci.yml/badge.svg)](https://github.com/tirath5u/project-sor/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Live API](https://img.shields.io/badge/API-sor.myproduct.life-7100EB.svg)](https://sor.myproduct.life/api/public/v1/health)

> **Try it now:** [sor.myproduct.life](https://sor.myproduct.life)
>
> **Source:** <https://github.com/tirath5u/project-sor>
>
> **Web UI access:** The web calculator is behind a soft access gate during the launch window. Password: `sor2026`. The public API endpoints below require no password and no signup.

---

## Try it in 30 seconds

```bash
# Service liveness + version metadata
curl https://sor.myproduct.life/api/public/v1/health

# Published scenario catalog with regulatory citations
curl https://sor.myproduct.life/api/public/v1/scenarios | jq '.data | length'

# Run the first published scenario through the engine
curl -X POST https://sor.myproduct.life/api/public/v1/calculate \
  -H 'Content-Type: application/json' \
  -d "$(curl -s https://sor.myproduct.life/api/public/v1/scenarios | jq '.data[0].input')"
```

The dollars you get from the API match the dollars you get from the web UI match the dollars in the published fixture catalog. One engine, three views, zero drift.

---

## Screenshot

![Project SOR: Schedule of Reductions Calculator](docs/screenshot.png)

---

## What this is

A reference implementation of the Schedule of Reductions math for award years 2025-26 and 2026-27, defined by 34 CFR 685.203 and amended by the OBBBA. Single source-of-truth engine (`src/lib/sor.ts`), exposed both as a web calculator at sor.myproduct.life and as a public HTTP API at /api/public/v1/. Fixtures, citations, methodology, and the 5-stage build process are all open and documented.

## What this is not

Not an official U.S. Department of Education publication. Not an Anthology or Ellucian product. Not legal or compliance advice. No real student data is or will ever be in this repo. All scenarios use synthetic personas or federally-published examples.

Always validate against the current COD Technical Reference Volume 2 and the most recent ED Electronic Announcement before making a disbursement decision.

---

## What it does

- **Reduced annual Sub/Unsub baselines** computed from grade level, dependency status, Parent PLUS denial, and optional override caps.
- **Per-term disbursement amounts** with proper rounding-to-dollar correction so the term sum equals the reduced annual amount (no orphan pennies).
- **History-anchored disbursement view:** committed Paid Sub / Paid Unsub per term anchor independently and the engine redistributes the remaining pool only across future eligible terms.
- **Case-file PDF export** of inputs, calculated baselines, per-term disbursements, and the 6-step walkthrough.
- **7 canonical fixtures** drawn from ED-published scenarios, each tagged with regulatory citations and a source-status label.

---

## Public API

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/public/v1/health` | GET | Liveness, engine version, policy year |
| `/api/public/v1/scenarios` | GET | Fixture catalog with regulatory citations and source-status labels |
| `/api/public/v1/calculate` | POST | Run the engine on supplied inputs |
| `/api/public/v1/openapi.json` | GET | OpenAPI 3.1 specification |

**Rate limit:** 30 requests per minute and 5,000 per day per IP, best-effort per edge isolate. No keys, no signup. Header `X-RateLimit-Policy: best-effort-per-isolate` documents the constraint honestly.

**Response envelope:** every successful response carries `meta.engineVersion`, `meta.policyVersion`, `meta.requestId`, and `meta.sourceRepo` so a consumer can reproduce a calculation against a specific snapshot of the rules.

**Error contract:** uniform `{ error: { code, message, details? } }` envelope. Status codes are RFC-correct: 400 for malformed JSON, 415 for wrong content type, 422 for valid JSON that fails schema, 429 for rate limit, 405 for wrong method, 413 for oversized body.

---

## Verify the math

```bash
git clone https://github.com/tirath5u/project-sor
cd project-sor
bun install
bun test
```

42 tests pass cent-exact against published fixtures: 7 SOR parity scenarios plus schema validation plus numeric coercion edges. CI runs the same suite on every push and pull request.

A second verification path is purely external: pull the catalog from `/api/public/v1/scenarios`, replay each `input` through `/api/public/v1/calculate`, and diff against each `expectedOutput`. A reviewer can do this with a 20-line script.

---

## Who this is for

| Audience | What you get |
|---|---|
| **Financial aid administrators (FAA)** | Plain-English walkthrough of how OBBBA's LT-FT reduction lands on a real student, term by term. |
| **SIS / FA developers** | A reference engine and parity tests for the SOR formula, rounding rules, and disbursement anchoring you can compare your own implementation against. |
| **QA engineers** | The fixture catalog as one-click presets, plus a parity test suite covering edge cases (mid-cycle drops, partial entry, override caps). |
| **Product managers** | A worked example of converting regulatory ambiguity into shippable acceptance criteria, with sources cited inline. |

---

## How to use the web UI

1. Pick a scenario from the left rail or start blank. Fixtures are grouped by case type.
2. Adjust inputs: grade level, dependency, annual need, term count, full-time vs. enrolled credits per term, optional summer or winter terms.
3. Read the 6-step walkthrough on the right. Every number on screen has a citation back to the input that produced it.
4. Switch to Disbursement view to enter Paid Sub / Paid Unsub per term and watch the engine re-anchor the remaining pool.
5. Export the PDF for audit, sprint review, or a vendor conversation.

---

## The 5-step SOR formula (compressed)

1. **Statutory annual limits** for Sub and Unsub from the grade-level lookup, with optional override.
2. **Annual financial need** is split into Sub-eligible and Unsub-eligible buckets.
3. **Award-year enrollment intensity** is computed from per-term enrolled vs. full-time credits, weighted by term length.
4. **Reduced annual amounts** equal the lesser of the statutory cap or the need bucket, multiplied by the enrollment-intensity percentage.
5. **Per-term disbursements** spread the reduced annual across active terms, with a rounding pass that pushes any cent residual into the last eligible term so the sum is exact.

---

## Hard rules teams miss

- **Sub and Unsub anchor independently.** Entering `Paid Sub = 666` for a term must NOT zero out that term's `Paid Unsub`. Each loan type has its own history.
- **Blank is not zero.** A `Paid Unsub` field that has not been entered is *pending*, not *committed zero*. The engine only redistributes Unsub forward after the user explicitly enters or confirms 0.
- **Enrollment intensity is award-year-level**, not term-level. A student going 12/6/12 is not "full-time, half-time, full-time." They are at one weighted AY percentage.
- **Combined limit is the ceiling.** Unsub baseline equals `max(0, combinedLimit - subBaseline)`. Override mode does not let you exceed the lookup combined limit unless you intentionally override that cap too.
- **Round to dollar at the term level**, not the annual level. Per-term values are integer dollars; the rounding residual lands in the last eligible term.
- **Mid-cycle disbursement requires history.** Once any term is marked Disbursed, the engine treats that term's Paid amounts as locked and only adjusts future terms.
- **Grad/Prof has no Sub.** Sub baseline is forced to 0 for graduate and professional grade levels regardless of override.

---

## Sources and confidence

Every fixture and rule traces back to a source labeled with one of five statuses:

| Label | Meaning |
|---|---|
| `confirmed` | Published in a Dear Colleague Letter, Electronic Announcement, the COD Tech Ref, or final ED Q&A |
| `operational-clarification` | Confirmed by ED in a vendor focus group or written response to a vendor question |
| `inferred` | Derived from regulation text or analogy to an existing rule, not yet published |
| `pending-federal-guidance` | Known open question; current behavior is the safest default until ED confirms |
| `school-policy-dependent` | Permitted variability where institutional policy controls the answer |

Full register: [`docs/public-source-register.md`](docs/public-source-register.md). Methodology: [`docs/methodology.md`](docs/methodology.md). Rounding policy: [`docs/rounding-policy.md`](docs/rounding-policy.md).

---

## How to challenge a calculation

If you find a scenario the engine handles incorrectly, open a [Scenario Challenge issue](https://github.com/tirath5u/project-sor/issues/new?template=scenario-challenge.yml) with:

- The exact input
- The expected output (with reasoning)
- The observed output
- A regulatory citation supporting the expected behavior

Accepted challenges become fixtures first, code changes second. Issues are triaged weekly.

---

## How it was built

Regulatory ingest into a domain wiki, LLM-assisted formula derivation into an Excel master sheet, adversarial cross-LLM review on the spec, Lovable-built calculator UI, and a thin TypeScript HTTP wrapper around the same engine. The full workflow including the AI-orchestration role is documented in [`docs/process.md`](docs/process.md).

---

## Local development

Requires [Bun](https://bun.sh) (or use npm / pnpm equivalents).

```bash
bun install
bun dev          # start the dev server
bun test         # run the SOR engine and parity test suite
bun run build    # production build
```

**Tech stack:** TanStack Start v1 (React 19, file-based routing, SSR), Vite 7, Tailwind CSS v4, shadcn/ui, Zod, jsPDF for case-file export.

The calculation engine lives in `src/lib/sor.ts` with parity tests in `src/lib/sor.parity.test.ts`. Fixtures are in `src/lib/sor.fixtures.ts`. Public API routes are under `src/routes/api/public/v1/`. UI components are in `src/routes/index.tsx` and `src/components/sor/*`.

---

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Pull requests welcome for fixture additions, regulatory-citation updates, and bug fixes. Engine math changes follow the fixture-first rule: open a Scenario Challenge issue, get the new fixture accepted, then submit the code change.

---

## License

MIT. See [`LICENSE`](LICENSE).

---

## Author

**Tirath Chhatriwala**, Product Manager, in EdTech and Higher Education with over 14 years of experience.

- Hub: [myproduct.life](https://myproduct.life)
- This tool: [sor.myproduct.life](https://sor.myproduct.life)
- LinkedIn: [Tirath Chhatriwala]<https://www.linkedin.com/in/tirath-c-7228b814/>
- More projects: <https://github.com/tirath5u>

Project SOR is the first tool in the **myproduct.life** umbrella, a small and growing collection of practitioner-built tools, strategy notes, and product-thinking writing.
