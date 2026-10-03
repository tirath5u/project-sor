import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateSOR, defaultInputs } from "@/lib/sor";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ResultsPanel } from "./ResultsPanel";
import { StepWalkthrough } from "./StepWalkthrough";

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
});
