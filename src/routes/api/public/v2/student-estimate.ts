import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { z } from "zod";
import { defaultInputs, calculateSORWithChildTerms, type TermKey } from "@/lib/sor";
import { lookupLimits } from "@/lib/loanLimits";
import { corsPreflightResponse, errorResponse, jsonResponse, methodNotAllowedResponse, resolveRequestId } from "@/lib/api-errors";
import { ENGINE_VERSION, POLICY_YEAR, POLICY_SNAPSHOT_DATE, RELEASE_ID, SOURCE_COMMIT, SOURCE_COMMIT_STATUS, DEPLOYMENT_MARKER } from "@/lib/sor.version";

const StudentEstimateSchema = z.object({
  awardYear: z.enum(["2025-26", "2026-27"]),
  programLevel: z.enum(["undergraduate", "graduate"]),
  gradeLevel: z.enum(["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7", "g8", "g9", "g10", "g11", "g12", "g13"]),
  dependency: z.enum(["dependent", "independent"]),
  fallCredits: z.number().finite().min(0).max(60),
  springCredits: z.number().finite().min(0).max(60),
  fullTimeCreditsPerTerm: z.number().finite().positive().max(60),
});

export const Route = createFileRoute("/api/public/v2/student-estimate")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async ({ request }) => methodNotAllowedResponse(["POST", "OPTIONS"], resolveRequestId(request)),
      POST: async ({ request }) => {
        const requestId = resolveRequestId(request);
        if (!(request.headers.get("content-type") || "").includes("application/json")) {
          return errorResponse("unsupported_media_type", "Content-Type must be application/json.", undefined, undefined, requestId);
        }
        let body: unknown;
        try { body = await request.json(); } catch { return errorResponse("invalid_input", "Request body is not valid JSON.", undefined, undefined, requestId); }
        const parsed = StudentEstimateSchema.safeParse(body);
        if (!parsed.success) return errorResponse("schema_validation_failed", "Student estimate inputs are incomplete or invalid.", parsed.error.issues, undefined, requestId);

        const value = parsed.data;
        const base = defaultInputs();
        const limits = lookupLimits(value.gradeLevel, value.dependency, false, value.awardYear === "2025-26");
        base.awardYear = value.awardYear;
        base.loanLimitException = value.awardYear === "2025-26";
        base.programLevel = value.programLevel;
        base.gradeLevel = value.gradeLevel;
        base.dependency = value.dependency;
        base.numStandardTerms = 2;
        base.ayFtCredits = value.fullTimeCreditsPerTerm * 2;
        base.annualNeed = limits.sub + limits.unsub;
        base.coa = limits.sub + limits.unsub;
        base.otherAid = 0;
        base.requestedGradPlus = 0;
        base.includeSummer1 = false;
        base.includeSummer2 = false;
        base.includeWinter1 = false;
        base.includeWinter2 = false;
        base.terms.term1 = { ...base.terms.term1, enabled: true, ftCredits: value.fullTimeCreditsPerTerm, enrolledCredits: value.fallCredits };
        base.terms.term2 = { ...base.terms.term2, enabled: true, ftCredits: value.fullTimeCreditsPerTerm, enrolledCredits: value.springCredits };
        for (const key of ["term3", "term4", "summer1", "summer2", "winter1", "winter2"] as TermKey[]) base.terms[key].enabled = false;

        const result = calculateSORWithChildTerms(base);
        return jsonResponse({
          status: "estimated",
          audience: "student",
          estimate: {
            sorPercent: result.sorPctRounded,
            estimatedAnnualSub: result.reducedSub,
            estimatedAnnualUnsub: result.reducedUnsub,
            estimatedAnnualTotal: result.reducedSub + result.reducedUnsub,
            grossBasis: true,
          },
          warnings: result.warnings,
          disclaimer: "This is an estimate, not an award, approval, or guarantee. The school must verify full-time definitions, COA, other aid, grade level, dependency, SAP, aggregate limits, and all other Direct Loan eligibility requirements.",
          unsupported: ["single-term", "summer", "modules", "R2T4", "paid-history", "child-terms", "Parent PLUS", "Grad PLUS", "COD", "NSLDS"],
          meta: { contractVersion: "v2", engineVersion: ENGINE_VERSION, policyYear: value.awardYear, policySnapshotDate: POLICY_SNAPSHOT_DATE, sourceCommit: SOURCE_COMMIT, sourceCommitStatus: SOURCE_COMMIT_STATUS, deploymentMarker: DEPLOYMENT_MARKER, releaseId: RELEASE_ID, computedAt: new Date().toISOString(), requestId },
        }, { headers: { "X-Request-Id": requestId } });
      },
    },
  },
});
