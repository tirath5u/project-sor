import { describe, expect, it } from "vitest";
import calculateSorTool from "./mcp/tools/calculate-sor";
import { defaultInputs } from "./sor";

async function call(input: unknown): Promise<Record<string, unknown>> {
  const handler = (calculateSorTool as unknown as {
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
    expect((result.contract as { authoritative: boolean }).authoritative).toBe(false);
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
