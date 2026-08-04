import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { z } from "zod";
import { CalculateV2InputSchema } from "@/lib/sor-v2-contract";
import { runCanonicalV2 } from "@/lib/phase-b";
import {
  corsPreflightResponse,
  errorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  resolveRequestId,
} from "@/lib/api-errors";
import {
  ENGINE_VERSION,
  MCP_VERSION,
  POLICY_SNAPSHOT_DATE,
  RELEASE_ID,
  SOURCE_COMMIT,
  SOURCE_COMMIT_STATUS,
  DEPLOYMENT_MARKER,
} from "@/lib/sor.version";

const AdvancedStudentSchema = z
  .object({
    input: CalculateV2InputSchema,
    resultDetail: z.enum(["summary", "detailed"]).optional().default("detailed"),
  })
  .strict();

export const Route = createFileRoute("/api/public/v2/student-advanced")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async ({ request }) =>
        methodNotAllowedResponse(["POST", "OPTIONS"], resolveRequestId(request)),
      POST: async ({ request }) => {
        const requestId = resolveRequestId(request);
        if (!(request.headers.get("content-type") || "").includes("application/json")) {
          return errorResponse(
            "unsupported_media_type",
            "Content-Type must be application/json.",
            undefined,
            undefined,
            requestId,
          );
        }
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse(
            "invalid_input",
            "Request body is not valid JSON.",
            undefined,
            undefined,
            requestId,
          );
        }
        const parsed = AdvancedStudentSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            "schema_validation_failed",
            "Advanced student estimates require a complete institution-specific V2 calculation input.",
            parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
            undefined,
            requestId,
          );
        }

        try {
          const run = runCanonicalV2(parsed.data.input);
          const result = run.data;
          return jsonResponse(
            {
              status: run.status,
              audience: "student-advanced",
              canUseForSchoolReview: run.authoritative,
              estimate: {
                sorPercent: result.sorPctRounded,
                estimatedAnnualSub: result.reducedSub,
                estimatedAnnualUnsub: result.reducedUnsub,
                estimatedAnnualGradPlus: result.reducedGradPlus,
                estimatedAnnualTotal:
                  result.reducedSub + result.reducedUnsub + result.reducedGradPlus,
                grossBasis: true,
              },
              data: parsed.data.resultDetail === "detailed" ? result : undefined,
              contract: {
                authoritative: run.authoritative,
                calculationStatus: run.status,
                policyDecision: run.policyDecision,
                eligibilityStages: result.calculationStages,
                modeledInputs: result.modeledInputs,
                externalChecks: run.normalized.externalChecks,
                warnings: run.warnings,
              },
              disclaimer:
                "This advanced estimate is decision support, not an award, approval, or guarantee. The school must verify COA, OFA, need, aggregate eligibility, institutional definitions, timing, SAP, proration, R2T4, COD, NSLDS, and all other requirements.",
              unsupported: [
                "final award",
                "COD origination",
                "NSLDS records",
                "institutional approval",
              ],
              meta: {
                engineVersion: ENGINE_VERSION,
                mcpVersion: MCP_VERSION,
                policySnapshotDate: POLICY_SNAPSHOT_DATE,
                releaseId: RELEASE_ID,
                sourceCommit: SOURCE_COMMIT,
                sourceCommitStatus: SOURCE_COMMIT_STATUS,
                deploymentMarker: DEPLOYMENT_MARKER,
                stateless: true,
                requestId,
              },
            },
            { headers: { "X-Request-Id": requestId } },
          );
        } catch (error) {
          return errorResponse(
            "internal_error",
            "Advanced estimate engine failed.",
            error instanceof Error ? { name: error.name } : undefined,
            undefined,
            requestId,
          );
        }
      },
    },
  },
});
