import { describe, expect, it } from "vitest";
import { compareApprovedMigrationFixture, getApprovedMigrationFixtures } from "@/lib/migration";

describe("V55 to V56 migration comparison", () => {
  it("compares the approved Grad PLUS migration fixture without changing V56 authority", () => {
    const result = compareApprovedMigrationFixture("fixture-v19-007");

    expect(result?.v55.metrics.reducedGradPlus).toBe(11310);
    expect(result?.v56.metrics.reducedGradPlus).toBe(11700);
    expect(result?.changes.reducedGradPlus.delta).toBe(390);
    expect(result?.changedMetrics).toContain("reducedGradPlus");
    expect(result?.v56.authoritative).toBe(true);
    expect(result?.stateless).toBe(true);
  });

  it("rejects unapproved fixtures instead of inventing a V55 baseline", () => {
    expect(compareApprovedMigrationFixture("fixture-v56-child-equal-allocation")).toBeNull();
    expect(getApprovedMigrationFixtures()).toHaveLength(1);
  });
});
