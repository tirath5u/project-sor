import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  calculateSORWithChildTerms,
  defaultInputs,
  TERM_ORDER,
  type SORInputs,
  type TermKey,
} from "@/lib/sor";
import {
  CalculateV2InputSchema,
  normalizeV2Input,
  toV2Warnings,
  v2PolicyDecision,
} from "@/lib/sor-v2-contract";
import {
  ENGINE_VERSION,
  MCP_VERSION,
  POLICY_YEAR,
  POLICY_SNAPSHOT_DATE,
  RELEASE_ID,
  SOURCE_COMMIT,
  SOURCE_COMMIT_STATUS,
  SOURCE_FINGERPRINT,
  DEPLOYMENT_MARKER,
} from "@/lib/sor.version";

const TermPatchSchema = z
  .object({
    key: z
      .enum(["term1", "term2", "term3", "term4", "summer1", "summer2", "winter1", "winter2"])
      .optional(),
    label: z.string().optional(),
    enabled: z.boolean().optional(),
    ftCredits: z.number().min(0).max(60).optional(),
    enrolledCredits: z.number().min(0).max(60).optional(),
    disbursed: z.boolean().optional(),
    actualCredits: z.number().min(0).max(60).nullable().optional(),
    paidSub: z.number().nullable().optional(),
    paidUnsub: z.number().nullable().optional(),
    refundSub: z.number().nullable().optional(),
    refundUnsub: z.number().nullable().optional(),
    coaCapSub: z.number().min(0).optional(),
    coaCapUnsub: z.number().min(0).optional(),
    paidGradPlus: z.number().nullable().optional(),
    refundGradPlus: z.number().nullable().optional(),
    coaCapGradPlus: z.number().min(0).optional(),
  })
  .strict();

const TermKeyEnum = z.enum([
  "term1",
  "term2",
  "term3",
  "term4",
  "summer1",
  "summer2",
  "winter1",
  "winter2",
]);
const ChildPaidGrossSchema = z
  .object({
    sub: z.number().min(0).nullable().optional(),
    unsub: z.number().min(0).nullable().optional(),
    gradPlus: z.number().min(0).nullable().optional(),
  })
  .strict();
const ChildTermSchema = z
  .object({
    credits: z.number().min(0).max(60),
    paidGross: ChildPaidGrossSchema.optional(),
  })
  .strict();
const ChildTermsSchema = z
  .object({
    count: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    allocationMethod: z.enum(["byChildCredits", "equalAcrossActiveChildTerms"]),
    parents: z.record(TermKeyEnum, z.array(ChildTermSchema)),
  })
  .strict();
