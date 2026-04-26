# Process Narrative

This project is a **public, open implementation** of the Direct Loan
Schedule of Reductions (SOR) calculation. It exists so that higher-ed
practitioners, vendor teams, and reviewers can **inspect, use, and challenge**
the math - not as an authoritative source.

## How the engine was derived

1. **Source documents first.** The starting point was 34 CFR 685.203 and the
   relevant Federal Student Aid COD Technical Reference for the target award
   year. These are the authority. Everything else in this repo is a
   derivation from them.
2. **Spreadsheet parity.** Canonical scenarios were modeled in a spreadsheet
   first, validated against worked examples in published guidance, and then
   committed to `src/lib/sor.fixtures.ts` as the single source of truth.
3. **Engine implementation.** `src/lib/sor.ts` was implemented to satisfy
   those fixtures field-for-field. `src/lib/sor.parity.test.ts` enforces
   that contract on every commit.
4. **Schema hardening.** `src/lib/sor.schema.ts` defines the public input
   contract with `strictNumber`, which rejects empty strings, `null`, and
   whitespace for required numeric fields - eliminating the entire class of
   "silent zero" bugs that plague form-driven financial calculators.

## LLM-assisted critique loop

Large-language models were used as **derivation, critique, and
implementation assistants** at every stage:

- Drafting and refining the calculation walkthrough against published
  examples.
- Adversarial review of edge cases (negative anchors, zero-week terms,
  mixed dependency status, OBBBA-affected scenarios).
- Code generation for the engine, schemas, fixtures, API routes, and tests.
- Iterative critique of the public API surface (CORS, rate limiting,
  versioning, error envelopes).

**Governance note.** LLMs helped derive, critique, and implement this
project. They are **not** the authority. The authorities are:

1. The cited federal source documents (34 CFR 685.203, current FSA COD
   Technical Reference).
2. The committed parity fixtures and tests in this repository.

If a fixture and an LLM disagree, the fixture wins. If a fixture and a
source document disagree, the source document wins and the fixture must be
corrected with a justification in the PR.

## How to challenge a result

See [`CONTRIBUTING.md`](../CONTRIBUTING.md) and the **Scenario Challenge**
issue template. In short:

1. Open a Scenario Challenge issue with input, expected output, and the
   regulatory citation supporting your expected output.
2. If the engine is wrong, a fix lands as a PR with a new fixture and a
   bumped `ENGINE_VERSION`.
3. If the engine is right, the issue is resolved with a written explanation
   tying the result back to the source document.

Either outcome leaves the public record stronger than it was before.
