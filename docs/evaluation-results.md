# Evaluation Results

What the automated checks prove, and what they do not. Run on 2026-09-27 against commit `70733d0`: **160 of 160 passing across 12 test files.**

Reproduce: `bun install && bun test` (or `npm install && npx vitest run`).

## 1. Calculation engine (deterministic regression tests)

These check that the Schedule of Reductions math matches published scenarios exactly. They are regression tests, not AI evaluations: the same input must always produce the same dollars.

| Suite | Passing | What it checks |
|---|---|---|
| `sor.test.ts` | 51/51 | Scenario regression, engine invariants, the combined limit shifting rule, and a partial-entry disbursement regression |
| `sor.parity.test.ts` | 24/24 | Parity against the source-labeled fixture catalog; strict number handling with no silent coercion |
| `child-terms.test.ts` | 5/5 | Child and module term allocation |
| `migration.test.ts` | 2/2 | V55 to V56 comparison on approved historical fixtures |
| `phase-b.test.ts` | 2/2 | Canonical comparison for the Phase B tools |

## 2. Contracts and eligibility checks

| Suite | Passing | What it checks |
|---|---|---|
| `sor-v2-contract.test.ts` | 5/5 | V2 API contract normalization |
| `student-lle.test.ts` | 19/19 | Loan limit exception triage rules for self-reported facts (returns a review state, never an eligibility decision) |
| `student-lle-parity.test.ts` | 10/10 | The same answers through REST and MCP; the MCP server asks one question at a time |

## 3. Reconciliation Review Assistant (AI lab, synthetic data)

The lab compares two synthetic record sets, retrieves the fictional procedure that applies, and uses AI to explain the difference. A person decides the next step.

| Suite | Passing | What it checks |
|---|---|---|
| `lab/lab.test.ts` | 28/28 | Deterministic comparison, retrieval, all six scenarios against independently written expectations, and AI response contract validation |
| `lab/safety.test.ts` | 8/8 | Model response safety checks |
| `lab/review.test.ts` | 3/3 | Independent review regressions |
| `lab/quota.test.ts` | 3/3 | Shared usage quota behavior |

## What these results do not show

- They do not measure how accurate AI explanations are on new, unseen cases. That needs a held-out evaluation set graded by a person, which is the next piece of work.
- They do not measure whether reviewers make better decisions with the AI explanation than with the plain procedure view.
- A green run proves this source revision. It does not by itself prove what is deployed.

## Next

1. A held-out evaluation set for the reconciliation lab: new cases, an expected safe next step for each, blind human grading, and a comparison with the non-AI view.
2. Report results with numerators, denominators, cost and response time.
