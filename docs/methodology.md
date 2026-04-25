# SOR Calculation Methodology

This document describes how the engine in `src/lib/sor.ts` computes the
Direct Loan **Schedule of Reductions (SOR)** for a student's enrollment
pattern within an award year.

> **Authority.** The authoritative rules live in **34 CFR 685.203** and the
> annual Federal Student Aid (FSA) **COD Technical Reference**. This document
> is a plain-language walkthrough of the engine; it does not replace federal
> regulation or guidance. Where 2026-27 behavior depends on rulemaking that
> implements **OBBBA**, items are flagged `pending-federal-guidance` in the
> public source register and surfaced via `meta.policyStatus` on the API.

## Inputs

An SOR calculation requires:

1. **Student status** — grade level, dependency status, and whether the
   student qualifies for additional unsubsidized eligibility (e.g. parent
   denied PLUS).
2. **Award-year enrollment pattern** — terms attended and their length in
   weeks.
3. **Annual loan-limit anchors** — base sub/unsub limits for the student's
   level and dependency status (per 34 CFR 685.203 schedule).
4. **Optional anchors** — already-paid amounts per term (`paidSub`,
   `paidUnsub`). `null` means "no anchor"; `0` means "explicit zero anchor"
   (the difference matters for downstream proration).

The full input contract lives in `src/lib/sor.schema.ts` and is enforced on
the public `/api/public/v1/calculate` endpoint with `strictNumber` (no silent
`0` coercion of empty strings or `null`).

## High-level steps

1. **Establish baselines.** Resolve sub/unsub baselines from the loan-limit
   anchor for the student's level/dependency.
2. **Resolve combined limit.** Compute `effectiveCombinedLimit` accounting
   for additional unsub eligibility where applicable.
3. **Compute the SOR percentage.** Sum enrolled weeks and divide by the
   academic-year week denominator. Round to the policy-specified precision
   (`sorPctRounded`).
4. **Apply reductions.** Multiply baselines by the SOR percentage to obtain
   `reducedSub` / `reducedUnsub` (and `reducedGradPlus` where relevant).
5. **Per-term distribution.** Walk each term in chronological order,
   honoring per-term anchors (`paidSub`, `paidUnsub`) and never letting the
   running total exceed the reduced annual amount.
6. **Final totals.** Emit `totalFinalSub`, `totalFinalUnsub`,
   `initialGradPlus`, `reducedGradPlus`, and a `termResults[]` array.

## Determinism & rounding

All monetary outputs use the rounding rules described in
[`docs/rounding-policy.md`](./rounding-policy.md). The engine is pure and
deterministic: the same input always produces the same output for a given
`ENGINE_VERSION`. Parity is enforced by `src/lib/sor.parity.test.ts`.

## Versioning

- `ENGINE_VERSION` (semver) tracks the **calculation code**.
- `POLICY_YEAR` tracks the **federal award year** the engine targets by
  default (currently `2026-27`).
- These two version axes are decoupled: a bug fix in the engine bumps
  `ENGINE_VERSION` without changing `POLICY_YEAR`, and an award-year update
  bumps `POLICY_YEAR` without necessarily bumping `ENGINE_VERSION`.

See [`docs/process.md`](./process.md) for the build narrative and
[`docs/public-source-register.md`](./public-source-register.md) for the
regulatory anchors cited by fixtures.