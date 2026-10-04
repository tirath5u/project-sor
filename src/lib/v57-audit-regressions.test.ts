import { describe, expect, it } from "vitest";
import { defaultInputs, calculateSOR, roundDollarHalfUp, type TermKey } from "./sor";
import { CalculateV2InputSchema } from "./sor-v2-contract";
import { handleCalculateRequest } from "./api-calculate";
import calculateSorTool from "./mcp/tools/calculate-sor";
import advancedStudentTool from "./mcp/tools/advanced-student-estimate";
import { spec } from "@/routes/api/public/v2/openapi[.]json";
import parityFixtures from "../../fixtures/v57-audit-parity.json";

function base() {
  const input = defaultInputs();
  input.numStandardTerms = 2;
  input.terms.term3.enabled = false;
  input.ayFtCredits = 0;
  input.gradeLevel = "g1";
  input.dependency = "dependent";
  input.annualNeed = 10000;
  input.coa = 30000;
  input.otherAid = 0;
  return input;
}

async function rest(input: unknown, version: "v1" | "v2") {
  const response = await handleCalculateRequest(new Request(`http://localhost/api/public/${version}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }), version);
  return { status: response.status, body: await response.json() as Record<string, unknown> };
}

async function toolCall(tool: unknown, input: unknown) {
  const handler = (tool as { handler: (value: unknown) => Promise<{ structuredContent: Record<string, unknown> }> }).handler;
  return (await handler(input)).structuredContent;
}

describe("V57 independent-audit regressions", () => {
  it.each(parityFixtures)("shares the ordered $id oracle across engine, REST v1/v2, and MCP", async (fixture) => {
    const input = base();
    Object.assign(input, fixture.input);
    for (const [key, values] of Object.entries(fixture.terms)) {
      Object.assign(input.terms[key as TermKey], values);
    }
    const expected = fixture.expected;
    const project = (data: Record<string, unknown>) => {
      const terms = data.termResults as Array<{ key: string; finalSub: number; finalUnsub: number }>;
      return {
        sorPercent: Math.round((data.sorPctRounded as number) * 100),
        sub: data.reducedSub,
        unsub: data.reducedUnsub,
        termSub: ["term1", "term2"].map((key) => terms.find((term) => term.key === key)?.finalSub ?? 0),
        termUnsub: ["term1", "term2"].map((key) => terms.find((term) => term.key === key)?.finalUnsub ?? 0),
      };
    };
    expect(project(calculateSOR(input) as unknown as Record<string, unknown>)).toEqual(expected);
    for (const version of ["v1", "v2"] as const) {
      const response = await rest(input, version);
      expect(response.status).toBe(200);
      expect(project(response.body.data as Record<string, unknown>)).toEqual(expected);
      if (version === "v2") {
        expect((response.body.contract as { authoritative: boolean }).authoritative).toBe(true);
      }
    }
    const mcp = await toolCall(calculateSorTool, { ...input, detailLevel: "detailed" });
    expect(mcp.status).toBe("calculated");
    expect(project(mcp.data as Record<string, unknown>)).toEqual(expected);
    expect((mcp.contract as { authoritative: boolean }).authoritative).toBe(true);
  });

  it("matches exact integer arithmetic at every whole-dollar and percent half boundary", () => {
    const mismatches: Array<[number, number, number, number]> = [];
    for (let baseAmount = 1; baseAmount <= 10000; baseAmount++) {
      for (let percent = 1; percent <= 99; percent++) {
        const exact = Math.floor((baseAmount * percent + 50) / 100);
        const actual = roundDollarHalfUp(baseAmount * percent / 100);
        if (actual !== exact) mismatches.push([baseAmount, percent, exact, actual]);
      }
    }
    expect(mismatches).toEqual([]);
  });
  it("rounds the 57 percent half-dollar selected-term result like Excel", () => {
    const input = base();
    input.loanPeriodScope = "singleTerm";
    input.singleTermPaymentPeriod = "term2";
    input.terms.term2.ftCredits = 15;
    input.terms.term2.enrolledCredits = 8.5;
    const result = calculateSOR(input);
    expect(result.sorPctRounded).toBe(0.57);
    expect(result.reducedSub).toBe(998);
    expect(result.termResults.find((term) => term.key === "term2")?.finalSub).toBe(998);
  });

  it("rounds the annual half-dollar case to 998 without choosing the open residual policy", () => {
    const input = base();
    input.numStandardTerms = 3;
    input.terms.term3.enabled = true;
    input.terms.term2.enrolledCredits = 8.5;
    input.terms.term3.enrolledCredits = 0;
    input.annualNeed = 1750;
    const result = calculateSOR(input);
    expect(result.sorPctRounded).toBe(0.57);
    expect(result.reducedSub).toBe(998);
    expect(result.termResults.reduce((sum, term) => sum + term.finalSub, 0)).toBe(998);
  });

  it("rejects noncompliant public LTHT and double-reduction switches", () => {
    expect(CalculateV2InputSchema.safeParse({ ...base(), countLthtInAyPct: false }).success).toBe(false);
    expect(CalculateV2InputSchema.safeParse({ ...base(), applyDoubleReduction: true }).success).toBe(false);
    expect(() => calculateSOR({ ...base(), countLthtInAyPct: false })).toThrow("Unsupported SOR policy toggle");
  });

  it("uses actual paid-term credits to select the effective distribution model", () => {
    const input = base();
    input.numStandardTerms = 3;
    input.terms.term3.enabled = true;
    input.viewMode = "disbursement";
    input.terms.term1.disbursed = true;
    input.terms.term1.actualCredits = 6;
    input.terms.term1.paidSub = 1750;
    input.distributionModel = "proportional";
    const result = calculateSOR(input);
    expect(result.sorPctRounded).toBe(0.83);
    expect(result.currentSorReduction).toBe(true);
    expect(result.effectiveDistributionModel).toBe("proportional");
    expect(result.warnings.join(" ")).not.toContain("Proportional is not used");
  });

  it("accepts a request containing exactly the OpenAPI-required fields", async () => {
    const input = base() as unknown as Record<string, unknown>;
    const schema = spec.components.schemas.CalculateInput as {
      required: string[];
      properties: Record<string, unknown>;
    };
    const termSchema = spec.components.schemas.CalculateInput.properties.terms as {
      properties: Record<string, { required: string[] }>;
    };
    const terms = Object.fromEntries(Object.entries(input.terms as Record<string, Record<string, unknown>>)
      .map(([key, term]) => [key, Object.fromEntries(termSchema.properties[key].required.map((field) => [field, term[field]]))]));
    const documented = Object.fromEntries(schema.required.map((field) => [field, field === "terms" ? terms : input[field]]));
    const parsed = CalculateV2InputSchema.safeParse(documented);
    expect(parsed.success, parsed.success ? "" : JSON.stringify(parsed.error.issues)).toBe(true);
    expect(Object.keys(CalculateV2InputSchema.shape).filter((field) => !(field in schema.properties))).toEqual([]);
    expect((await rest(documented, "v2")).status).toBe(200);
  });

  it.each([
    ["calendarCategory", (input: ReturnType<typeof base>) => { input.calType = 4; delete input.calendarCategory; }],
    ["terms.term1.actualCredits", (input: ReturnType<typeof base>) => { input.viewMode = "disbursement"; input.terms.term1.disbursed = true; input.terms.term1.paidSub = 1750; input.terms.term1.actualCredits = null; }],
    ["parentPlusAggregateUsed", (input: ReturnType<typeof base>) => { input.parentPlusDenied = true; input.parentPlusAggregateUsed = null; }],
    ["singleTermPaymentPeriod", (input: ReturnType<typeof base>) => { input.loanPeriodScope = "singleTerm"; delete input.singleTermPaymentPeriod; }],
  ])("v1 and v2 both ask for missing %s", async (field, change) => {
    const input = base();
    change(input);
    const v1 = await rest(input, "v1");
    const v2 = await rest(input, "v2");
    expect(v1.status).toBe(422);
    expect(v2.status).toBe(422);
    expect(v1.body.status).toBe("needs_input");
    expect(v2.body.status).toBe("needs_input");
    expect((v1.body.missingInputs as Array<{ field: string }>).map((item) => item.field)).toContain(field);
  });

  it("MCP asks for the program calendar before calculating", async () => {
    const input = base();
    delete input.calendarCategory;
    const missing = await toolCall(calculateSorTool, input);
    expect(missing.status).toBe("needs_input");
    expect((missing.missingInputs as Array<{ field: string }>).map((item) => item.field)).toContain("calendarCategory");
    const subscription = { ...input, calType: undefined, calendarCategory: "subscription" };
    const blocked = await toolCall(calculateSorTool, subscription);
    expect(blocked.status).toBe("blocked");
    expect((blocked.contract as { authoritative: boolean }).authoritative).toBe(false);
  });

  it("MCP labels a single-term student estimate by its loan-period scope", async () => {
    const input = base();
    input.loanPeriodScope = "singleTerm";
    input.singleTermPaymentPeriod = "term2";
    input.terms.term2.enrolledCredits = 9;
    const result = await toolCall(advancedStudentTool, { input, resultDetail: "summary" });
    const estimate = result.estimate as Record<string, unknown>;
    expect(estimate.amountScope).toBe("singleTermLoanPeriod");
    expect(estimate.estimatedLoanPeriodSub).toBe(1313);
    expect(estimate.estimatedLoanPeriodTotal).toBe(2063);
    expect(estimate).not.toHaveProperty("estimatedAnnualSub");
  });
});