const InputSchema = {
  awardYear: z.enum(["2025-26", "2026-27"]).optional(),
  loanLimitException: z.boolean().optional(),
  programLevel: z.enum(["undergraduate", "graduate"]).optional(),
  gradeLevel: z.enum(["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11", "g12", "g13"]).optional(),
  dependency: z.enum(["dependent", "independent"]).optional(),
  parentPlusDenied: z.boolean().optional(),
  singleTermPaymentPeriod: TermKeyEnum.optional(),
  ayType: z.enum(["SAY", "BBAY1", "BBAY2"]).optional(),
  calType: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  calendarCategory: z.enum(["standardTerm", "nonstandardEqualNineWeeks", "nonstandardNeedsReview", "nontermCreditHour", "clockHour", "subscription"]).optional(),
  summerPosition: z.enum(["none", "trailer", "header"]).optional(),
  loanPeriodScope: z.enum(["annualMultiTerm", "singleTerm"]).optional(),
  numStandardTerms: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  includeSummer1: z.boolean().optional(),
  includeSummer2: z.boolean().optional(),
  includeWinter1: z.boolean().optional(),
  includeWinter2: z.boolean().optional(),
  ayFtCredits: z.number().min(0).max(200).optional(),
  annualNeed: z.number().min(0).optional(),
  subStatutory: z.number().min(0).optional(),
  unsubStatutory: z.number().min(0).optional(),
  coa: z.number().min(0).optional(),
  otherAid: z.number().min(0).optional(),
  requestedGradPlus: z.number().min(0).optional(),
  overrideLimits: z.boolean().optional(),
  distributionModel: z.enum(["equal", "proportional"]).optional(),
  applySubUnsubShift: z.boolean().optional(),
  applyDoubleReduction: z.literal(false).optional(),
  countLthtInAyPct: z.literal(true).optional(),
  viewMode: z.enum(["plan", "disbursement"]).optional(),
  terms: z.record(TermKeyEnum, TermPatchSchema).optional(),
  childTerms: ChildTermsSchema.optional(),
  feeSubUnsubPercent: z.number().min(0).max(100).optional(),
  feeGradPlusPercent: z.number().min(0).max(100).optional(),
  traditionalProrationApplies: z.boolean().optional(),
  ayDenominatorVerified: z.boolean().optional(),
  parentPlusEligibilityBasis: z
    .enum([
      "none",
      "adverseCreditDenied",
      "documentedExceptionalCircumstances",
      "otherOrUnverified",
    ])
    .optional(),
  parentPlusAggregateUsed: z.number().min(0).nullable().optional(),
  traditionalProrationStatus: z
    .enum(["notApplied", "shortProgram", "remainingPeriodShorterThanAcademicYear"])
    .optional(),
  ayDenominatorOverride: z.number().min(0).nullable().optional(),
  preSorCaps: z
    .object({
      enabled: z.boolean().optional(),
      sub: z.number().min(0).nullable().optional(),
      unsub: z.number().min(0).nullable().optional(),
      gradPlus: z.number().min(0).nullable().optional(),
    })
    .strict()
    .optional(),
  requestedSub: z.number().min(0).nullable().optional(),
  requestedUnsub: z.number().min(0).nullable().optional(),
  remainingAnnualSub: z.number().min(0).nullable().optional(),
  remainingAnnualUnsub: z.number().min(0).nullable().optional(),
  remainingAnnualCombined: z.number().min(0).nullable().optional(),
  remainingAggregateSub: z.number().min(0).nullable().optional(),
  remainingAggregateUnsub: z.number().min(0).nullable().optional(),
  remainingAggregateCombined: z.number().min(0).nullable().optional(),
  coaScope: z.enum(["academicYear", "singleTerm"]).optional(),
  detailLevel: z.enum(["compact", "detailed"]).optional(),
};

const RequiredField = z.object(InputSchema).passthrough();

const requiredFields: Array<{ field: string; label: string; reason: string; question: string }> = [
  {
    field: "calendarCategory",
    label: "Program calendar",
    reason: "Standard term, nonstandard term, nonterm, clock hour, and subscription programs have different SOR applicability.",
    question: "Is the program standard term, substantially equal nonstandard terms of at least nine weeks, another nonstandard calendar, nonterm credit hour, clock hour, or subscription based?",
  },
  {
    field: "awardYear",
    label: "Award Year",
    reason: "The SOR policy path is award-year specific.",
    question: "What Award Year is being evaluated?",
  },
  {
    field: "programLevel",
    label: "Program level",
    reason: "The loan-limit and eligibility path differs for undergraduate and graduate borrowers.",
    question: "Is this an undergraduate or graduate/professional borrower?",
  },
  {
    field: "gradeLevel",
    label: "Grade level",
    reason: "The initial annual Direct Loan limit depends on grade level.",
    question: "What grade-level code applies to the borrower?",
  },
  {
    field: "dependency",
    label: "Dependency status",
    reason: "Undergraduate annual limits depend on dependency status.",
    question: "Is the undergraduate borrower dependent or independent?",
  },
  {
    field: "loanPeriodScope",
    label: "Loan-period scope",
    reason: "Single-term and multi-term calculations have different starting points.",
    question: "Is this an annual/multi-term or Single-term loan period?",
  },
  {
    field: "ayType",
    label: "Academic-year type",
    reason: "The academic-year structure controls term scope.",
    question: "What academic-year type applies: SAY, BBAY1, or BBAY2?",
  },
  {
    field: "numStandardTerms",
    label: "Number of standard terms",
    reason: "The engine needs the active standard-term count.",
    question: "How many standard terms are in the evaluated loan period?",
  },
  {
    field: "ayFtCredits",
    label: "Full-time academic-year credits",
    reason: "The SOR percentage requires the institution's applicable denominator.",
    question:
      "What full-time credit denominator should be used for this academic year or loan period?",
  },
  {
    field: "annualNeed",
    label: "Annual financial need",
    reason: "Need can limit the initial maximum before SOR.",
    question: "What annual financial need should be used?",
  },
  {
    field: "coa",
    label: "Cost of attendance",
    reason: "COA can limit ordinary eligibility and is required for Grad PLUS sizing.",
    question: "What cost of attendance applies to the evaluated scope?",
  },
  {
    field: "otherAid",
    label: "Other financial assistance",
    reason: "OFA reduces the ordinary eligibility base.",
    question: "What other financial assistance must be subtracted?",
  },
  {
    field: "terms",
    label: "Term enrollment inputs",
    reason: "The SOR numerator and disbursement distribution require term-level credits.",
    question: "Please provide the active term enrollment and full-time credits.",
  },
];

