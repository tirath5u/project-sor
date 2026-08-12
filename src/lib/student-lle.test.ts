/**
 * Required Tests 1-7 from the student advanced LLE and Grad PLUS build brief,
 * plus the safety invariants that keep self-report out of the engine input.
 */
import { describe, it, expect } from "vitest";
import {
  triageLoanLimitException,
  LLE_EXTERNAL_CHECKS,
  type ProgramContinuity,
} from "./student-lle";
import { normalizeV2Input, type CalculateV2Input } from "./sor-v2-contract";
import { runCanonicalV2 } from "./phase-b";
import { defaultInputs } from "./sor";

const qualifying: ProgramContinuity = {
  seekingGradProfBorrowing: "yes",
  enrolledOnJune30: "yes",
  priorDirectLoanBeforeJuly1: "yes",
  statusSinceJune30: "still_enrolled",
  schoolChangedProgramOrEndDate: "no",
};

/**
 * A complete 2026-27 graduate V2 input with school-provided COA and OFA.
 * Mirrors the student adapter: only Fall and Spring are enabled, so the SOR
 * numerator is unambiguously 9 + 9 against a 24-credit academic year.
 */
function gradV2Input(overrides: Partial<CalculateV2Input> = {}): CalculateV2Input {
  const base = defaultInputs();
  const terms = { ...base.terms };
  terms.term1 = { ...base.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: 9 };
  terms.term2 = { ...base.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: 9 };
  for (const key of ["term3", "term4", "summer1", "summer2", "winter1", "winter2"] as const) {
    terms[key] = { ...base.terms[key], enabled: false, enrolledCredits: 0 };
  }
  return {
    ...base,
    awardYear: "2026-27",
    programLevel: "graduate",
    gradeLevel: "g8",
    dependency: "independent",
    numStandardTerms: 2,
    ayFtCredits: 24,
    coa: 40000,
    otherAid: 0,
    requestedGradPlus: 20000,
    terms,
    ...overrides,
  } as CalculateV2Input;
}

describe("Required Test 1: all exception facts self-reported true", () => {
  it("returns school_confirmation_needed and never an eligibility determination", () => {
    const result = triageLoanLimitException({
      programContinuity: qualifying,
      loanLimitExceptionEvidence: "unknown",
    });
    expect(result.status).toBe("school_confirmation_needed");
    // The status vocabulary is closed: only the four review states exist.
    expect([
      "school_confirmation_needed",
      "likely_not_available_from_answers",
      "insufficient_information",
      "school_record_conflict",
    ]).toContain(result.status);

    // No affirmative claim of eligibility anywhere in the payload. The word
    // "approved" is allowed only inside an explicit negation, which is the
    // disclaimer we want to keep.
    const serialized = JSON.stringify(result).toLowerCase();
    for (const affirmative of [
      "you are eligible",
      "you are approved",
      "you are grandfathered",
      "you qualify",
      "guaranteed",
      "will receive",
    ]) {
      expect(serialized).not.toContain(affirmative);
    }
    expect(serialized).toContain("not the same as being approved");
  });
});

describe("Required Test 2: withdrawal or school change after the qualifying date", () => {
  it("returns likely_not_available_from_answers for a reported withdrawal", () => {
    const result = triageLoanLimitException({
      programContinuity: { ...qualifying, statusSinceJune30: "withdrew" },
    });
    expect(result.status).toBe("likely_not_available_from_answers");
    expect(result.ruleIds).toContain("LLE_WITHDRAWAL_REPORTED");
    expect(result.reasons.join(" ")).toContain("not a determination");
  });

  it("returns likely_not_available_from_answers for a reported school change", () => {
    const result = triageLoanLimitException({
      programContinuity: { ...qualifying, statusSinceJune30: "changed_school" },
    });
    expect(result.status).toBe("likely_not_available_from_answers");
    expect(result.ruleIds).toContain("LLE_SCHOOL_CHANGE_REPORTED");
  });
});

describe("Required Test 3: approved leave and unknown school reporting", () => {
  it("routes an approved leave of absence to school confirmation", () => {
    const result = triageLoanLimitException({
      programContinuity: { ...qualifying, statusSinceJune30: "approved_leave_of_absence" },
    });
    expect(result.status).toBe("school_confirmation_needed");
    expect(result.ruleIds).toContain("LLE_APPROVED_LOA_SCHOOL_REVIEW");
  });

  it("routes uncertain school reporting to school confirmation", () => {
    const result = triageLoanLimitException({
      programContinuity: { ...qualifying, statusSinceJune30: "unsure_how_school_reported" },
    });
    expect(result.status).toBe("school_confirmation_needed");
    expect(result.ruleIds).toContain("LLE_REPORTING_UNCERTAIN_SCHOOL_REVIEW");
  });
});

describe("Required Test 4: conflicting StudentAid.gov N with qualifying facts", () => {
  it("returns school_record_conflict", () => {
    const result = triageLoanLimitException({
      programContinuity: qualifying,
      loanLimitExceptionEvidence: "student_reported_n",
    });
    expect(result.status).toBe("school_record_conflict");
    expect(result.ruleIds).toContain("LLE_REPORTED_N_VS_QUALIFYING_FACTS");
    expect(result.externalChecks.join(" ")).toContain("IE-Q19");
  });

  it("does not treat a reported N as a conflict when the facts also disqualify", () => {
    const result = triageLoanLimitException({
      programContinuity: { ...qualifying, statusSinceJune30: "withdrew" },
      loanLimitExceptionEvidence: "student_reported_n",
    });
    expect(result.status).toBe("likely_not_available_from_answers");
  });
});

