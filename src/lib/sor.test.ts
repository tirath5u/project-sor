/**
 * Regression tests for the Schedule of Reductions engine.
 *
 * Run with:  bun run test:run
 */
import { describe, it, expect } from "vitest";
import { calculateSOR, defaultInputs, type TermKey } from "./sor";
import { SCENARIOS } from "./scenarios";

describe("SOR engine — scenario regression", () => {
  for (const s of SCENARIOS) {
    if (!s.expectedTerms && !s.expectedTotals) continue;
    it(`${s.id} — ${s.title}`, () => {
      const r = calculateSOR(s.build());
      if (s.expectedTotals?.sub !== undefined) {
        expect(r.totalFinalSub).toBe(s.expectedTotals.sub);
      }
      if (s.expectedTotals?.unsub !== undefined) {
        expect(r.totalFinalUnsub).toBe(s.expectedTotals.unsub);
      }
      if (s.expectedTerms) {
        for (const [key, exp] of Object.entries(s.expectedTerms)) {
          const term = r.termResults.find((t) => t.key === (key as TermKey));
          expect(term, `term ${key}`).toBeDefined();
          if (exp?.sub !== undefined) {
            expect(term!.finalSub, `${key} sub`).toBe(exp.sub);
          }
          if (exp?.unsub !== undefined) {
            expect(term!.finalUnsub, `${key} unsub`).toBe(exp.unsub);
          }
        }
      }
    });
  }
});

describe("SOR engine — invariants", () => {
  it("annual Sub never exceeds the reduced annual cap", () => {
    for (const s of SCENARIOS) {
      const r = calculateSOR(s.build());
      // Allow 1-dollar rounding tolerance
      expect(r.totalFinalSub).toBeLessThanOrEqual(r.reducedSub + 1);
    }
  });

  it("annual Unsub never exceeds the reduced annual cap", () => {
    for (const s of SCENARIOS) {
      const r = calculateSOR(s.build());
      expect(r.totalFinalUnsub).toBeLessThanOrEqual(r.reducedUnsub + 1);
    }
  });

  it("history anchoring: paid terms keep their net-paid amount", () => {
    const inp = defaultInputs();
    inp.viewMode = "disbursement";
    inp.terms.term1 = {
      ...inp.terms.term1,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 6,
      disbursed: true,
      actualCredits: 6,
      paidSub: 875,
    };
    inp.terms.term2 = {
      ...inp.terms.term2,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 12,
    };
    const r = calculateSOR(inp);
    const fall = r.termResults.find((t) => t.key === "term1")!;
    expect(fall.finalSub).toBe(875);
  });

  it("COA caps clamp the final disbursement", () => {
    const inp = defaultInputs();
    inp.terms.term1 = {
      ...inp.terms.term1,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 12,
      coaCapSub: 100,
    };
    inp.terms.term2 = {
      ...inp.terms.term2,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 12,
    };
    const r = calculateSOR(inp);
    const fall = r.termResults.find((t) => t.key === "term1")!;
    expect(fall.finalSub).toBeLessThanOrEqual(100);
  });

  it("below-half-time term is ineligible (no disbursement)", () => {
    const inp = defaultInputs();
    inp.annualNeed = 5500;
    inp.subStatutory = 3500;
    inp.unsubStatutory = 2000;
    inp.terms.term1 = {
      ...inp.terms.term1,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 9,
    };
    inp.terms.term2 = {
      ...inp.terms.term2,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 3, // below half-time
    };
    const r = calculateSOR(inp);
    const spring = r.termResults.find((t) => t.key === "term2")!;
    expect(spring.eligible).toBe(false);
    expect(spring.finalSub).toBe(0);
    expect(spring.finalUnsub).toBe(0);
  });
});
