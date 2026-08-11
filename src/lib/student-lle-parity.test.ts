/**
 * Required Test 9 (REST and MCP canonical parity) and the in-scope portion of
 * Required Test 8 (period scope). Full Test 8 term-builder coverage depends on
 * the V57 calendar-applicability normalizer, which is out of scope for this
 * task; see the handoff for the recorded deferral.
 */
import { describe, it, expect } from "vitest";
import checkLoanLimitExceptionTool from "./mcp/tools/check-loan-limit-exception";
import {
  buildLoanLimitExceptionPayload,
  nextMissingQuestion,
  STUDENT_PROMPTS,
} from "./student-lle-payload";
import { runCanonicalV2 } from "./phase-b";
import { defaultInputs } from "./sor";
import type { CalculateV2Input } from "./sor-v2-contract";

const complete = {
  programContinuity: {
    seekingGradProfBorrowing: "yes",
    enrolledOnJune30: "yes",
    priorDirectLoanBeforeJuly1: "yes",
    statusSinceJune30: "still_enrolled",
    schoolChangedProgramOrEndDate: "no",
  },
  loanLimitExceptionEvidence: "unknown",
  professionalClassification: "school_confirmed",
  studentDisclosureAcknowledged: true,
} as const;

async function callTool(input: unknown) {
  const handler = (
    checkLoanLimitExceptionTool as unknown as {
      handler: (input: unknown) => Promise<{ structuredContent: Record<string, unknown> }>;
    }
  ).handler;
  return handler(input);
}

describe("Required Test 9: REST and MCP canonical parity", () => {
  it("returns byte-equivalent canonical fields from the shared builder", async () => {
    // The REST route serializes exactly this object plus transport-only meta.
    const restPayload = buildLoanLimitExceptionPayload(complete);
    const mcp = await callTool(complete);

    const canonicalKeys = [
      "status",
      "audience",
      "headline",
      "isDetermination",
      "ruleIds",
      "reasons",
      "gradPlus",
      "professionalLimitEstimate",
      "missingFacts",
      "externalChecks",
      "aidOfficeQuestion",
      "delayGuidance",
      "disclaimer",
      "sources",
    ] as const;

    for (const key of canonicalKeys) {
      expect(JSON.stringify(mcp.structuredContent[key])).toBe(
        JSON.stringify(restPayload[key as keyof typeof restPayload]),
      );
    }
    expect(JSON.stringify(mcp.structuredContent.meta)).toBe(JSON.stringify(restPayload.meta));
  });

  it("exposes the same release metadata on both transports", async () => {
    const mcp = await callTool(complete);
    const meta = mcp.structuredContent.meta as Record<string, unknown>;
    expect(meta.engineVersion).toBeTruthy();
    expect(meta.mcpVersion).toBeTruthy();
    expect(meta.policySnapshotDate).toBeTruthy();
    expect(meta.releaseId).toBeTruthy();
    expect(meta.stateless).toBe(true);
  });

  it("never returns an eligibility determination through MCP", async () => {
    const mcp = await callTool(complete);
    expect(mcp.structuredContent.isDetermination).toBe(false);
    expect([
      "school_confirmation_needed",
      "likely_not_available_from_answers",
      "insufficient_information",
      "school_record_conflict",
    ]).toContain(mcp.structuredContent.status);
  });
});

describe("MCP elicits one question at a time", () => {
  it("asks the first unanswered question and does not invent an answer", async () => {
    const mcp = await callTool({
      programContinuity: { seekingGradProfBorrowing: "yes" },
    });
    expect(mcp.structuredContent.status).toBe("needs_input");
    const missing = (mcp.structuredContent.missingInputs as Array<Record<string, unknown>>)[0];
    expect(missing.field).toBe("programContinuity.enrolledOnJune30");
    expect(missing.question).toBe(STUDENT_PROMPTS.enrolledOnJune30);
  });

  it("returns no next question once every fact is answered", () => {
    expect(nextMissingQuestion(complete.programContinuity)).toBeNull();
  });

  it("accepts an empty call and asks the first question", async () => {
    const mcp = await callTool({});
    expect(mcp.structuredContent.status).toBe("needs_input");
    const missing = (mcp.structuredContent.missingInputs as Array<Record<string, unknown>>)[0];
    expect(missing.field).toBe("programContinuity.seekingGradProfBorrowing");
  });

  it("rejects undocumented fields rather than accepting free text", async () => {
    const mcp = await callTool({
      studentName: "test",
      programContinuity: complete.programContinuity,
    });
    expect(mcp.structuredContent.status).toBe("needs_input");
    expect(mcp.structuredContent.canTriage).toBe(false);
  });
});

describe("Required Test 8, in-scope portion: student period scope", () => {
  /**
   * Mirrors what `buildAdvanced` in `/student/advanced` actually sends. The
   * engine default enables Term 3 and a 3-term year; the student adapter
   * deliberately narrows that to Fall, Spring, and an optional Summer 1.
   */
  function studentInput(overrides: Partial<CalculateV2Input> = {}): CalculateV2Input {
    const base = defaultInputs();
    const terms = { ...base.terms };
    terms.term1 = { ...base.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: 12 };
    terms.term2 = { ...base.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: 12 };
    for (const key of ["term3", "term4", "summer1", "summer2", "winter1", "winter2"] as const) {
      terms[key] = { ...base.terms[key], enabled: false, enrolledCredits: 0 };
    }
    return {
      ...base,
      awardYear: "2026-27",
      numStandardTerms: 2,
      ayFtCredits: 24,
      terms,
      ...overrides,
    } as CalculateV2Input;
  }

  it("supports Fall and Spring with no reduction at full time", () => {
    const run = runCanonicalV2(studentInput());
    expect(run.data.sorPctRounded).toBeCloseTo(1, 5);
  });

  it("supports an enabled summer term without changing the denominator silently", () => {
    const withoutSummer = runCanonicalV2(studentInput());
    const baseTerms = studentInput().terms;
    const summerTerms = { ...baseTerms };
    summerTerms.summer1 = {
      ...(baseTerms.summer1 as NonNullable<(typeof baseTerms)["summer1"]>),
      enabled: true,
      ftCredits: 12,
      enrolledCredits: 6,
    };
    const withSummer = runCanonicalV2(
      studentInput({
        includeSummer1: true,
        summerPosition: "trailer",
        terms: summerTerms,
      } as Partial<CalculateV2Input>),
    );
    // The academic-year denominator is caller-supplied and must not move just
    // because a period was enabled.
    expect(withSummer.normalized.engineInput.ayFtCredits).toBe(
      withoutSummer.normalized.engineInput.ayFtCredits,
    );
  });

  it("keeps Term 3, Term 4, Winter 1, and Winter 2 disabled in the student scope", () => {
    const run = runCanonicalV2(studentInput());
    for (const key of ["term3", "term4", "winter1", "winter2"] as const) {
      expect(run.normalized.engineInput.terms[key]?.enabled).toBe(false);
    }
  });
});
