import { describe, expect, it } from "vitest";
import { allocateChildTerms } from "./child-terms";
import { calculateSOR, defaultInputs } from "./sor";

function baseResults() {
  const input = defaultInputs();
  input.numStandardTerms = 2;
  input.ayFtCredits = 24;
  input.terms.term1.enabled = true;
  input.terms.term1.enrolledCredits = 9;
  input.terms.term2.enabled = true;
  input.terms.term2.enrolledCredits = 12;
  input.terms.term3.enabled = false;
  input.annualNeed = 3080;
  input.subStatutory = 3080;
  input.unsubStatutory = 0;
  return { input, results: calculateSOR(input) };
}

describe("v55 child allocation", () => {
  it("splits each parent payout equally across credited children", () => {
    const { input, results } = baseResults();
    const allocated = allocateChildTerms(results, {
      count: 2,
      allocationMethod: "equalAcrossActiveChildTerms",
      parents: {
        term1: [{ credits: 3 }, { credits: 6 }],
        term2: [{ credits: 6 }, { credits: 6 }],
      },
    });
    const term1 = allocated.rows.filter((row) => row.parentTerm === "term1");
    const expectedParent = results.termResults.find((term) => term.key === "term1")?.finalSub ?? 0;
    expect(term1.map((row) => row.scheduledGross.sub)).toEqual([
      Math.floor(expectedParent / 2),
      expectedParent - Math.floor(expectedParent / 2),
    ]);
    expect(input.feeSubUnsubPercent).toBe(1.057);
  });

  it("excludes zero-credit children from equal allocation", () => {
    const { results } = baseResults();
    const allocated = allocateChildTerms(results, {
      count: 2,
      allocationMethod: "equalAcrossActiveChildTerms",
      parents: { term1: [{ credits: 9 }, { credits: 0 }] },
    });
    const term1 = allocated.rows.filter((row) => row.parentTerm === "term1");
    expect(term1.map((row) => row.scheduledGross.sub)).toEqual([
      results.termResults.find((term) => term.key === "term1")?.finalSub ?? 0,
      0,
    ]);
    expect(allocated.warnings.some((warning) => warning.includes("zero-credit"))).toBe(true);
  });

  it("locks a paid child and routes the remaining parent pool to the unpaid child", () => {
    const { results } = baseResults();
    const allocated = allocateChildTerms(results, {
      count: 2,
      allocationMethod: "byChildCredits",
      parents: { term1: [{ credits: 6, paidGross: { sub: 875 } }, { credits: 3 }] },
    });
    const term1 = allocated.rows.filter((row) => row.parentTerm === "term1");
    expect(term1[0].scheduledGross.sub).toBe(875);
    expect(term1[1].scheduledGross.sub).toBeGreaterThanOrEqual(0);
    expect(term1[0].review).toBe("Remaining payable");
  });
});
