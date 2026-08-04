import { describe, expect, it } from "vitest";
import { defaultInputs } from "./sor";
import { CalculateV2InputSchema, normalizeV2Input, toV2Warnings } from "./sor-v2-contract";

describe("V2 contract normalization", () => {
  it("preserves explicit structured fields and discloses fields not modeled by the engine", () => {
    const input = CalculateV2InputSchema.parse({
      ...defaultInputs(),
      parentPlusEligibilityBasis: "adverseCreditDenied",
      parentPlusAggregateUsed: 12000,
      requestedSub: 2000,
      requestedUnsub: null,
      preSorCaps: { enabled: true, sub: 2500, unsub: null, gradPlus: null },
      remainingAggregateCombined: 50000,
    });

    const normalized = normalizeV2Input(input);

    expect(normalized.structured.parentPlusAggregateUsed).toBe(12000);
    expect(normalized.engineInput.parentPlusDenied).toBe(true);
    expect(normalized.externalChecks).toEqual([
      "Parent PLUS aggregate room and exception treatment must be verified against NSLDS or the institution's authoritative record.",
      "Optional pre-SOR Sub, Unsubsidized, and Grad PLUS caps are reported but are not applied by this shared engine version.",
      "Borrower-requested Sub and Unsubsidized amounts are reported but are not applied by this shared engine version.",
      "Remaining annual and aggregate limits are caller-supplied review inputs and are not derived by this SOR engine.",
    ]);
  });

  it("maps a positive verified AY override and preserves zero as the derived path", () => {
    const positive = normalizeV2Input(
      CalculateV2InputSchema.parse({
        ...defaultInputs(),
        ayDenominatorOverride: 30,
      }),
    );
    expect(positive.engineInput.ayFtCredits).toBe(30);
    expect(positive.engineInput.ayDenominatorVerified).toBe(true);

    const zero = normalizeV2Input(
      CalculateV2InputSchema.parse({
        ...defaultInputs(),
        ayDenominatorOverride: 0,
      }),
    );
    expect(zero.engineInput.ayFtCredits).toBe(defaultInputs().ayFtCredits);
    expect(zero.warnings[0]).toContain("AY denominator override is zero");
    expect(zero.externalChecks).toContain(
      "Verify the derived AY denominator against the institution's published academic-year definition.",
    );
  });

  it("turns structured proration into the legacy engine flag and flags conflicts", () => {
    const normalized = normalizeV2Input(
      CalculateV2InputSchema.parse({
        ...defaultInputs(),
        traditionalProrationApplies: false,
        traditionalProrationStatus: "shortProgram",
      }),
    );
    expect(normalized.engineInput.traditionalProrationApplies).toBe(true);
    expect(normalized.warnings).toContain(
      "Traditional proration fields conflict. Resolve the structured status before relying on the result.",
    );
  });

  it("does not broaden a non-denial Parent PLUS basis into the legacy denial uplift", () => {
    const normalized = normalizeV2Input(
      CalculateV2InputSchema.parse({
        ...defaultInputs(),
        parentPlusEligibilityBasis: "documentedExceptionalCircumstances",
        parentPlusAggregateUsed: 0,
      }),
    );
    expect(normalized.engineInput.parentPlusDenied).toBe(false);
    expect(normalized.externalChecks).toContain(
      "Parent PLUS aggregate room and exception treatment must be verified against NSLDS or the institution's authoritative record.",
    );
  });

  it("emits stable warning objects without duplicating messages", () => {
    const warnings = toV2Warnings(
      ["Review: Proportional is not used because SOR is not reducing the current loan."],
      ["Review: Proportional is not used because SOR is not reducing the current loan."],
    );
    expect(warnings).toEqual([
      {
        id: "EFFECTIVE_EQUAL_NO_CURRENT_SOR",
        severity: "review",
        message: "Review: Proportional is not used because SOR is not reducing the current loan.",
      },
    ]);
  });
});
