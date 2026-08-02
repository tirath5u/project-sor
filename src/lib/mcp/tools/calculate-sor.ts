import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { calculateSORWithChildTerms, defaultInputs, TERM_ORDER, type SORInputs, type TermKey } from "@/lib/sor";
import { CalculateInputSchema } from "@/lib/sor.schema";
import { ENGINE_VERSION, MCP_VERSION, POLICY_YEAR, POLICY_SNAPSHOT_DATE, RELEASE_ID, SOURCE_COMMIT } from "@/lib/sor.version";

const TermPatchSchema = z.object({
  key: z.enum(["term1", "term2", "term3", "term4", "summer1", "summer2", "winter1", "winter2"]).optional(),
  label: z.string().optional(),
  enabled: z.boolean().optional(),
  ftCredits: z.number().min(0).max(60).optional(),
  enrolledCredits: z.number().min(0).max(60).optional(),
  disbursed: z.boolean().optional(),
  actualCredits: z.number().min(0).max(60).optional(),
  paidSub: z.number().nullable().optional(),
  paidUnsub: z.number().nullable().optional(),
  refundSub: z.number().nullable().optional(),
  refundUnsub: z.number().nullable().optional(),
  coaCapSub: z.number().min(0).optional(),
  coaCapUnsub: z.number().min(0).optional(),
  paidGradPlus: z.number().nullable().optional(),
  refundGradPlus: z.number().nullable().optional(),
  coaCapGradPlus: z.number().min(0).optional(),
}).strict();

const TermKeyEnum = z.enum(["term1", "term2", "term3", "term4", "summer1", "summer2", "winter1", "winter2"]);
const InputSchema = {
  awardYear: z.enum(["2025-26", "2026-27"]).optional(),
  loanLimitException: z.boolean().optional(),
  programLevel: z.enum(["undergraduate", "graduate"]).optional(),
  gradeLevel: z.string().optional(),
  dependency: z.enum(["dependent", "independent"]).optional(),
  parentPlusDenied: z.boolean().optional(),
  ayType: z.enum(["SAY", "BBAY1", "BBAY2"]).optional(),
  calType: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  summerPosition: z.enum(["none", "trailer", "header"]).optional(),
  loanPeriodScope: z.enum(["annualMultiTerm", "singleTerm"]).optional(),
  numStandardTerms: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  includeSummer1: z.boolean().optional(), includeSummer2: z.boolean().optional(),
  includeWinter1: z.boolean().optional(), includeWinter2: z.boolean().optional(),
  ayFtCredits: z.number().min(0).max(200).optional(),
  annualNeed: z.number().min(0).optional(),
  subStatutory: z.number().min(0).optional(), unsubStatutory: z.number().min(0).optional(),
  coa: z.number().min(0).optional(), otherAid: z.number().min(0).optional(), requestedGradPlus: z.number().min(0).optional(),
  overrideLimits: z.boolean().optional(), distributionModel: z.enum(["equal", "proportional"]).optional(),
  applySubUnsubShift: z.boolean().optional(), applyDoubleReduction: z.boolean().optional(), countLthtInAyPct: z.boolean().optional(),
  viewMode: z.enum(["plan", "disbursement"]).optional(),
  terms: z.record(TermKeyEnum, TermPatchSchema).optional(),
  childTerms: z.unknown().optional(), feeSubUnsubPercent: z.number().min(0).max(100).optional(), feeGradPlusPercent: z.number().min(0).max(100).optional(),
  traditionalProrationApplies: z.boolean().optional(), ayDenominatorVerified: z.boolean().optional(),
};

const RequiredField = z.object(InputSchema).passthrough();

const requiredFields: Array<{ field: string; label: string; reason: string; question: string }> = [
  { field: "awardYear", label: "Award Year", reason: "The SOR policy path is award-year specific.", question: "What Award Year is being evaluated?" },
  { field: "programLevel", label: "Program level", reason: "The loan-limit and eligibility path differs for undergraduate and graduate borrowers.", question: "Is this an undergraduate or graduate/professional borrower?" },
  { field: "gradeLevel", label: "Grade level", reason: "The initial annual Direct Loan limit depends on grade level.", question: "What grade-level code applies to the borrower?" },
  { field: "dependency", label: "Dependency status", reason: "Undergraduate annual limits depend on dependency status.", question: "Is the undergraduate borrower dependent or independent?" },
  { field: "loanPeriodScope", label: "Loan-period scope", reason: "Single-term and multi-term calculations have different starting points.", question: "Is this an annual/multi-term or Single-term loan period?" },
  { field: "ayType", label: "Academic-year type", reason: "The academic-year structure controls term scope.", question: "What academic-year type applies: SAY, BBAY1, or BBAY2?" },
  { field: "numStandardTerms", label: "Number of standard terms", reason: "The engine needs the active standard-term count.", question: "How many standard terms are in the evaluated loan period?" },
  { field: "ayFtCredits", label: "Full-time academic-year credits", reason: "The SOR percentage requires the institution's applicable denominator.", question: "What full-time credit denominator should be used for this academic year or loan period?" },
  { field: "annualNeed", label: "Annual financial need", reason: "Need can limit the initial maximum before SOR.", question: "What annual financial need should be used?" },
  { field: "coa", label: "Cost of attendance", reason: "COA can limit ordinary eligibility and is required for Grad PLUS sizing.", question: "What cost of attendance applies to the evaluated scope?" },
  { field: "otherAid", label: "Other financial assistance", reason: "OFA reduces the ordinary eligibility base.", question: "What other financial assistance must be subtracted?" },
  { field: "terms", label: "Term enrollment inputs", reason: "The SOR numerator and disbursement distribution require term-level credits.", question: "Please provide the active term enrollment and full-time credits." },
];

