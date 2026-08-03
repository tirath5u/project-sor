import { describe, expect, it } from "vitest";
import { CalculateV2InputSchema } from "@/lib/sor-v2-contract";
import { compareCanonicalRuns, runCanonicalV2 } from "@/lib/phase-b";
import { defaultInputs } from "@/lib/sor";

function validInput() {
  const base = defaultInputs();
  return CalculateV2InputSchema.parse(base);
}

describe("Phase B canonical comparison", () => {
  it("compares two independent engine runs without changing the engine result", () => {
    const left = validInput();
    const right = { ...left, distributionModel: "proportional" as const };
    const leftRun = runCanonicalV2(left);
    const rightRun = runCanonicalV2(right);
    const comparison = compareCanonicalRuns(leftRun, rightRun);

    expect(comparison.fields.reducedSub.left).toBe(leftRun.data.reducedSub);
    expect(comparison.fields.reducedSub.right).toBe(rightRun.data.reducedSub);
    expect(comparison.authoritativeChanged).toBe(false);
  });

  it("keeps unresolved structured inputs non-authoritative", () => {
    const input = CalculateV2InputSchema.parse({
      ...defaultInputs(),
      parentPlusEligibilityBasis: "documentedExceptionalCircumstances",
    });
    const run = runCanonicalV2(input);

    expect(run.authoritative).toBe(false);
    expect(run.normalized.externalChecks.length).toBeGreaterThan(0);
    expect(run.data.reducedSub).toEqual(expect.any(Number));
  });
});