function isPresent(input: Record<string, unknown>, field: string) {
  const value = input[field];
  return value !== undefined && value !== null;
}

function getMissingInputs(input: Record<string, unknown>) {
  const missing = requiredFields.filter((item) => !isPresent(input, item.field));
  if (input.loanPeriodScope === "singleTerm" && !isPresent(input, "singleTermPaymentPeriod")) {
    missing.push({ field: "singleTermPaymentPeriod", label: "Single-term payment period", reason: "A true one-term loan needs its payment period identified separately from the academic-year structure.", question: "Which term is covered by this single-term loan?" });
  }
  if (input.loanPeriodScope === "singleTerm" && typeof input.singleTermPaymentPeriod === "string") {
    const terms = input.terms as Record<string, Record<string, unknown>> | undefined;
    const selectedTerm = terms?.[input.singleTermPaymentPeriod];
    if (!selectedTerm) {
      missing.push({ field: `terms.${input.singleTermPaymentPeriod}`, label: "Selected payment-period enrollment", reason: "The selected period needs its own full-time and enrolled credits.", question: `What are the full-time and enrolled credits for ${input.singleTermPaymentPeriod}?` });
    } else {
      if (!isPresent(selectedTerm, "ftCredits"))
        missing.push({ field: `terms.${input.singleTermPaymentPeriod}.ftCredits`, label: "Selected full-time credits", reason: "The selected period needs its full-time threshold.", question: `What is the full-time credit value for ${input.singleTermPaymentPeriod}?` });
      if (!isPresent(selectedTerm, "enrolledCredits"))
        missing.push({ field: `terms.${input.singleTermPaymentPeriod}.enrolledCredits`, label: "Selected enrolled credits", reason: "The selected period needs its enrolled credits.", question: `How many credits is the borrower enrolled in for ${input.singleTermPaymentPeriod}?` });
    }
  }
  if (input.parentPlusEligibilityBasis === "adverseCreditDenied" && input.dependency === "dependent" && input.awardYear === "2026-27" && input.loanLimitException !== true && !isPresent(input, "parentPlusAggregateUsed")) {
    missing.push({ field: "parentPlusAggregateUsed", label: "Parent PLUS aggregate used", reason: "Additional dependent Unsub eligibility ends when the Parent PLUS aggregate is exhausted.", question: "How much has the parent already borrowed against the $65,000 Parent PLUS aggregate?" });
  }
  const terms = input.terms as Record<string, Record<string, unknown>> | undefined;
  const count = typeof input.numStandardTerms === "number" ? input.numStandardTerms : 0;
  if (terms && count > 0) {
    for (const key of (["term1", "term2", "term3", "term4"] as const).slice(0, count)) {
      const term = terms[key];
      if (!term) {
        missing.push({
          field: `terms.${key}`,
          label: `${key} enrollment`,
          reason: "Each active term needs enrollment inputs.",
          question: `What are the full-time and enrolled credits for ${key}?`,
        });
      } else {
        if (!isPresent(term, "ftCredits"))
          missing.push({
            field: `terms.${key}.ftCredits`,
            label: `${key} full-time credits`,
            reason: "The term eligibility threshold needs the term full-time value.",
            question: `What is the full-time credit value for ${key}?`,
          });
        if (!isPresent(term, "enrolledCredits"))
          missing.push({
            field: `terms.${key}.enrolledCredits`,
            label: `${key} enrolled credits`,
            reason: "The SOR numerator and term eligibility need enrolled credits.",
            question: `How many credits is the borrower enrolled in for ${key}?`,
          });
        if (input.viewMode === "disbursement" && term.disbursed === true && !isPresent(term, "actualCredits"))
          missing.push({ field: `terms.${key}.actualCredits`, label: `${key} actual credits`, reason: "The already-paid term still contributes its actual credits to the annual SOR percentage.", question: `How many Title IV-countable credits did the student actually attend in ${key}?` });
      }
    }
  }
  return missing;
}

