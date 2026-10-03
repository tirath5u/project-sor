import { z } from "zod";
import { CalculateInputSchema, type CalculateInput } from "./sor.schema";
import {
  LoanLimitExceptionEvidenceSchema,
  ProfessionalClassificationSchema,
  ProgramContinuitySchema,
  triageLoanLimitException,
  type LleTriageResult,
} from "./student-lle";

export const ParentPlusEligibilityBasisSchema = z.enum([
  "none",
  "adverseCreditDenied",
  "documentedExceptionalCircumstances",
  "otherOrUnverified",
]);

export const TraditionalProrationStatusSchema = z.enum([
  "notApplied",
  "shortProgram",
  "remainingPeriodShorterThanAcademicYear",
]);

const NullableMoneySchema = z.number().finite().min(0).nullable().optional();

export const V2StructuredFieldsSchema = z
  .object({
    parentPlusEligibilityBasis: ParentPlusEligibilityBasisSchema.optional(),
    parentPlusAggregateUsed: z.number().finite().min(0).nullable().optional(),
    traditionalProrationStatus: TraditionalProrationStatusSchema.optional(),
    ayDenominatorOverride: z.number().finite().min(0).nullable().optional(),
    preSorCaps: z
      .object({
        enabled: z.boolean().optional(),
        sub: NullableMoneySchema,
        unsub: NullableMoneySchema,
        gradPlus: NullableMoneySchema,
      })
      .strict()
      .optional(),
    requestedSub: NullableMoneySchema,
    requestedUnsub: NullableMoneySchema,
    remainingAnnualSub: NullableMoneySchema,
    remainingAnnualUnsub: NullableMoneySchema,
    remainingAnnualCombined: NullableMoneySchema,
    remainingAggregateSub: NullableMoneySchema,
    remainingAggregateUnsub: NullableMoneySchema,
    remainingAggregateCombined: NullableMoneySchema,
    coaScope: z.enum(["academicYear", "singleTerm"]).optional(),
    // Student-facing exception triage inputs. These are self-reported review
    // signals. They never become the authoritative `loanLimitException` engine
    // input on their own.
    loanLimitExceptionEvidence: LoanLimitExceptionEvidenceSchema.optional(),
    programContinuity: ProgramContinuitySchema.optional(),
    professionalClassification: ProfessionalClassificationSchema.optional(),
    studentDisclosureAcknowledged: z.boolean().optional(),
  })
  .strict();

/**
 * V2 keeps the V1 calculation fields for compatibility while adding explicit
 * structured fields. The normalizer below is the only place where those
 * fields are translated into legacy engine inputs.
 */
export const CalculateV2InputSchema = CalculateInputSchema.extend(
  V2StructuredFieldsSchema.shape,
).strict();

export type CalculateV2Input = z.infer<typeof CalculateV2InputSchema>;
export type V2StructuredFields = z.infer<typeof V2StructuredFieldsSchema>;

export interface V2Normalization {
  engineInput: CalculateInput;
  structured: V2StructuredFields;
  externalChecks: string[];
  warnings: string[];
  blocked: boolean;
  missingRequiredInputs: Array<{ field: string; question: string }>;
  /**
   * Present only when the caller supplied student triage inputs. Consumers must
   * render this instead of inferring eligibility from the numeric result.
   */
  loanLimitExceptionTriage?: LleTriageResult;
}

function addExternal(checks: string[], check: string) {
  if (!checks.includes(check)) checks.push(check);
}

/**
 * Normalize V2 once for REST and MCP. Fields that the current shared engine
 * cannot apply are retained in the response as explicit external checks.
 * They are never silently ignored or converted to zero.
 */