function isPresent(input: Record<string, unknown>, field: string) {
  const value = input[field];
  return value !== undefined && value !== null;
}

function getMissingInputs(input: Record<string, unknown>) {
  const missing = requiredFields.filter((item) => !isPresent(input, item.field));
  const terms = input.terms as Record<string, Record<string, unknown>> | undefined;
  const count = typeof input.numStandardTerms === "number" ? input.numStandardTerms : 0;
  if (terms && count > 0) {
    for (const key of (["term1", "term2", "term3", "term4"] as const).slice(0, count)) {
      const term = terms[key];
      if (!term) {
        missing.push({ field: `terms.${key}`, label: `${key} enrollment`, reason: "Each active term needs enrollment inputs.", question: `What are the full-time and enrolled credits for ${key}?` });
      } else {
        if (!isPresent(term, "ftCredits")) missing.push({ field: `terms.${key}.ftCredits`, label: `${key} full-time credits`, reason: "The term eligibility threshold needs the term full-time value.", question: `What is the full-time credit value for ${key}?` });
        if (!isPresent(term, "enrolledCredits")) missing.push({ field: `terms.${key}.enrolledCredits`, label: `${key} enrolled credits`, reason: "The SOR numerator and term eligibility need enrolled credits.", question: `How many credits is the borrower enrolled in for ${key}?` });
      }
    }
  }
  return missing;
}

function explanation(data: Record<string, unknown>) {
  return {
    summary: "This result was calculated by the shared Project SOR engine. Gross amounts are authoritative for eligibility; net amounts are display values after fees.",
    calculationStages: data.calculationStages ?? [],
    warnings: data.warnings ?? [],
    appliedRuleIds: ["SOR-APPLICABILITY", "SOR-INITIAL-MAXIMUM", "SOR-ENROLLMENT-PERCENTAGE", "SOR-DISTRIBUTION", "SOR-GROSS-NET"],
    modeledInputs: data.modeledInputs ?? [],
    notModeledChecks: data.notModeledChecks ?? [],
    citations: ["https://fsapartners.ed.gov/more-info/important-dates/2026/06/10/live-webinar-schedule-reductions/loan-limits"],
  };
}

export default defineTool({
  name: "calculate_sor",
  title: "Calculate Schedule of Reductions",
  description: "Run the source-backed V56 Schedule of Reductions engine. The tool does not use demo defaults for required borrower, enrollment, loan-period, financial, or paid-history facts. If the request is incomplete, it returns exact follow-up questions. When complete, it returns gross and net results, calculation stages, warnings, modeled checks, and public citations.",
  inputSchema: InputSchema,
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (rawInput) => {
    const input = rawInput as Record<string, unknown>;
    const parse = RequiredField.safeParse(input);
    if (!parse.success) {
      return { content: [{ type: "text", text: JSON.stringify({ status: "needs_input", canCalculate: false, missingInputs: [{ field: "request", label: "Calculation request", reason: "The request contains invalid fields.", question: "Please correct the highlighted inputs and try again." }], validationIssues: parse.error.issues }, null, 2) }], structuredContent: { status: "needs_input", canCalculate: false } as Record<string, unknown> };
    }

    const missingInputs = getMissingInputs(input);
    if (missingInputs.length > 0) {
      const result = { status: "needs_input", canCalculate: false, missingInputs, nextQuestions: missingInputs.slice(0, 3).map((item) => item.question), normalizedInputState: input, engineVersion: ENGINE_VERSION, mcpVersion: MCP_VERSION, releaseId: RELEASE_ID };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result as Record<string, unknown> };
    }

    const base = defaultInputs();
    const merged: SORInputs = { ...base, ...(input as Partial<SORInputs>), terms: { ...base.terms } };
    if (input.terms) {
      for (const [key, termPatch] of Object.entries(input.terms as Record<string, unknown>)) {
        const term = merged.terms[key as TermKey];
        if (term && termPatch && typeof termPatch === "object") merged.terms[key as TermKey] = { ...term, ...(termPatch as Partial<typeof term>) };
      }
    }
    for (const key of TERM_ORDER) if (!merged.terms[key]) merged.terms[key] = base.terms[key];

    const parsed = CalculateInputSchema.safeParse(merged);
    if (!parsed.success) {
      const result = { status: "needs_input", canCalculate: false, missingInputs: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), label: issue.path.join("."), reason: issue.message, question: `Please provide a valid value for ${issue.path.join(".")}.` })), normalizedInputState: input, engineVersion: ENGINE_VERSION, mcpVersion: MCP_VERSION, releaseId: RELEASE_ID };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result as Record<string, unknown> };
    }

    try {
      const data = calculateSORWithChildTerms(parsed.data as unknown as SORInputs) as unknown as Record<string, unknown>;
      const meta = { engineVersion: ENGINE_VERSION, mcpVersion: MCP_VERSION, policyYear: parsed.data.awardYear ?? POLICY_YEAR, policySnapshotDate: POLICY_SNAPSHOT_DATE, sourceCommit: SOURCE_COMMIT, sourceCommitStatus: SOURCE_COMMIT_STATUS, deploymentMarker: DEPLOYMENT_MARKER, releaseId: RELEASE_ID, sourceSet: ["direct-loan-sor-v1", "project-sor-v56-rule-corrections", "department-vfg-july-23-2026"], computedAt: new Date().toISOString() };
      const result = { status: "calculated", canCalculate: true, data, meta, explanation: explanation(data) };
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result as Record<string, unknown> };
    } catch (error) {
      return { content: [{ type: "text", text: `Engine error: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
    }
  },
});
