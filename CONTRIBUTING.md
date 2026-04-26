# Contributing

Thank you for considering a contribution. This project is a public,
open implementation of the Direct Loan **Schedule of Reductions (SOR)**
calculation. Its value to the community comes from being **inspectable,
usable, and challengeable** - so the contribution workflow is centered on
fixtures, citations, and transparent versioning.

## Ways to contribute

1. **Scenario challenge.** You believe the engine produces a wrong number.
   Open a **Scenario Challenge** issue using the template - include the
   input JSON, the expected output, and the regulatory citation supporting
   your expected output. Issues without a citation will be asked for one
   before triage.
2. **Documentation.** Methodology improvements, clearer rounding examples,
   additional public-source-register entries.
3. **Engine bug fix.** A PR that makes a failing parity fixture pass.
4. **New fixture.** A PR that adds a new scenario backed by a public source.

## Development

```bash
bun install
bun test            # parity + unit tests
bun run dev         # local TanStack Start dev server
bun run build       # production build
```

## Versioning policy

The engine follows **semver** under `ENGINE_VERSION` in
`src/lib/sor.version.ts`:

| Change                                                | Bump   |
|-------------------------------------------------------|--------|
| Bug fix that brings outputs back in line with sources | patch  |
| Additive output field, new optional input field       | minor  |
| Changed input/output meaning, removed field, new rounding rule | major |

Notable major-version-class changes that are **out of scope for v1**:

- **Disbursement-mode calculations** (per-disbursement schedules) - v2.0.
- **Authenticated / quota endpoints** - v2.0.
- Non-Direct-Loan programs (Pell, TEACH, parent/grad PLUS nuances beyond
  the current engine).

`POLICY_YEAR` is decoupled from `ENGINE_VERSION` and tracks the federal
award year the engine targets by default.

## Pull-request checklist

- [ ] All parity fixtures still pass (`bun test`).
- [ ] If the change affects outputs, `ENGINE_VERSION` is bumped and the
      affected fixture(s) updated with a one-line justification.
- [ ] New fixtures cite **only** IDs from
      [`docs/public-source-register.md`](./docs/public-source-register.md).
- [ ] No internal client names, internal URLs, or spreadsheet paths in
      diffs.
- [ ] Public-API changes are reflected in
      [`/api/public/v1/openapi.json`](./src/routes/api/public/v1/openapi.json.ts).

## Code of conduct

Be precise. Cite sources. Disagree on the math, not on the person.