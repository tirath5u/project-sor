# Rounding Policy

All monetary outputs from the SOR engine use **half-up rounding to the
nearest whole dollar** unless explicitly noted below.

| Field                                                   | Rule                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `subBaseline`, `unsubBaseline`                          | Whole dollars (input anchors).                                                                      |
| `effectiveCombinedLimit`                                | Whole dollars.                                                                                      |
| `sorPctRounded`                                         | Enrollment ratio rounded to the nearest whole percent, then expressed as a decimal factor (e.g. `11/12` becomes `0.92`, not `0.9167`). |
| `reducedSub`, `reducedUnsub`, `reducedGradPlus`         | Whole dollars, half-up.                                                                             |
| `totalFinalSub`, `totalFinalUnsub`                      | Whole dollars; equal to the sum of per-term `finalSub` / `finalUnsub`.                              |
| `termResults[].finalSub`, `finalUnsub`, `finalGradPlus` | Whole dollars, half-up; the running total is clamped so it never exceeds the reduced annual amount. |

The unrounded credit ratio is useful context, but the reduced annual amount uses the whole-percent factor. Comparison deltas are displayed to two decimal places for this factor to avoid binary floating-point artifacts. Equal-distribution residual placement depends on whether a current SOR reduction applies; see the calculator's term result rather than assuming it always lands in the last term.

## Why half-up (not banker's rounding)

Federal aid disbursement systems and most published SOR worked examples use
**arithmetic half-up rounding** (e.g. `1840.50` → `1841`). Banker's rounding
(round-half-to-even) would diverge from those examples in the boundary case
and break parity. The engine standardizes on half-up to stay consistent with
published guidance.

## Negative-zero & floor behavior

- All monetary outputs are clamped to a **minimum of `0`**. The engine never
  emits a negative dollar amount.
- `-0` is normalized to `0` before serialization.

## Determinism guarantee

Given the same input and the same `ENGINE_VERSION`, the engine produces
byte-identical output. Any rounding-rule change is a **breaking change** and
must bump the `ENGINE_VERSION` major.
