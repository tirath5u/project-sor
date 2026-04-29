/**
 * Regression tests for the Schedule of Reductions engine.
 *
 * Run with:  bun run test:run
 */
import { describe, it, expect } from "vitest";
import { calculateSOR, defaultInputs, type TermKey } from "./sor";
import { SCENARIOS } from "./scenarios";

describe("SOR engine - scenario regression", () => {
  for (const s of SCENARIOS) {
    if (!s.expectedTerms && !s.expectedTotals) continue;
    it(`${s.id} - ${s.title}`, () => {
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

describe("SOR engine - invariants", () => {
  it("proportional distribution uses a balance-forward remaining-credit denominator", () => {
    const inp = defaultInputs();
    inp.overrideLimits = true;
    inp.annualNeed = 1840;
    inp.subStatutory = 1840;
    inp.unsubStatutory = 0;
    inp.distributionModel = "proportional";
    inp.numStandardTerms = 3;
    inp.ayFtCredits = 33;
    inp.terms.term1 = { ...inp.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: 12 };
    inp.terms.term2 = { ...inp.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: 6 };
    inp.terms.term3 = { ...inp.terms.term3, enabled: true, ftCredits: 12, enrolledCredits: 15 };

    const r = calculateSOR(inp);
    const fall = r.termResults.find((t) => t.key === "term1")!;
    const spring = r.termResults.find((t) => t.key === "term2")!;
    const t3 = r.termResults.find((t) => t.key === "term3")!;

    expect(fall.finalSub).toBe(669);
    expect(spring.finalSub).toBe(335);
    expect(t3.finalSub).toBe(836);
    expect(r.totalFinalSub).toBe(1840);
  });

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

describe("SOR engine - Combined Limit Shifting Rule (regression)", () => {
  function depFreshman(need: number): ReturnType<typeof defaultInputs> {
    const inp = defaultInputs();
    inp.gradeLevel = "g1";
    inp.dependency = "dependent";
    inp.overrideLimits = false;
    inp.annualNeed = need;
    // Lookup says g1/dep = $3,500 / $2,000 (combined $5,500). The engine must
    // resolve these from the lookup, NOT trust whatever subStatutory /
    // unsubStatutory the inputs object happens to carry.
    inp.subStatutory = 3500;
    inp.unsubStatutory = 2000;
    inp.terms.term1 = {
      ...inp.terms.term1,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 12,
    };
    inp.terms.term2 = {
      ...inp.terms.term2,
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 12,
    };
    return inp;
  }

  it("Need $5,000 -> Sub $3,500 / Unsub $2,000 baselines", () => {
    const r = calculateSOR(depFreshman(5000));
    expect(r.subBaseline).toBe(3500);
    expect(r.unsubBaseline).toBe(2000);
    expect(r.effectiveCombinedLimit).toBe(5500);
  });

  it("Need $2,000 -> Sub $2,000 / Unsub $3,500 baselines (shifting)", () => {
    const r = calculateSOR(depFreshman(2000));
    expect(r.subBaseline).toBe(2000);
    expect(r.unsubBaseline).toBe(3500);
    expect(r.effectiveCombinedLimit).toBe(5500);
  });

  it("Stale unsubStatutory=0 in state is ignored when overrideLimits is false", () => {
    const inp = depFreshman(5000);
    // Simulate stale scenario state.
    inp.subStatutory = 3500;
    inp.unsubStatutory = 0;
    const r = calculateSOR(inp);
    expect(r.effectiveUnsubStatutory).toBe(2000);
    expect(r.unsubBaseline).toBe(2000);
  });

  it("overrideLimits=true honors the manually-typed caps", () => {
    const inp = depFreshman(5000);
    inp.overrideLimits = true;
    inp.subStatutory = 1000;
    inp.unsubStatutory = 0;
    const r = calculateSOR(inp);
    expect(r.effectiveSubStatutory).toBe(1000);
    expect(r.effectiveUnsubStatutory).toBe(0);
    expect(r.effectiveCombinedLimit).toBe(1000);
    expect(r.subBaseline).toBe(1000);
    expect(r.unsubBaseline).toBe(0);
  });

  it("override snap-back: toggling overrideLimits off re-derives caps from lookup", () => {
    const inp = depFreshman(5000);
    // User had override on with arbitrary manual caps...
    inp.overrideLimits = true;
    inp.subStatutory = 1234;
    inp.unsubStatutory = 0;
    const overridden = calculateSOR(inp);
    expect(overridden.effectiveSubStatutory).toBe(1234);
    expect(overridden.effectiveUnsubStatutory).toBe(0);
    // ...then turns it off. Manual caps stay in inputs (UI doesn't auto-clear)
    // but the engine MUST ignore them and use the lookup table.
    inp.overrideLimits = false;
    const snapped = calculateSOR(inp);
    expect(snapped.effectiveSubStatutory).toBe(3500);
    expect(snapped.effectiveUnsubStatutory).toBe(2000);
    expect(snapped.effectiveCombinedLimit).toBe(5500);
    expect(snapped.subBaseline).toBe(3500);
    expect(snapped.unsubBaseline).toBe(2000);
  });
});

describe("SOR engine - partial-entry disbursement bug (regression)", () => {
  function threeTermDep(): ReturnType<typeof defaultInputs> {
    const inp = defaultInputs();
    inp.viewMode = "disbursement";
    inp.gradeLevel = "g1";
    inp.dependency = "dependent";
    inp.overrideLimits = false;
    inp.annualNeed = 2000;
    inp.numStandardTerms = 3;
    inp.ayFtCredits = 36;
    (["term1", "term2", "term3"] as TermKey[]).forEach((k) => {
      inp.terms[k] = {
        ...inp.terms[k],
        enabled: true,
        ftCredits: 12,
        enrolledCredits: 12,
      };
    });
    return inp;
  }

  it("Paid Sub entered first does NOT force Unsub to 0 in the same term", () => {
    const inp = threeTermDep();
    // User has typed Paid Sub for Fall but has NOT touched Paid Unsub yet
    // (still null = blank). The engine must not interpret blank as $0.
    inp.terms.term1 = { ...inp.terms.term1, paidSub: 666 };
    const r = calculateSOR(inp);
    const fall = r.termResults.find((t) => t.key === "term1")!;
    const spring = r.termResults.find((t) => t.key === "term2")!;
    const t3 = r.termResults.find((t) => t.key === "term3")!;
    // Fall Sub is anchored at 666
    expect(fall.finalSub).toBe(666);
    // Fall Unsub must keep its planned share - NOT zero
    expect(fall.finalUnsub).toBeGreaterThan(0);
    // The Unsub pool must NOT have been entirely pushed into Spring + Term3
    // (the bug symptom was 0 / 1750 / 1750 for a $3,500 Unsub pool).
    expect(spring.finalUnsub).toBeLessThan(1750);
    expect(t3.finalUnsub).toBeLessThan(1750);
  });

  it("Explicit Paid Unsub = 0 (not blank) DOES anchor and redistribute", () => {
    const inp = threeTermDep();
    inp.terms.term1 = {
      ...inp.terms.term1,
      paidSub: 666,
      paidUnsub: 0, // EXPLICIT zero - user committed to no Unsub this term
    };
    const r = calculateSOR(inp);
    const fall = r.termResults.find((t) => t.key === "term1")!;
    const spring = r.termResults.find((t) => t.key === "term2")!;
    const t3 = r.termResults.find((t) => t.key === "term3")!;
    expect(fall.finalSub).toBe(666);
    expect(fall.finalUnsub).toBe(0);
    // The full Unsub pool now flows to Spring + Term3
    expect(spring.finalUnsub + t3.finalUnsub).toBe(r.reducedUnsub);
  });

  it("Symmetry: Paid Unsub entered first does NOT force Sub to 0", () => {
    const inp = threeTermDep();
    inp.terms.term1 = { ...inp.terms.term1, paidUnsub: 1166 };
    const r = calculateSOR(inp);
    const fall = r.termResults.find((t) => t.key === "term1")!;
    expect(fall.finalUnsub).toBe(1166);
    expect(fall.finalSub).toBeGreaterThan(0);
  });

  it("Both buckets explicitly committed: term anchors as expected", () => {
    const inp = threeTermDep();
    inp.terms.term1 = {
      ...inp.terms.term1,
      paidSub: 666,
      paidUnsub: 1166,
    };
    const r = calculateSOR(inp);
    const fall = r.termResults.find((t) => t.key === "term1")!;
    expect(fall.finalSub).toBe(666);
    expect(fall.finalUnsub).toBe(1166);
  });
});

describe("SOR engine - v19 Grad PLUS bucket", () => {
  function gradTwoTerm(opts: Partial<ReturnType<typeof defaultInputs>> = {}) {
    const inp = defaultInputs();
    inp.gradeLevel = "g8";
    inp.dependency = "independent";
    inp.numStandardTerms = 2;
    inp.ayFtCredits = 18;
    inp.annualNeed = 20500;
    inp.coa = 40000;
    inp.otherAid = 5000;
    inp.requestedGradPlus = 15000;
    inp.terms.term1 = { ...inp.terms.term1, enabled: true, ftCredits: 9, enrolledCredits: 9 };
    inp.terms.term2 = { ...inp.terms.term2, enabled: true, ftCredits: 9, enrolledCredits: 9 };
    Object.assign(inp, opts);
    return inp;
  }

  it("Scenario 6 - Basic Grad PLUS, grandfathered, full-time", () => {
    const inp = gradTwoTerm({ loanLimitException: true });
    const r = calculateSOR(inp);
    expect(r.subBaseline).toBe(0);
    expect(r.unsubBaseline).toBe(20500);
    // initialGradPlus = MIN(15000, 40000-5000-0-20500) = MIN(15000, 14500) = 14500
    expect(r.initialGradPlus).toBe(14500);
    expect(r.sorPctRounded).toBe(1);
    expect(r.reducedGradPlus).toBe(14500);
    // Equal split, two terms
    const t1 = r.termResults.find((t) => t.key === "term1")!;
    const t2 = r.termResults.find((t) => t.key === "term2")!;
    expect(t1.finalGradPlus + t2.finalGradPlus).toBe(14500);
  });

  it("Scenario 8 - LLE = false (non-grandfathered) zeros Grad PLUS for 2026-27 public scope", () => {
    const grandfathered = calculateSOR(gradTwoTerm({ loanLimitException: true }));
    const nonGrandfathered = calculateSOR(gradTwoTerm({ loanLimitException: false }));
    expect(grandfathered.initialGradPlus).toBeGreaterThan(0);
    expect(nonGrandfathered.initialGradPlus).toBe(0);
    expect(nonGrandfathered.reducedGradPlus).toBe(0);
    expect(nonGrandfathered.warnings.some((w) => w.includes("Grad PLUS is not calculated"))).toBe(
      true,
    );
  });

  it("Scenario 9 - Undergrad with Requested Grad PLUS = $5,000 returns 0", () => {
    const inp = defaultInputs();
    inp.gradeLevel = "g2";
    inp.dependency = "dependent";
    inp.coa = 25000;
    inp.otherAid = 1000;
    inp.requestedGradPlus = 5000;
    inp.terms.term1 = { ...inp.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: 12 };
    inp.terms.term2 = { ...inp.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: 12 };
    const r = calculateSOR(inp);
    expect(r.initialGradPlus).toBe(0);
    expect(r.reducedGradPlus).toBe(0);
  });

  it("Scenario 7 - Grad PLUS with SOR reduction (78%)", () => {
    const inp = gradTwoTerm({ loanLimitException: true });
    // Term 2 at 5 credits → AY% = (9+5)/18 = 77.78 → 78
    inp.terms.term2 = { ...inp.terms.term2, enrolledCredits: 5 };
    const r = calculateSOR(inp);
    expect(Math.round(r.sorPctRounded * 100)).toBe(78);
    // 78% × 14500 = 11310
    expect(r.reducedGradPlus).toBe(11310);
  });
});

describe("SOR engine - v19 Award Year gate", () => {
  it("AY 2025-26 disables SOR - reduced limits = baselines", () => {
    const inp = defaultInputs();
    inp.awardYear = "2025-26";
    inp.gradeLevel = "g1";
    inp.dependency = "dependent";
    inp.annualNeed = 5500;
    inp.numStandardTerms = 2;
    inp.ayFtCredits = 24;
    // Half-time enrollment that would normally cause a reduction
    inp.terms.term1 = { ...inp.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: 6 };
    inp.terms.term2 = { ...inp.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: 9 };
    const r = calculateSOR(inp);
    expect(r.sorApplicable).toBe(false);
    // No SOR reduction → reduced = baseline (3500 / 2000)
    expect(r.reducedSub).toBe(3500);
    expect(r.reducedUnsub).toBe(2000);
  });

  it("AY 2026-27 (default) applies SOR normally", () => {
    const inp = defaultInputs();
    inp.gradeLevel = "g1";
    inp.dependency = "dependent";
    inp.annualNeed = 5500;
    inp.numStandardTerms = 2;
    inp.ayFtCredits = 24;
    inp.terms.term1 = { ...inp.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: 6 };
    inp.terms.term2 = { ...inp.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: 9 };
    const r = calculateSOR(inp);
    expect(r.sorApplicable).toBe(true);
    // SOR% = 63 → 3500 × 0.63 = 2205
    expect(r.reducedSub).toBe(2205);
  });
});

describe("SOR engine - Jennifer-scope regressions", () => {
  function profTwoTerm(grade: "g8" | "g9" | "g10" | "g11" | "g12" | "g13") {
    const inp = defaultInputs();
    inp.awardYear = "2026-27";
    inp.gradeLevel = grade;
    inp.dependency = "independent";
    inp.numStandardTerms = 2;
    inp.ayFtCredits = 18;
    inp.annualNeed = 100000;
    inp.coa = 80000;
    inp.otherAid = 0;
    inp.requestedGradPlus = 10000;
    inp.terms.term1 = { ...inp.terms.term1, enabled: true, ftCredits: 9, enrolledCredits: 9 };
    inp.terms.term2 = { ...inp.terms.term2, enabled: true, ftCredits: 9, enrolledCredits: 9 };
    return inp;
  }

  it("dependent undergrad canonical SOR is unchanged (g1, half-time term1)", () => {
    const inp = defaultInputs();
    inp.awardYear = "2026-27";
    inp.gradeLevel = "g1";
    inp.dependency = "dependent";
    inp.annualNeed = 5500;
    inp.numStandardTerms = 2;
    inp.ayFtCredits = 24;
    inp.terms.term1 = { ...inp.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: 6 };
    inp.terms.term2 = { ...inp.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: 9 };
    const r = calculateSOR(inp);
    expect(r.sorApplicable).toBe(true);
    expect(r.reducedSub).toBe(2205); // 3500 × 0.63
  });

  it("2026-27 professional code 10 non-LLE uses $50,000 combined (DLUN cap)", () => {
    const inp = profTwoTerm("g10");
    inp.loanLimitException = false;
    const r = calculateSOR(inp);
    expect(r.subBaseline).toBe(0);
    expect(r.unsubBaseline).toBe(50000);
    expect(r.effectiveCombinedLimit).toBe(50000);
  });

  it("2026-27 professional code 10 with LLE uses legacy $20,500", () => {
    const inp = profTwoTerm("g10");
    inp.loanLimitException = true;
    const r = calculateSOR(inp);
    expect(r.unsubBaseline).toBe(20500);
    expect(r.effectiveCombinedLimit).toBe(20500);
  });

  it("2026-27 graduate codes 8/9/12 keep $20,500 combined", () => {
    for (const g of ["g8", "g9", "g12"] as const) {
      const inp = profTwoTerm(g);
      inp.loanLimitException = false;
      const r = calculateSOR(inp);
      expect(r.unsubBaseline, `${g} unsub baseline`).toBe(20500);
    }
  });

  it("2026-27 non-LLE Grad PLUS returns $0 with NSLDS warning", () => {
    const inp = profTwoTerm("g10");
    inp.loanLimitException = false;
    inp.requestedGradPlus = 25000;
    const r = calculateSOR(inp);
    expect(r.initialGradPlus).toBe(0);
    expect(r.reducedGradPlus).toBe(0);
    expect(r.totalFinalGradPlus).toBe(0);
    expect(r.remainingGradPlus).toBe(0);
    expect(r.warnings.some((w) => w.includes("Grad PLUS is not calculated"))).toBe(true);
  });

  it("LLE Grad PLUS preview still calculates and emits NSLDS-not-modeled warning", () => {
    const inp = profTwoTerm("g10");
    inp.loanLimitException = true;
    inp.requestedGradPlus = 25000;
    const r = calculateSOR(inp);
    expect(r.initialGradPlus).toBeGreaterThan(0);
    expect(r.reducedGradPlus).toBeGreaterThan(0);
    expect(
      r.warnings.some((w) => w.includes("aggregate") || w.includes("lifetime")),
    ).toBe(true);
  });
});
