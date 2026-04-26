/**
 * Parity test suite - runs every PARITY_FIXTURE through the engine and asserts
 * field-level equality with the committed `expected` values.
 *
 * If this suite breaks, EITHER:
 *  (a) the engine has changed in a way that affects outputs - bump
 *      ENGINE_VERSION in src/lib/sor.version.ts and update the fixture
 *      `expected` block with a justification, OR
 *  (b) a regression has slipped in - fix the engine.
 *
 * Fixtures are the single source of truth for the public /scenarios endpoint.
 */

import { describe, it, expect } from "vitest";
import { calculateSOR } from "./sor";
import { PARITY_FIXTURES } from "./sor.fixtures";
import { CalculateInputSchema, strictNumber } from "./sor.schema";
import { z } from "zod";

describe("SOR parity fixtures", () => {
  for (const fx of PARITY_FIXTURES) {
    it(`${fx.id} - ${fx.description.slice(0, 80)}`, () => {
      const r = calculateSOR(fx.input);
      const e = fx.expected;

      if (e.totalFinalSub !== undefined) expect(r.totalFinalSub).toBe(e.totalFinalSub);
      if (e.totalFinalUnsub !== undefined) expect(r.totalFinalUnsub).toBe(e.totalFinalUnsub);
      if (e.reducedSub !== undefined) expect(r.reducedSub).toBe(e.reducedSub);
      if (e.reducedUnsub !== undefined) expect(r.reducedUnsub).toBe(e.reducedUnsub);
      if (e.sorPctRounded !== undefined) expect(r.sorPctRounded).toBe(e.sorPctRounded);
      if (e.sorApplicable !== undefined) expect(r.sorApplicable).toBe(e.sorApplicable);
      if (e.initialGradPlus !== undefined) expect(r.initialGradPlus).toBe(e.initialGradPlus);
      if (e.reducedGradPlus !== undefined) expect(r.reducedGradPlus).toBe(e.reducedGradPlus);
      if (e.effectiveCombinedLimit !== undefined)
        expect(r.effectiveCombinedLimit).toBe(e.effectiveCombinedLimit);
      if (e.subBaseline !== undefined) expect(r.subBaseline).toBe(e.subBaseline);
      if (e.unsubBaseline !== undefined) expect(r.unsubBaseline).toBe(e.unsubBaseline);

      if (e.terms) {
        for (const [k, vals] of Object.entries(e.terms)) {
          const t = r.termResults.find((tr) => tr.key === k);
          expect(t, `term ${k} present`).toBeDefined();
          if (vals?.finalSub !== undefined) expect(t!.finalSub).toBe(vals.finalSub);
          if (vals?.finalUnsub !== undefined) expect(t!.finalUnsub).toBe(vals.finalUnsub);
          if (vals?.finalGradPlus !== undefined) expect(t!.finalGradPlus).toBe(vals.finalGradPlus);
        }
      }
    });
  }

  it("every fixture input is accepted by the public CalculateInputSchema", () => {
    for (const fx of PARITY_FIXTURES) {
      const parsed = CalculateInputSchema.safeParse(fx.input);
      expect(parsed.success, `${fx.id} schema-valid`).toBe(true);
    }
  });
});

describe("strictNumber - no silent coercion", () => {
  const s = z.object({ x: strictNumber({ min: 0 }) });

  it("accepts a number", () => {
    expect(s.safeParse({ x: 5 }).success).toBe(true);
  });
  it("accepts a numeric string", () => {
    expect(s.safeParse({ x: "5" }).success).toBe(true);
  });
  it("rejects empty string (no silent 0)", () => {
    expect(s.safeParse({ x: "" }).success).toBe(false);
  });
  it("rejects whitespace string", () => {
    expect(s.safeParse({ x: "   " }).success).toBe(false);
  });
  it("rejects null", () => {
    expect(s.safeParse({ x: null }).success).toBe(false);
  });
  it("rejects undefined", () => {
    expect(s.safeParse({ x: undefined }).success).toBe(false);
  });
  it("rejects NaN", () => {
    expect(s.safeParse({ x: Number.NaN }).success).toBe(false);
  });
  it("rejects non-numeric string", () => {
    expect(s.safeParse({ x: "abc" }).success).toBe(false);
  });
  it("enforces min", () => {
    expect(s.safeParse({ x: -1 }).success).toBe(false);
  });
});