describe("Required Test 5: school-confirmed exception runs the shared Grad PLUS calculation", () => {
  it("models Grad PLUS and returns every external check", () => {
    const run = runCanonicalV2(
      gradV2Input({
        loanLimitException: true,
        programContinuity: qualifying,
        loanLimitExceptionEvidence: "unknown",
        professionalClassification: "school_confirmed",
        studentDisclosureAcknowledged: true,
      }),
    );
    const triage = run.normalized.loanLimitExceptionTriage;
    expect(triage?.status).toBe("school_confirmation_needed");
    expect(triage?.gradPlusPath).toBe("modeled_estimate");
    expect(run.data.reducedGradPlus).toBeGreaterThan(0);
    // SOR applied once to the supported basis: 18 of 24 credits is 75 percent.
    expect(run.data.sorPctRounded).toBeCloseTo(0.75, 5);
    for (const check of LLE_EXTERNAL_CHECKS) {
      expect(run.normalized.externalChecks).toContain(check);
    }
  });
});

describe("Required Test 6: nonexception 2026-27 Grad PLUS request", () => {
  it("produces no Grad PLUS award and explains why", () => {
    const run = runCanonicalV2(
      gradV2Input({
        loanLimitException: false,
        programContinuity: qualifying,
        loanLimitExceptionEvidence: "student_reported_y",
        studentDisclosureAcknowledged: true,
      }),
    );
    expect(run.data.reducedGradPlus).toBe(0);
    expect(run.normalized.loanLimitExceptionTriage?.gradPlusPath).toBe("school_review_estimate");
    expect(run.normalized.externalChecks.join(" ")).toContain(
      "modeled only from a school-confirmed exception status",
    );
  });

  it("keeps a reported record disagreement from producing a Grad PLUS amount", () => {
    const run = runCanonicalV2(
      gradV2Input({
        loanLimitException: true,
        programContinuity: qualifying,
        loanLimitExceptionEvidence: "school_record_conflict",
        studentDisclosureAcknowledged: true,
      }),
    );
    expect(run.normalized.engineInput.loanLimitException).toBe(false);
    expect(run.data.reducedGradPlus).toBe(0);
    expect(run.normalized.loanLimitExceptionTriage?.status).toBe("school_record_conflict");
    // The Sub and Unsub estimate must survive; only Grad PLUS is suppressed.
    expect(run.status).not.toBe("blocked");
  });
});

describe("Required Test 7: professional classification unknown", () => {
  it("blocks a professional-limit estimate", () => {
    for (const classification of ["unknown", "not_confirmed"] as const) {
      const result = triageLoanLimitException({
        programContinuity: qualifying,
        professionalClassification: classification,
      });
      expect(result.professionalLimitEstimate).toBe("blocked");
      expect(result.ruleIds).toContain("LLE_PROFESSIONAL_CLASSIFICATION_UNCONFIRMED");
      expect(result.externalChecks.join(" ")).toContain("treated as professional");
    }
  });

  it("allows it only when the school has confirmed the classification", () => {
    const result = triageLoanLimitException({
      programContinuity: qualifying,
      professionalClassification: "school_confirmed",
    });
    expect(result.professionalLimitEstimate).toBe("available");
  });
});

describe("insufficient information", () => {
  it("returns insufficient_information when a required fact is unknown", () => {
    const result = triageLoanLimitException({
      programContinuity: { ...qualifying, priorDirectLoanBeforeJuly1: "unknown" },
    });
    expect(result.status).toBe("insufficient_information");
    expect(result.missingFacts).toContain("priorDirectLoanBeforeJuly1");
  });

  it("returns insufficient_information when nothing was answered", () => {
    const result = triageLoanLimitException({});
    expect(result.status).toBe("insufficient_information");
    expect(result.missingFacts.length).toBe(5);
  });
});

describe("safety invariants", () => {
  it("never maps a student-reported Y onto the authoritative engine input", () => {
    const normalized = normalizeV2Input(
      gradV2Input({
        programContinuity: qualifying,
        loanLimitExceptionEvidence: "student_reported_y",
        studentDisclosureAcknowledged: true,
      }),
    );
    expect(normalized.engineInput.loanLimitException).toBe(false);
    expect(normalized.loanLimitExceptionTriage?.gradPlusPath).not.toBe("modeled_estimate");
  });

  it("warns when the student disclosure has not been acknowledged", () => {
    const normalized = normalizeV2Input(
      gradV2Input({ programContinuity: qualifying, studentDisclosureAcknowledged: false }),
    );
    expect(normalized.warnings.join(" ")).toContain("disclosure has not been acknowledged");
  });

  it("does not run triage or add triage checks for a staff input with no student fields", () => {
    const normalized = normalizeV2Input(gradV2Input({ loanLimitException: true }));
    expect(normalized.loanLimitExceptionTriage).toBeUndefined();
    expect(normalized.externalChecks.join(" ")).not.toContain("self-reported facts");
  });

  it("emits no free-text personal data in the aid-office question", () => {
    const result = triageLoanLimitException({
      programContinuity: qualifying,
      loanLimitExceptionEvidence: "student_reported_n",
    });
    expect(result.aidOfficeQuestion.length).toBeGreaterThan(0);
    expect(result.aidOfficeQuestion).not.toMatch(/\b\d{3}-\d{2}-\d{4}\b/);
  });

  it("always states that a processing delay cannot be diagnosed", () => {
    const result = triageLoanLimitException({ programContinuity: qualifying });
    expect(result.delayGuidance).toContain("cannot");
  });
});
