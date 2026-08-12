/**
 * Single canonical payload builder for the student Loan Limit Exception check.
 *
 * REST and MCP both call this so the status, rule IDs, external checks,
 * next-step question, sources, and release metadata are identical by
 * construction rather than by convention.
 */

import { z } from "zod";
import {
  LoanLimitExceptionEvidenceSchema,
  ProfessionalClassificationSchema,
  ProgramContinuitySchema,
  describeTriageStatus,
  triageLoanLimitException,
  type ProgramContinuity,
} from "./student-lle";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, RELEASE_ID } from "./sor.version";

export const CheckLoanLimitExceptionInputSchema = z
  .object({
    programContinuity: ProgramContinuitySchema.optional(),
    loanLimitExceptionEvidence: LoanLimitExceptionEvidenceSchema.optional(),
    professionalClassification: ProfessionalClassificationSchema.optional(),
    /**
     * School-confirmed exception status. Only a school-confirmed value may be
     * used for an indicative Grad PLUS path. Omit it for a pure triage run.
     */
    schoolConfirmedLoanLimitException: z.boolean().optional(),
    hasSchoolProvidedCoaAndOfa: z.boolean().optional(),
    studentDisclosureAcknowledged: z.boolean().optional(),
  })
  .strict();

export type CheckLoanLimitExceptionInput = z.infer<typeof CheckLoanLimitExceptionInputSchema>;

const REQUIRED_QUESTION_ORDER = [
  "seekingGradProfBorrowing",
  "enrolledOnJune30",
  "priorDirectLoanBeforeJuly1",
  "statusSinceJune30",
  "schoolChangedProgramOrEndDate",
] as const;

/** Exact student-facing prompts, kept in one place so MCP asks what the UI asks. */
export const STUDENT_PROMPTS: Record<(typeof REQUIRED_QUESTION_ORDER)[number], string> = {
  seekingGradProfBorrowing:
    "Are you seeking graduate or professional borrowing for the 2026-27 award year?",
  enrolledOnJune30:
    "Were you enrolled in the program you are pursuing at this school on June 30, 2026?",
  priorDirectLoanBeforeJuly1:
    "Did you receive a Direct Loan for that same program before July 1, 2026?",
  statusSinceJune30:
    "Since June 30, 2026, has your school recorded you as withdrawn from that program, or have you changed schools, degree, or credential?",
  schoolChangedProgramOrEndDate:
    "Has your school changed your program, degree, credential, or reported program end date?",
};

/**
 * The next unanswered question, so MCP can elicit one at a time instead of
 * demanding a full object.
 */
export function nextMissingQuestion(continuity: ProgramContinuity | undefined) {
  const answered = continuity ?? {};
  for (const key of REQUIRED_QUESTION_ORDER) {
    const value = answered[key];
    if (value === undefined) {
      return { field: `programContinuity.${key}`, question: STUDENT_PROMPTS[key] };
    }
  }
  return null;
}

export function buildLoanLimitExceptionPayload(input: CheckLoanLimitExceptionInput) {
  const triage = triageLoanLimitException({
    programContinuity: input.programContinuity,
    loanLimitExceptionEvidence: input.loanLimitExceptionEvidence,
    professionalClassification: input.professionalClassification,
    schoolConfirmedLoanLimitException: input.schoolConfirmedLoanLimitException,
    hasSchoolProvidedCoaAndOfa: input.hasSchoolProvidedCoaAndOfa,
  });

  const missing = nextMissingQuestion(input.programContinuity);

  return {
    status: triage.status,
    audience: "student-loan-limit-exception" as const,
    headline: describeTriageStatus(triage.status),
    isDetermination: false as const,
    ruleIds: triage.ruleIds,
    reasons: triage.reasons,
    gradPlus: {
      path: triage.gradPlusPath,
      explanation:
        triage.gradPlusPath === "outside_modeled_path"
          ? "A Grad PLUS amount is not modeled here. For 2026-27, this public calculator does not produce a Grad PLUS figure without a school-confirmed exception status, and it cannot override a federal-system or school determination."
          : triage.gradPlusPath === "school_review_estimate"
            ? "A Grad PLUS amount is not shown yet. It requires a school-confirmed exception status together with the school's cost of attendance and other financial assistance figures."
            : "A Grad PLUS estimate can be modeled from the school-confirmed exception status and the school-provided figures. It remains an estimate, not an award.",
      authoritative: false as const,
    },
    professionalLimitEstimate: triage.professionalLimitEstimate,
    missingFacts: triage.missingFacts,
    nextQuestion: missing,
    externalChecks: triage.externalChecks,
    aidOfficeQuestion: triage.aidOfficeQuestion,
    delayGuidance: triage.delayGuidance,
    disclosureAcknowledged: input.studentDisclosureAcknowledged === true,
    disclaimer:
      "This is decision support based only on what you entered. It is not an eligibility determination, an award, an approval, or a guarantee of any disbursement. Your school and the COD System hold the official records.",
    sources: triage.sources,
    meta: {
      engineVersion: ENGINE_VERSION,
      mcpVersion: MCP_VERSION,
      policySnapshotDate: POLICY_SNAPSHOT_DATE,
      releaseId: RELEASE_ID,
      stateless: true as const,
    },
  };
}

export type LoanLimitExceptionPayload = ReturnType<typeof buildLoanLimitExceptionPayload>;
