import { describe, expect, it } from "vitest";
import { defaultInputs } from "./sor";
import { CalculateV2InputSchema, normalizeV2Input, toV2Warnings, v2PolicyDecision } from "./sor-v2-contract";
import { calculateSOR } from "./sor";

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
    expect(normalized.engineInput.parentPlusAggregateUsed).toBe(12000);
    expect(normalized.externalChecks).toEqual([
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
      "The documented exceptional-circumstances basis needs a school eligibility review; it is not treated as an adverse-credit denial.",
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

  it("keeps unrelated review IDs distinct and marks gross-versus-net notes informational", () => {
    const warnings = toV2Warnings([
      "A school review is required for this calendar.",
      "A school review is required for this paid history.",
      "SOR eligibility amounts are gross Direct Loan amounts, not net of loan fees.",
    ], []);
    expect(new Set(warnings.map((warning) => warning.id)).size).toBe(3);
    expect(warnings[2].severity).toBe("info");
  });

  it("reports both the selected and effective distribution model", () => {
    const input = defaultInputs();
    input.distributionModel = "proportional";
    const result = calculateSOR(input);
    const decision = v2PolicyDecision(result as unknown as Record<string, unknown>);
    expect(decision.selectedDistributionModel).toBe("proportional");
    expect(decision.effectiveDistributionModel).toBe("equal");
  });

  it("asks for the selected payment period rather than changing the academic-year count", () => {
    const input = defaultInputs();
    input.numStandardTerms = 2;
    input.terms.term3.enabled = false;
    input.loanPeriodScope = "singleTerm";
    const missing = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(missing.missingRequiredInputs.map((item) => item.field)).toContain("singleTermPaymentPeriod");
    input.singleTermPaymentPeriod = "term2";
    const complete = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(complete.missingRequiredInputs).toEqual([]);
  });

  it("requires verified Parent PLUS aggregate usage only for the applicable adverse-credit branch", () => {
    const input = defaultInputs();
    input.parentPlusDenied = true;
    let result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs.map((item) => item.field)).toContain("parentPlusAggregateUsed");
    input.parentPlusAggregateUsed = 65000;
    result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs).toEqual([]);
    input.parentPlusAggregateUsed = null;
    input.parentPlusDenied = false;
    result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs).toEqual([]);
  });

  it("requires actual paid-term credits before a later disbursement recalculation", () => {
    const input = defaultInputs();
    input.viewMode = "disbursement";
    input.terms.term1.disbursed = true;
    input.terms.term1.actualCredits = null;
    const result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs.map((item) => item.field)).toContain("terms.term1.actualCredits");
  });

  it("requires an explicit category for nonstandard codes and blocks unresolved categories", () => {
    const input = defaultInputs();
    input.calType = 4;
    input.calendarCategory = undefined;
    let result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs.map((item) => item.field)).toContain("calendarCategory");
    input.calendarCategory = "nontermCreditHour";
    result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs).toEqual([]);
    input.calendarCategory = "subscription";
    result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.blocked).toBe(true);
  });

  it("asks which calendar is correct when code and category disagree", () => {
    const input = defaultInputs();
    input.calType = 1;
    input.calendarCategory = "clockHour";
    let result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs.map((item) => item.field)).toContain("calendarCategory");
    input.calType = 3;
    input.calendarCategory = "nonstandardEqualNineWeeks";
    result = normalizeV2Input(CalculateV2InputSchema.parse(input));
    expect(result.missingRequiredInputs).toEqual([]);
  });
});
