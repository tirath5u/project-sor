/**
 * Student-facing Loan Limit Exception triage.
 *
 * This module is decision support only. It classifies a student's self-reported
 * program-continuity facts into one of four review states. It never determines
 * eligibility, never returns "eligible" or "grandfathered", and never maps a
 * student answer onto the authoritative `loanLimitException` engine input.
 *
 * Policy sources:
 * - Department, Frequently Asked Questions: Loan Limits (May 20, 2026),
 *   IE-Q16 (dual-program continuity, CIP Number 1 matching, correction path)
 *   and IE-Q19 (schools cannot override; COD may update the status on request).
 * - July 2026 COD Technical Reference, Volume 2, Loan Limit Exception section:
 *   continuity is evaluated from Program CIP Code and Program Credential Level
 *   in CIP Number 1 of all disbursements.
 * - `knowledge/curated/2026-08-07-jennifer-atsu-edit150-cip1-program-continuity.md`
 * - `knowledge/curated/cod-obbb-implementation-guide.md`
 *
 * The Department FAQ establishes that a valid dual-program student can retain
 * the interim exception even when COD's automated CIP Number 1 match does not
 * recognise it. That is why a self-reported qualifying history that conflicts
 * with a school or federal-system record resolves to `school_record_conflict`
 * and a COD review route, not to a negative determination.
 */

import { z } from "zod";

export const LOAN_LIMIT_EXCEPTION_POLICY_SOURCES = [
  "Department, Frequently Asked Questions: Loan Limits (May 20, 2026), IE-Q16 and IE-Q19",
  "July 2026 COD Technical Reference, Volume 2, Loan Limit Exception",
] as const;

/** Self-reported or school-reported evidence about the COD exception flag. */
export const LoanLimitExceptionEvidenceSchema = z.enum([
  "student_reported_y",
  "student_reported_n",
  "unknown",
  "school_record_conflict",
]);
export type LoanLimitExceptionEvidence = z.infer<typeof LoanLimitExceptionEvidenceSchema>;

/** Whether the school has confirmed the program is treated as professional. */
export const ProfessionalClassificationSchema = z.enum([
  "school_confirmed",
  "not_confirmed",
  "unknown",
]);
export type ProfessionalClassification = z.infer<typeof ProfessionalClassificationSchema>;

const YesNoUnknownSchema = z.enum(["yes", "no", "unknown"]);

/**
 * Structured self-report. Every field is optional so a partially completed
 * flow degrades to `insufficient_information` rather than a false negative.
 * No CIP code is ever requested from a student.
 */
export const ProgramContinuitySchema = z
  .object({
    /** Q1: seeking graduate or professional borrowing for 2026-27. */
    seekingGradProfBorrowing: YesNoUnknownSchema.optional(),
    /** Q2: enrolled in the pursued program at this school on June 30, 2026. */
    enrolledOnJune30: YesNoUnknownSchema.optional(),
    /** Q3: received a Direct Loan for that same program before July 1, 2026. */
    priorDirectLoanBeforeJuly1: YesNoUnknownSchema.optional(),
    /** Q4: what the school has recorded since June 30. */
    statusSinceJune30: z
      .enum([
        "still_enrolled",
        "withdrew",
        "changed_school",
        "changed_degree_or_credential",
        "approved_leave_of_absence",
        "unsure_how_school_reported",
        "unknown",
      ])
      .optional(),
    /** Q5: school-driven program, credential, or reported end-date change. */
    schoolChangedProgramOrEndDate: z
      .enum(["no", "yes_program_or_credential", "yes_end_date_only", "unknown"])
      .optional(),
  })
  .strict();
export type ProgramContinuity = z.infer<typeof ProgramContinuitySchema>;

export type LleTriageStatus =
  | "school_confirmation_needed"
  | "likely_not_available_from_answers"
  | "insufficient_information"
  | "school_record_conflict";

/** Whether a Grad PLUS figure may be shown at all, and on what basis. */
export type GradPlusPath = "outside_modeled_path" | "school_review_estimate" | "modeled_estimate";

