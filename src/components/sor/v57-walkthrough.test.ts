import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateSOR, defaultInputs } from "@/lib/sor";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResultsPanel } from "./ResultsPanel";
import { StepWalkthrough } from "./StepWalkthrough";
import { pdfAllocationLines } from "@/lib/pdfExport";

describe("V57 single-term explanation", () => {
  it("applies the selected-period percentage once in the visible walkthrough", () => {
    const inputs = defaultInputs();
    inputs.numStandardTerms = 2;
    inputs.terms.term3.enabled = false;
    inputs.loanPeriodScope = "singleTerm";
    inputs.singleTermPaymentPeriod = "term2";
    inputs.terms.term2.enrolledCredits = 9;

    const results = calculateSOR(inputs);
    const walkthrough = renderToStaticMarkup(createElement(TooltipProvider, null,
      createElement(StepWalkthrough, { inputs, results })));
    const resultPanel = renderToStaticMarkup(createElement(TooltipProvider, null,
      createElement(ResultsPanel, { inputs, results })));

    expect(results.reducedSub).toBe(1313);
    expect(walkthrough).toContain("applied once in Step 2");
    expect(walkthrough).toContain("No second SOR percentage or distribution model is applied");
    expect(walkthrough).not.toContain("$1,313 × 75%");
    expect(walkthrough).not.toContain("Equal model: pool");
    expect(resultPanel).toContain("selected-term credits");
    expect(resultPanel).not.toContain("9 / 12 AY credits");
  });

  it("does not claim a below-half-time single-term share forwards", () => {
    const inputs = defaultInputs();
    inputs.numStandardTerms = 2;
    inputs.terms.term3.enabled = false;
    inputs.loanPeriodScope = "singleTerm";
    inputs.singleTermPaymentPeriod = "term2";
    inputs.terms.term2.enrolledCredits = 4;

    const results = calculateSOR(inputs);
    const walkthrough = renderToStaticMarkup(createElement(TooltipProvider, null,
      createElement(StepWalkthrough, { inputs, results })));

    expect(results.termResults[0].finalSub).toBe(0);
    expect(walkthrough).toContain("No Direct Loan disbursement for the selected period");
    expect(walkthrough).not.toContain("share forwards to the next eligible term");
  });

  it("does not invent a second term-percentage multiplication for annual 4 plus 11", () => {
    const inputs = defaultInputs();
    inputs.numStandardTerms = 2;
    inputs.terms.term3.enabled = false;
    inputs.ayFtCredits = 0;
    inputs.terms.term1.enrolledCredits = 4;
    inputs.terms.term2.enrolledCredits = 11;
    const results = calculateSOR(inputs);
    const html = renderToStaticMarkup(createElement(TooltipProvider, null,
      createElement(StepWalkthrough, { inputs, results })));
    const pdf = pdfAllocationLines(results);
    expect(results.reducedSub).toBe(2205);
    expect(html).toContain("Sub share");
    expect(html).not.toContain("$2,205 × 92% = $2,205");
    expect(pdf.step5).not.toMatch(/\$2,205 x 92%/);
    expect(pdf.step5).toContain("not a second multiplier");
  });

  it("does not claim paid Fall amounts were multiplied by 50 percent in FAQ 17C", () => {
    const inputs = defaultInputs();
    inputs.numStandardTerms = 2;
    inputs.terms.term3.enabled = false;
    inputs.ayFtCredits = 0;
    inputs.viewMode = "disbursement";
    inputs.terms.term1.disbursed = true;
    inputs.terms.term1.actualCredits = 6;
    inputs.terms.term1.paidSub = 1750;
    inputs.terms.term1.paidUnsub = 1000;
    const results = calculateSOR(inputs);
    const html = renderToStaticMarkup(createElement(TooltipProvider, null,
      createElement(StepWalkthrough, { inputs, results })));
    expect(results.sorPctRounded).toBe(0.75);
    expect(html).not.toContain("$1,750 × 50% = $1,750");
    expect(pdfAllocationLines(results).step5).not.toContain("$1,750 x 50%");
  });

  it("keeps Equal and Proportional out of a single-term PDF explanation", () => {
    const inputs = defaultInputs();
    inputs.numStandardTerms = 2;
    inputs.terms.term3.enabled = false;
    inputs.loanPeriodScope = "singleTerm";
    inputs.singleTermPaymentPeriod = "term2";
    inputs.terms.term2.enrolledCredits = 9;
    const lines = pdfAllocationLines(calculateSOR(inputs));
    expect(lines.step3).toContain("No Equal or Proportional distribution");
    expect(lines.step5).not.toContain("$1,313 x 75%");
  });

  it("describes a three-term Proportional allocation without false equations", () => {
    const inputs = defaultInputs();
    inputs.distributionModel = "proportional";
    inputs.terms.term1.enrolledCredits = 6;
    const results = calculateSOR(inputs);
    const lines = pdfAllocationLines(results);
    expect(results.effectiveDistributionModel).toBe("proportional");
    expect(lines.step3).toContain("Proportional allocation");
    expect(lines.step5).not.toMatch(/\$[\d,]+ x \d+% =/);
  });
});