function explanation(data: Record<string, unknown>) {
  return {
    summary:
      "This result was calculated by the shared Project SOR engine. Gross amounts determine eligibility; net amounts display estimated proceeds after fees. Verify remaining aggregate eligibility and institution-specific packaging checks separately.",
    calculationStages: data.calculationStages ?? [],
    warnings: data.warnings ?? [],
    appliedRuleIds: [
      "SOR-APPLICABILITY",
      "SOR-INITIAL-MAXIMUM",
      "SOR-ENROLLMENT-PERCENTAGE",
      "SOR-DISTRIBUTION",
      "SOR-GROSS-NET",
    ],
    modeledInputs: data.modeledInputs ?? [],
    notModeledChecks: Array.from(
      new Set([
        ...(Array.isArray(data.notModeledChecks) ? data.notModeledChecks : []),
        "Institution-verified remaining eligibility and loan history",
      ]),
    ),
    citations: [
      "https://fsapartners.ed.gov/more-info/important-dates/2026/06/10/live-webinar-schedule-reductions/loan-limits",
      "https://fsapartners.ed.gov/sites/default/files/2026-08/FAQReducingAnnualLoanLimitsLessthanFullTimeEnrollment.pdf",
    ],
  };
}

export default defineTool({
  name: "calculate_sor",
  title: "Calculate Schedule of Reductions",
  description:
    "Calculate Direct Loan Schedule of Reductions using source-backed rules. Missing facts produce specific follow-up questions, not demo defaults. Returns gross eligibility, term payouts, warnings, and public source links. Use detailLevel=detailed for full calculation stages.",
  inputSchema: InputSchema,
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (rawInput) => {
    const input = rawInput as Record<string, unknown>;
    const parse = RequiredField.safeParse(input);
    if (!parse.success) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                status: "needs_input",
                canCalculate: false,
                missingInputs: [
                  {
                    field: "request",
                    label: "Calculation request",
                    reason: "The request contains invalid fields.",
                    question: "Please correct the highlighted inputs and try again.",
                  },
                ],
                validationIssues: parse.error.issues,
              },
              null,
              2,
            ),
          },
        ],
        structuredContent: { status: "needs_input", canCalculate: false } as Record<
          string,
          unknown
        >,
      };
    }

    const missingInputs = getMissingInputs(input);
    if (missingInputs.length > 0) {
      const result = {
        status: "needs_input",
        canCalculate: false,
        missingInputs,
        nextQuestions: missingInputs.slice(0, 3).map((item) => item.question),
        normalizedInputState: input,
        engineVersion: ENGINE_VERSION,
        mcpVersion: MCP_VERSION,
        releaseId: RELEASE_ID,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }

    const base = defaultInputs();
    const { detailLevel, ...calculationInput } = input;
    const merged: SORInputs = {
      ...base,
      ...(calculationInput as Partial<SORInputs>),
      terms: { ...base.terms },
    };
    if (input.calendarCategory && input.calType === undefined) {
      merged.calType = input.calendarCategory === "standardTerm" ? 1
        : input.calendarCategory === "nonstandardEqualNineWeeks" || input.calendarCategory === "nonstandardNeedsReview" ? 3
        : 4;
    }
    if (input.terms) {
      for (const [key, termPatch] of Object.entries(input.terms as Record<string, unknown>)) {
        const term = merged.terms[key as TermKey];
        if (term && termPatch && typeof termPatch === "object")
          merged.terms[key as TermKey] = { ...term, ...(termPatch as Partial<typeof term>) };
      }
    }
    for (const key of TERM_ORDER) if (!merged.terms[key]) merged.terms[key] = base.terms[key];

    const parsed = CalculateV2InputSchema.safeParse(merged);
    if (!parsed.success) {
      const result = {
        status: "needs_input",
        canCalculate: false,
        missingInputs: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          label: issue.path.join("."),
          reason: issue.message,
          question: `Please provide a valid value for ${issue.path.join(".")}.`,
        })),
        normalizedInputState: input,
        engineVersion: ENGINE_VERSION,
        mcpVersion: MCP_VERSION,
        releaseId: RELEASE_ID,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }

    try {
      const normalized = normalizeV2Input(parsed.data);
      if (normalized.missingRequiredInputs.length > 0) {
        const result = { status: "needs_input", canCalculate: false, missingInputs: normalized.missingRequiredInputs, nextQuestions: normalized.missingRequiredInputs.map((item) => item.question), meta: { engineVersion: ENGINE_VERSION, mcpVersion: MCP_VERSION, releaseId: RELEASE_ID } };
        return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result as Record<string, unknown> };
      }
      const data = calculateSORWithChildTerms(
        normalized.engineInput as unknown as SORInputs,
      ) as unknown as Record<string, unknown>;
      const meta = {
        engineVersion: ENGINE_VERSION,
        mcpVersion: MCP_VERSION,
        policyYear: parsed.data.awardYear ?? POLICY_YEAR,
        policySnapshotDate: POLICY_SNAPSHOT_DATE,
        sourceCommit: SOURCE_COMMIT,
        sourceCommitStatus: SOURCE_COMMIT_STATUS,
        sourceFingerprint: SOURCE_FINGERPRINT,
        deploymentMarker: DEPLOYMENT_MARKER,
        releaseId: RELEASE_ID,
        sourceSet: [
          "psr-001",
          "psr-009",
          "psr-011",
        ],
      };
      const authoritative = normalized.externalChecks.length === 0 && !normalized.blocked;
      const result = {
        status: normalized.blocked
          ? "blocked"
          : normalized.externalChecks.length > 0
            ? "calculated_with_external_checks"
            : "calculated",
        canCalculate: true,
        data: detailLevel === "detailed" ? data : {
          sorPctRounded: data.sorPctRounded,
          reducedSub: data.reducedSub,
          reducedUnsub: data.reducedUnsub,
          reducedGradPlus: data.reducedGradPlus,
          termResults: data.termResults,
        },
        meta,
        contract: {
          calculationStatus: normalized.blocked
            ? "blocked"
            : normalized.externalChecks.length > 0
              ? "calculated_with_external_checks"
              : "calculated",
          authoritative,
          policyDecision: v2PolicyDecision(data, authoritative),
          ...(detailLevel === "detailed" ? { eligibilityStages: data.calculationStages ?? [], modeledInputs: data.modeledInputs ?? [] } : {}),
          externalChecks: normalized.externalChecks,
          warnings: toV2Warnings(
            [
              ...(Array.isArray(data.warnings) ? (data.warnings as string[]) : []),
              ...normalized.warnings,
            ],
            normalized.externalChecks,
          ),
        },
        explanation: detailLevel === "detailed" ? explanation(data) : {
          summary: explanation(data).summary,
          citations: explanation(data).citations,
        },
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
        structuredContent: result as Record<string, unknown>,
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Engine error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  },
});