export interface LleTriageResult {
  status: LleTriageStatus;
  /** Stable identifiers so REST and MCP assert the same rule fired. */
  ruleIds: string[];
  reasons: string[];
  externalChecks: string[];
  gradPlusPath: GradPlusPath;
  professionalLimitEstimate: "available" | "blocked";
  missingFacts: string[];
  aidOfficeQuestion: string;
  delayGuidance: string;
  sources: string[];
}

export interface LleTriageInput {
  programContinuity?: ProgramContinuity;
  loanLimitExceptionEvidence?: LoanLimitExceptionEvidence;
  professionalClassification?: ProfessionalClassification;
  /**
   * The authoritative, school-confirmed exception input. This is the same
   * canonical field the staff calculator uses. A student self-report never
   * sets it. Supplied here only so triage can report which Grad PLUS path
   * applies.
   */
  schoolConfirmedLoanLimitException?: boolean;
  /** Whether institution-provided COA and OFA were supplied for sizing. */
  hasSchoolProvidedCoaAndOfa?: boolean;
}

/**
 * External checks that always apply to a student-facing exception or Grad PLUS
 * answer. These are surfaced verbatim by REST and MCP so both transports return
 * the same registry.
 */
export const LLE_EXTERNAL_CHECKS = [
  "NSLDS aggregate and lifetime remaining eligibility must be verified outside this tool.",
  "The school must confirm how it classifies the program for loan-limit treatment.",
  "Final cost of attendance and other financial assistance are set by the school.",
  "Satisfactory Academic Progress is determined by the school.",
  "The COD System holds the authoritative Loan Limit Exception status.",
  "Final packaging, certification, and disbursement decisions belong to the school.",
] as const;

const QUESTION_LABELS: Record<string, string> = {
  seekingGradProfBorrowing:
    "whether you are seeking graduate or professional borrowing for 2026-27",
  enrolledOnJune30: "whether you were enrolled in this program on June 30, 2026",
  priorDirectLoanBeforeJuly1:
    "whether you received a Direct Loan for this same program before July 1, 2026",
  statusSinceJune30: "what your school has recorded since June 30, 2026",
  schoolChangedProgramOrEndDate:
    "whether your school changed your program, credential, or reported end date",
};

function isUnknown(value: string | undefined): boolean {
  return value === undefined || value === "unknown";
}

/**
 * Classify self-reported facts. Precedence is deliberate:
 * a record conflict outranks a negative read, a negative read outranks a
 * missing fact, and everything else routes to school confirmation.
 */
