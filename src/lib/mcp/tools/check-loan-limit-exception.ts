import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  CheckLoanLimitExceptionInputSchema,
  buildLoanLimitExceptionPayload,
  nextMissingQuestion,
  STUDENT_PROMPTS,
} from "@/lib/student-lle-payload";
import {
  LoanLimitExceptionEvidenceSchema,
  ProfessionalClassificationSchema,
  ProgramContinuitySchema,
} from "@/lib/student-lle";

export default defineTool({
  name: "check_loan_limit_exception",
  title: "Check whether a Loan Limit Exception needs school review",
  description:
    "Triage a student's self-reported program-continuity facts against the 2026-27 interim exception conditions. Returns one of school_confirmation_needed, likely_not_available_from_answers, insufficient_information, or school_record_conflict, with the external checks and a copyable aid-office question. This never returns eligible, grandfathered, or approved, never determines eligibility, and never promises a disbursement. Ask any missing question one at a time using the returned nextQuestion. Stateless and public.",
  inputSchema: {
    programContinuity: ProgramContinuitySchema.optional(),
    loanLimitExceptionEvidence: LoanLimitExceptionEvidenceSchema.optional(),
    professionalClassification: ProfessionalClassificationSchema.optional(),
    schoolConfirmedLoanLimitException: z.boolean().optional(),
    hasSchoolProvidedCoaAndOfa: z.boolean().optional(),
    studentDisclosureAcknowledged: z.boolean().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (rawInput) => {
    const parsed = CheckLoanLimitExceptionInputSchema.safeParse(rawInput ?? {});
    if (!parsed.success) {
      const result = {
        status: "needs_input",
        canTriage: false,
        missingInputs: [
          {
            field: "programContinuity",
            label: "Self-reported program continuity",
            reason:
              "Only the documented self-report fields are accepted. Identifying data and free text are refused by design.",
            question: STUDENT_PROMPTS.enrolledOnJune30,
          },
        ],
        validationIssues: parsed.error.issues,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }

    // Elicit one question at a time when the caller has not answered everything.
    const missing = nextMissingQuestion(parsed.data.programContinuity);
    if (missing) {
      const partial = buildLoanLimitExceptionPayload(parsed.data);
      const result = {
        status: "needs_input" as const,
        canTriage: false,
        triageStatusIfAnsweredNow: partial.status,
        missingInputs: [
          {
            field: missing.field,
            label: "Next question",
            reason: "The triage stays at insufficient_information until this is answered.",
            question: missing.question,
          },
        ],
        remainingFacts: partial.missingFacts,
        disclaimer: partial.disclaimer,
        sources: partial.sources,
        meta: partial.meta,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }

    const payload = buildLoanLimitExceptionPayload(parsed.data);
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload as unknown as Record<string, unknown>,
    };
  },
});