export function normalizeV2Input(input: CalculateV2Input): V2Normalization {
  const {
    parentPlusEligibilityBasis,
    parentPlusAggregateUsed,
    traditionalProrationStatus,
    ayDenominatorOverride,
    preSorCaps,
    requestedSub,
    requestedUnsub,
    remainingAnnualSub,
    remainingAnnualUnsub,
    remainingAnnualCombined,
    remainingAggregateSub,
    remainingAggregateUnsub,
    remainingAggregateCombined,
    coaScope,
    loanLimitExceptionEvidence,
    programContinuity,
    professionalClassification,
    studentDisclosureAcknowledged,
    ...legacyFields
  } = input;

  const engineInput: CalculateInput = { ...legacyFields } as CalculateInput;
  const structured: V2StructuredFields = {
    parentPlusEligibilityBasis,
    parentPlusAggregateUsed,
    traditionalProrationStatus,
    ayDenominatorOverride,
    preSorCaps,
    requestedSub,
    requestedUnsub,
    remainingAnnualSub,
    remainingAnnualUnsub,
    remainingAnnualCombined,
    remainingAggregateSub,
    remainingAggregateUnsub,
    remainingAggregateCombined,
    coaScope,
    loanLimitExceptionEvidence,
    programContinuity,
    professionalClassification,
    studentDisclosureAcknowledged,
  };
  const externalChecks: string[] = [];
  const warnings: string[] = [];
  const missingRequiredInputs: Array<{ field: string; question: string }> = [];
  let blocked = false;

  if ((input.calType === 3 || input.calType === 4)
    && (!input.calendarCategory || input.calendarCategory === "standardTerm")) {
    missingRequiredInputs.push({
      field: "calendarCategory",
      question: "Is this a substantially equal nonstandard term of at least nine weeks, a nonterm credit-hour program, a clock-hour program, subscription, or another calendar needing school review?",
    });
  }
  if (input.calType <= 2 && input.calendarCategory
    && input.calendarCategory !== "standardTerm") {
    missingRequiredInputs.push({
      field: "calendarCategory",
      question: "The calendar code is standard term, but the selected category is not. Which program calendar is correct?",
    });
  }
  if (input.calType === 3 && input.calendarCategory
    && !["nonstandardEqualNineWeeks", "nonstandardNeedsReview"].includes(input.calendarCategory)) {
    missingRequiredInputs.push({
      field: "calendarCategory",
      question: "The calendar code is nonstandard term, but the selected category differs. Which program calendar is correct?",
    });
  }
  if (input.calType === 4 && input.calendarCategory
    && !["nontermCreditHour", "clockHour", "subscription"].includes(input.calendarCategory)) {
    missingRequiredInputs.push({
      field: "calendarCategory",
      question: "The calendar code is nonterm or subscription, but the selected category differs. Which program calendar is correct?",
    });
  }
  if (input.calendarCategory === "nonstandardNeedsReview" || input.calendarCategory === "subscription") {
    blocked = true;
    warnings.push("The selected calendar category requires a school policy review before this result can be used for awarding.");
  }
  if (input.calendarCategory === "nontermCreditHour" || input.calendarCategory === "clockHour") {
    blocked = true;
    warnings.push("Schedule of Reductions does not apply to this calendar; do not use the numeric result as an award amount.");
  }

  if (input.loanPeriodScope === "singleTerm" && !input.singleTermPaymentPeriod) {
    missingRequiredInputs.push({
      field: "singleTermPaymentPeriod",
      question: "Which enabled term is this one-term loan for?",
    });
  }
  if (input.loanPeriodScope === "singleTerm" && input.singleTermPaymentPeriod) {
    const selected = input.singleTermPaymentPeriod;
    const standardIndex = ["term1", "term2", "term3", "term4"].indexOf(selected);
    const enabledBySetup = standardIndex >= 0
      ? standardIndex < input.numStandardTerms
      : selected === "summer1" ? input.includeSummer1
      : selected === "summer2" ? input.includeSummer2
      : selected === "winter1" ? input.includeWinter1 : input.includeWinter2;
    if (!enabledBySetup || !input.terms[selected]?.enabled) {
      missingRequiredInputs.push({
        field: "singleTermPaymentPeriod",
        question: "Which enabled term is this one-term loan for? The selected term is not active in the academic-year setup.",
      });
    }
  }
  if (input.viewMode === "disbursement") {
    for (const [key, term] of Object.entries(input.terms)) {
      if ((term.disbursed || (term.paidSub ?? 0) > 0 || (term.paidUnsub ?? 0) > 0 || (term.paidGradPlus ?? 0) > 0)
        && term.actualCredits === null) {
        missingRequiredInputs.push({
          field: `terms.${key}.actualCredits`,
          question: `How many Title IV-countable credits did the student actually take in ${term.label}?`,
        });
      }
    }
  }

  if (traditionalProrationStatus) {
    const applies = traditionalProrationStatus !== "notApplied";
    if (
      input.traditionalProrationApplies !== undefined &&
      input.traditionalProrationApplies !== applies
    ) {
      warnings.push(
        "Traditional proration fields conflict. Resolve the structured status before relying on the result.",
      );
      blocked = true;
    }
    engineInput.traditionalProrationApplies = applies;
  }

  if (ayDenominatorOverride !== undefined && ayDenominatorOverride !== null) {
    if (ayDenominatorOverride > 0) {
      engineInput.ayFtCredits = ayDenominatorOverride;
      engineInput.ayDenominatorVerified = true;
    } else {
      warnings.push(
        "AY denominator override is zero. The engine retains its derived denominator and requires institutional verification.",
      );
      addExternal(
        externalChecks,
        "Verify the derived AY denominator against the institution's published academic-year definition.",
      );
    }
  }

  if (parentPlusEligibilityBasis !== undefined) {
    // The legacy engine boolean specifically models adverse-credit denial.
    // Other structured bases must remain external until their rule path is
    // implemented, rather than being broadened into the denial uplift.
    engineInput.parentPlusDenied = parentPlusEligibilityBasis === "adverseCreditDenied";
    if (parentPlusEligibilityBasis === "documentedExceptionalCircumstances") {
      addExternal(externalChecks, "The documented exceptional-circumstances basis needs a school eligibility review; it is not treated as an adverse-credit denial.");
    }
  }
  engineInput.parentPlusAggregateUsed = parentPlusAggregateUsed ?? null;
  if (engineInput.parentPlusDenied && input.dependency === "dependent"
    && input.awardYear === "2026-27" && input.loanLimitException !== true) {
    if (parentPlusAggregateUsed === null || parentPlusAggregateUsed === undefined) {
      warnings.push(
        "Parent PLUS aggregate usage is missing for the adverse-credit additional Unsubsidized calculation.",
      );
      addExternal(externalChecks, "Provide school-validated Parent PLUS aggregate used before calculating the additional dependent Unsubsidized amount.");
      missingRequiredInputs.push({
        field: "parentPlusAggregateUsed",
        question: "What Parent PLUS aggregate amount has the parent already used? Please use the school's verified record.",
      });
    }
  }

  if (preSorCaps !== undefined) {
    addExternal(
      externalChecks,
      "Optional pre-SOR Sub, Unsubsidized, and Grad PLUS caps are reported but are not applied by this shared engine version.",
    );
  }

  if (requestedSub !== undefined || requestedUnsub !== undefined) {
    addExternal(
      externalChecks,
      "Borrower-requested Sub and Unsubsidized amounts are reported but are not applied by this shared engine version.",
    );
  }

  if (
    remainingAnnualSub !== undefined ||
    remainingAnnualUnsub !== undefined ||
    remainingAnnualCombined !== undefined ||
    remainingAggregateSub !== undefined ||
    remainingAggregateUnsub !== undefined ||
    remainingAggregateCombined !== undefined
  ) {
    addExternal(
      externalChecks,
      "Remaining annual and aggregate limits are caller-supplied review inputs and are not derived by this SOR engine.",
    );
  }

  if (coaScope === "singleTerm" && input.loanPeriodScope !== "singleTerm") {
    blocked = true;
    warnings.push(
      "COA scope is single-term but loanPeriodScope is not single-term. Resolve the scope before relying on Grad PLUS sizing.",
    );
  }

  // Student Loan Limit Exception triage.
  //
  // Self-reported facts are triage signals only. The authoritative engine input
  // stays whatever the caller supplied as `loanLimitException`, which is the
  // same school-confirmed field the staff calculator uses. The one direction we
  // do act on is protective: a reported conflict suppresses a modeled Grad PLUS
  // result rather than letting a disputed status drive a dollar figure.
  const hasStudentTriageInput =
    loanLimitExceptionEvidence !== undefined ||
    programContinuity !== undefined ||
    professionalClassification !== undefined;

  let loanLimitExceptionTriage: LleTriageResult | undefined;
  if (hasStudentTriageInput) {
    if (loanLimitExceptionEvidence === "school_record_conflict" && engineInput.loanLimitException) {
      engineInput.loanLimitException = false;
      // Suppress only the disputed Grad PLUS lane, not the Sub and Unsub estimate.
      warnings.push(
        "A Loan Limit Exception record disagreement was reported, so no Grad PLUS amount is modeled until the school and COD resolve the status.",
      );
    }

    loanLimitExceptionTriage = triageLoanLimitException({
      programContinuity,
      loanLimitExceptionEvidence,
      professionalClassification,
      schoolConfirmedLoanLimitException: engineInput.loanLimitException === true,
      hasSchoolProvidedCoaAndOfa:
        typeof input.coa === "number" && input.coa > 0 && typeof input.otherAid === "number",
    });

    for (const check of loanLimitExceptionTriage.externalChecks) addExternal(externalChecks, check);
    addExternal(
      externalChecks,
      "Loan Limit Exception triage is based on self-reported facts and is never an eligibility determination.",
    );

    if (loanLimitExceptionEvidence === "student_reported_y" && !engineInput.loanLimitException) {
      addExternal(
        externalChecks,
        "A student-reported exception flag of Y is not used as a calculation input. Grad PLUS is modeled only from a school-confirmed exception status.",
      );
    }
    if (studentDisclosureAcknowledged !== true) {
      warnings.push(
        "Student disclosure has not been acknowledged. The advanced student result must not be presented until it is.",
      );
    }
  }

  return {
    engineInput,
    structured,
    externalChecks,
    warnings,
    blocked,
    missingRequiredInputs,
    loanLimitExceptionTriage,
  };
}

