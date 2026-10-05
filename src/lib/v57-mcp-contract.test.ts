import { describe, expect, it } from "vitest";
import calculateSorTool from "./mcp/tools/calculate-sor";
import advancedStudentTool from "./mcp/tools/advanced-student-estimate";
import compareSorTool from "./mcp/tools/compare-sor";
import { defaultInputs } from "./sor";

async function call(input: unknown, tool: unknown = calculateSorTool): Promise<Record<string, unknown>> {
  const handler = (tool as unknown as {
    handler: (value: unknown) => Promise<{ structuredContent: Record<string, unknown> }>;
  }).handler;
  const result = await handler(input);
  return result.structuredContent;
}

describe("V57 MCP calculation contract", () => {
  it("asks which term a one-term loan covers without redefining the academic year", async () => {
    const input = defaultInputs();
    input.numStandardTerms = 2;
    input.terms.term3.enabled = false;
    input.loanPeriodScope = "singleTerm";
    const result = await call(input);
    expect(result.status).toBe("needs_input");
    expect(result.canCalculate).toBe(false);
    expect((result.missingInputs as Array<{ field: string }>).map((item) => item.field))
      .toContain("singleTermPaymentPeriod");
  });

  it("matches the selected spring-only half-annual result", async () => {
    const input = defaultInputs();
    input.numStandardTerms = 2;
    input.terms.term3.enabled = false;
    input.loanPeriodScope = "singleTerm";
    input.singleTermPaymentPeriod = "term2";
    input.terms.term2.enrolledCredits = 9;
    const result = await call(input);
    const data = result.data as Record<string, unknown>;
    expect(result.status).toBe("calculated");
    expect(data.sorPctRounded).toBe(0.75);
    expect(data.reducedSub).toBe(1313);
    expect((data.termResults as Array<{ key: string }>).map((item) => item.key)).toEqual(["term2"]);
  });

  it("asks for the Parent PLUS aggregate instead of awarding an unverified uplift", async () => {
    const input = defaultInputs();
    input.parentPlusDenied = true;
    const result = await call(input);
    expect(result.status).toBe("needs_input");
    expect((result.missingInputs as Array<{ field: string }>).map((item) => item.field))
      .toContain("parentPlusAggregateUsed");
  });

  it("blocks an unresolved subscription calendar from an authoritative result", async () => {
    const input = defaultInputs();
    input.calType = 4;
    input.calendarCategory = "subscription";
    const result = await call(input);
    expect(result.status).toBe("blocked");
    expect(result.canCalculate).toBe(false);
    expect(result.data).toBeUndefined();
  });

  it("asks for review instead of returning an unresolved two-term residual split", async () => {
    const input = defaultInputs();
    input.numStandardTerms = 2;
    input.ayFtCredits = 24;
    input.terms.term3.enabled = false;
    input.terms.term1.enrolledCredits = 8;
    const result = await call(input);
    expect(result.status).toBe("review_required");
    expect(result.canCalculate).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      expect.stringContaining("residual dollar"),
    ]));
  });

  it("asks for review when single-term history is supplied", async () => {
    const input = defaultInputs();
    input.loanPeriodScope = "singleTerm";
    input.singleTermPaymentPeriod = "term2";
    input.terms.term1.paidSub = 100;
    const result = await call(input);
    expect(result.status).toBe("review_required");
    expect(result.data).toBeUndefined();
  });

  it("does not echo the caller's full input while asking for missing facts", async () => {
    const input = { ...defaultInputs(), ayFtCredits: undefined };
    const result = await call(input);
    expect(result.status).toBe("needs_input");
    expect(result.normalizedInputState).toBeUndefined();
  });

  it("does not echo a caller-provided free-text term label", async () => {
    const input = defaultInputs();
    input.terms.term1.label = "private student label";
    const result = await call({ ...input, detailLevel: "detailed" });
    expect(result.status).toBe("calculated");
    expect(JSON.stringify(result)).not.toContain("private student label");
  });

  it("holds the same unresolved split in the advanced student tool", async () => {
    const input = defaultInputs();
    input.numStandardTerms = 2;
    input.ayFtCredits = 24;
    input.terms.term3.enabled = false;
    input.terms.term1.enrolledCredits = 8;
    const result = await call({ input, resultDetail: "summary" }, advancedStudentTool);
    expect(result.status).toBe("review_required");
    expect(result.estimate).toBeUndefined();
    expect(result.data).toBeUndefined();
  });

  it("does not compare a held split with a supported scenario", async () => {
    const left = defaultInputs();
    left.numStandardTerms = 2;
    left.ayFtCredits = 24;
    left.terms.term3.enabled = false;
    left.terms.term1.enrolledCredits = 8;
    const result = await call({ left, right: defaultInputs() }, compareSorTool);
    expect(result.status).toBe("review_required");
    expect(result.comparison).toBeUndefined();
    expect(result.reviewReasons).toEqual(expect.arrayContaining([
      expect.stringContaining("Left: The placement of a residual dollar"),
    ]));
  });

  it("asks for credits in a selected optional payment period", async () => {
    const input = defaultInputs();
    input.includeSummer1 = true;
    input.terms.summer1.enabled = true;
    input.loanPeriodScope = "singleTerm";
    input.singleTermPaymentPeriod = "summer1";
    const request = { ...input, terms: { ...input.terms, summer1: { enabled: true } } };
    const result = await call(request);
    expect(result.status).toBe("needs_input");
    expect((result.missingInputs as Array<{ field: string }>).map((item) => item.field))
      .toEqual(expect.arrayContaining(["terms.summer1.ftCredits", "terms.summer1.enrolledCredits"]));
  });
});
