import type { SORInputs, SORResults } from "@/lib/sor";
import type { V2Normalization } from "@/lib/sor-v2-contract";

export function publicReviewReasons(
  input: SORInputs,
  data: SORResults,
  normalized: V2Normalization,
): string[] {
  const reasons = [...normalized.externalChecks];
  const hasPaidHistory = Object.values(input.terms).some((term) =>
    (term.paidSub ?? 0) > 0 || (term.paidUnsub ?? 0) > 0 || (term.paidGradPlus ?? 0) > 0,
  );

  if (input.loanPeriodScope === "singleTerm" && hasPaidHistory) {
    reasons.push("Single-term paid history and a later disbursement need school review; this tool does not infer how prior payments belong to the selected loan period.");
  }
  if (input.loanPeriodScope === "annualMultiTerm"
    && input.viewMode === "plan"
    && !hasPaidHistory
    && data.termResults.filter((term) => term.eligible).length === 2
    && [data.reducedSub, data.reducedUnsub, data.reducedGradPlus]
      .some((value) => Number.isInteger(value) && value % 2 !== 0)) {
    reasons.push("The placement of a residual dollar across two payable terms is under review. Confirm the institution's disbursement allocation before using term amounts.");
  }

  return [...new Set(reasons)];
}