export interface V2Warning {
  id: string;
  severity: "info" | "review";
  message: string;
}

function warningId(message: string): string {
  if (message.includes("Proportional is not used")) return "EFFECTIVE_EQUAL_NO_CURRENT_SOR";
  const category = message.includes("Traditional 685.203") ? "TRADITIONAL_PRORATION_SOR_GUARD"
    : message.includes("Parent PLUS aggregate") ? "PARENT_PLUS_AGGREGATE_REQUIRED"
    : message.includes("AY denominator") ? "AY_DENOMINATOR_REVIEW"
    : message.includes("Less-than-half-time") ? "LTHT_TERM_REVIEW"
    : message.includes("Single-term") || message.includes("single-term") ? "SINGLE_TERM_SCOPE_REVIEW"
    : message.includes("gross Direct Loan") ? "GROSS_NET_DISPLAY_INFO"
    : message.toLowerCase().includes("fee") ? "LOAN_FEE_INFO"
    : "SOR_REVIEW";
  let hash = 2166136261;
  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${category}_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function toV2Warnings(messages: string[], externalChecks: string[]): V2Warning[] {
  const all = [...messages, ...externalChecks];
  return Array.from(
    new Map(
      all.map((message) => [
        message,
        {
          id: warningId(message),
          severity: /gross Direct Loan|loan fees|not net of loan fees/i.test(message) ? "info" as const : "review" as const,
          message,
        },
      ]),
    ).values(),
  );
}

export function v2PolicyDecision(data: Record<string, unknown>, authoritative = true) {
  const sorApplicable = data.sorApplicable === true;
  const distributionStage = Array.isArray(data.calculationStages)
    ? data.calculationStages.find((stage: unknown) =>
        typeof stage === "object" && stage !== null && (stage as { id?: string }).id === "parent-distribution") as { output?: Record<string, unknown> } | undefined
    : undefined;
  return {
    sorApplicable,
    reasonCode: sorApplicable ? "SOR_APPLIES" : "SOR_NOT_APPLIED",
    selectedDistributionModel: distributionStage?.output?.selectedDistributionModel ?? null,
    effectiveDistributionModel: data.effectiveDistributionModel ?? null,
    authoritative,
  };
}