export function triageLoanLimitException(input: LleTriageInput): LleTriageResult {
  const continuity = input.programContinuity ?? {};
  const evidence = input.loanLimitExceptionEvidence ?? "unknown";
  const professional = input.professionalClassification ?? "unknown";

  const ruleIds: string[] = [];
  const reasons: string[] = [];

  const missingFacts = (
    [
      "seekingGradProfBorrowing",
      "enrolledOnJune30",
      "priorDirectLoanBeforeJuly1",
      "statusSinceJune30",
      "schoolChangedProgramOrEndDate",
    ] as const
  ).filter((key) => isUnknown(continuity[key]));

  const hardDisqualifiers: string[] = [];
  if (continuity.enrolledOnJune30 === "no") {
    hardDisqualifiers.push(
      "You reported that you were not enrolled in this program on June 30, 2026.",
    );
    ruleIds.push("LLE_NOT_ENROLLED_JUNE_30");
  }
  if (continuity.priorDirectLoanBeforeJuly1 === "no") {
    hardDisqualifiers.push(
      "You reported that you did not receive a Direct Loan for this program before July 1, 2026.",
    );
    ruleIds.push("LLE_NO_QUALIFYING_PRIOR_LOAN");
  }
  if (continuity.statusSinceJune30 === "withdrew") {
    hardDisqualifiers.push(
      "You reported that your school recorded a withdrawal from this program.",
    );
    ruleIds.push("LLE_WITHDRAWAL_REPORTED");
  }
  if (continuity.statusSinceJune30 === "changed_school") {
    hardDisqualifiers.push("You reported a change of school.");
    ruleIds.push("LLE_SCHOOL_CHANGE_REPORTED");
  }
  if (continuity.statusSinceJune30 === "changed_degree_or_credential") {
    hardDisqualifiers.push("You reported a change of degree or credential level.");
    ruleIds.push("LLE_CREDENTIAL_CHANGE_REPORTED");
  }
  if (continuity.schoolChangedProgramOrEndDate === "yes_program_or_credential") {
    hardDisqualifiers.push("You reported that your school changed your program or credential.");
    ruleIds.push("LLE_SCHOOL_CHANGED_PROGRAM");
  }

  const softReviewTriggers: string[] = [];
  if (continuity.statusSinceJune30 === "approved_leave_of_absence") {
    softReviewTriggers.push(
      "An approved leave of absence is not a withdrawal, but only your school can confirm how the leave was recorded and reported.",
    );
    ruleIds.push("LLE_APPROVED_LOA_SCHOOL_REVIEW");
  }
  if (continuity.statusSinceJune30 === "unsure_how_school_reported") {
    softReviewTriggers.push(
      "You are not sure how your school reported your enrollment. Only the school's record can settle that.",
    );
    ruleIds.push("LLE_REPORTING_UNCERTAIN_SCHOOL_REVIEW");
  }
  if (continuity.schoolChangedProgramOrEndDate === "yes_end_date_only") {
    softReviewTriggers.push(
      "A changed program end date can affect how long the exception can last. Your school must confirm the expected time to credential.",
    );
    ruleIds.push("LLE_END_DATE_CHANGE_SCHOOL_REVIEW");
  }

  // A self-report is "qualifying" only when every required fact is present and
  // nothing disqualifying was reported.
  const selfReportQualifies =
    missingFacts.length === 0 && hardDisqualifiers.length === 0 && softReviewTriggers.length === 0;

  let status: LleTriageStatus;

  if (evidence === "school_record_conflict") {
    status = "school_record_conflict";
    ruleIds.push("LLE_EVIDENCE_CONFLICT_REPORTED");
    reasons.push(
      "You reported that a school or federal record disagrees with your own understanding of your exception status.",
    );
  } else if (evidence === "student_reported_n" && selfReportQualifies) {
    status = "school_record_conflict";
    ruleIds.push("LLE_REPORTED_N_VS_QUALIFYING_FACTS");
    reasons.push(
      "Your answers describe a history that could support the interim exception, but you reported a Loan Limit Exception Flag of N. The Department's FAQ IE-Q16 confirms that a valid dual-program or continuing student can hold the exception even when the automated match does not identify it, so this difference needs review rather than acceptance.",
    );
  } else if (evidence === "student_reported_y" && hardDisqualifiers.length > 0) {
    status = "school_record_conflict";
    ruleIds.push("LLE_REPORTED_Y_VS_DISQUALIFYING_FACTS");
    reasons.push(
      "You reported a Loan Limit Exception Flag of Y, but you also reported a change that can end the exception. Only your school and COD can reconcile those two facts.",
    );
    reasons.push(...hardDisqualifiers);
  } else if (hardDisqualifiers.length > 0) {
    status = "likely_not_available_from_answers";
    reasons.push(...hardDisqualifiers);
    reasons.push(
      "Based on these answers the interim exception does not appear to be available. This is not a determination of your eligibility. Your school and COD hold the records that decide it.",
    );
  } else if (missingFacts.length > 0) {
    status = "insufficient_information";
    ruleIds.push("LLE_INSUFFICIENT_INFORMATION");
    reasons.push(
      `More information is needed about ${missingFacts
        .map((key) => QUESTION_LABELS[key])
        .join(", ")}.`,
    );
  } else if (softReviewTriggers.length > 0) {
    status = "school_confirmation_needed";
    reasons.push(...softReviewTriggers);
  } else {
    status = "school_confirmation_needed";
    ruleIds.push("LLE_SELF_REPORT_CONSISTENT_PENDING_CONFIRMATION");
    reasons.push(
      "Your answers are consistent with the conditions for the interim exception. That is not the same as being approved. COD holds the official status and your school must confirm it.",
    );
  }

  if (continuity.seekingGradProfBorrowing === "no") {
    ruleIds.push("LLE_UNDERGRADUATE_PATH_NOTE");
    reasons.push(
      "For undergraduate borrowing, program continuity is matched on school and credential level only, and a change of major does not end the exception. Graduate and professional amount estimates are outside this flow.",
    );
  }

  const professionalLimitEstimate =
    professional === "school_confirmed" ? ("available" as const) : ("blocked" as const);
  if (professionalLimitEstimate === "blocked") {
    ruleIds.push("LLE_PROFESSIONAL_CLASSIFICATION_UNCONFIRMED");
  }

  // Grad PLUS may only be modeled from a school-confirmed exception input.
  // A student self-report never unlocks it.
  let gradPlusPath: GradPlusPath;
  if (status !== "school_confirmation_needed") {
    gradPlusPath = "outside_modeled_path";
  } else if (input.schoolConfirmedLoanLimitException === true && input.hasSchoolProvidedCoaAndOfa) {
    gradPlusPath = "modeled_estimate";
  } else {
    gradPlusPath = "school_review_estimate";
  }
  if (gradPlusPath === "outside_modeled_path") {
    ruleIds.push("GRAD_PLUS_OUTSIDE_MODELED_PATH");
  }

  const externalChecks: string[] = [...LLE_EXTERNAL_CHECKS];
  if (professionalLimitEstimate === "blocked") {
    externalChecks.push(
      "A professional annual-limit estimate is not shown because the school has not confirmed the program is treated as professional.",
    );
  }
  if (status === "school_record_conflict") {
    externalChecks.push(
      "Ask the school to review the Loan Limit Exception status with COD. Under FAQ IE-Q19 a school cannot change it through an automated process, but it may ask COD to update the status and may submit a list of affected students.",
    );
  }

  return {
    status,
    ruleIds,
    reasons,
    externalChecks,
    gradPlusPath,
    professionalLimitEstimate,
    missingFacts,
    aidOfficeQuestion: buildAidOfficeQuestion(status, continuity, evidence),
    delayGuidance:
      "This tool cannot see your school's system or COD, and it cannot tell you why a package or a disbursement is delayed. If your aid has not appeared, ask your financial aid office whether the loan has been originated, whether COD accepted it, and whether anything is still pending on their side.",
    sources: [...LOAN_LIMIT_EXCEPTION_POLICY_SOURCES],
  };
}

/**
 * A copyable question for the aid office. Contains no name, identifier, date of
 * birth, or other personal data, only the reported situation.
 */
function buildAidOfficeQuestion(
  status: LleTriageStatus,
  continuity: ProgramContinuity,
  evidence: LoanLimitExceptionEvidence,
): string {
  const base =
    "I am asking about the interim exception to the 2026-27 Direct Loan limits, sometimes called the loan limit exception or legacy borrower status.";

  if (status === "school_record_conflict") {
    return `${base} My own record of my enrollment does not appear to match the exception status being applied${
      evidence === "student_reported_n" ? ", which I understand is currently N" : ""
    }. Could you check the Loan Limit Exception status COD holds for me, confirm which program and credential level are being reported in CIP Number 1 on my most recent loans, and let me know whether a correction or a COD review is needed?`;
  }

  if (status === "likely_not_available_from_answers") {
    return `${base} I believe a change to my enrollment or program may have ended my eligibility for it. Could you confirm what my current exception status is, what loan limits now apply to me, and whether the change was reported the way I understand it?`;
  }

  if (status === "insufficient_information") {
    return `${base} I am not certain of some of the details. Could you confirm whether I was enrolled in my current program on June 30, 2026, whether I received a Direct Loan for that program before July 1, 2026, and what exception status COD currently holds for me?`;
  }

  const dualProgramNote =
    continuity.statusSinceJune30 === "still_enrolled"
      ? " If I am enrolled in more than one program, please also confirm which program is being reported in CIP Number 1, since COD matches on that field."
      : "";
  return `${base} My understanding is that I was enrolled in my program on June 30, 2026 and received a Direct Loan for it before July 1, 2026. Could you confirm the exception status COD currently holds for me and whether anything further is needed from me?${dualProgramNote}`;
}

/** Human-readable summary line used by the UI and by both transports. */
export function describeTriageStatus(status: LleTriageStatus): string {
  switch (status) {
    case "school_confirmation_needed":
      return "Your school and COD need to confirm this";
    case "likely_not_available_from_answers":
      return "Your answers suggest this may not be available";
    case "insufficient_information":
      return "More information is needed";
    case "school_record_conflict":
      return "Your answers and your school's record do not agree";
  }
}
