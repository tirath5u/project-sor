import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { z } from "zod";
import { CalculateV2InputSchema } from "@/lib/sor-v2-contract";
import { compareCanonicalRuns, runCanonicalV2 } from "@/lib/phase-b";
import { corsPreflightResponse, errorResponse, jsonResponse, methodNotAllowedResponse, resolveRequestId } from "@/lib/api-errors";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, RELEASE_ID, SOURCE_COMMIT, SOURCE_COMMIT_STATUS, DEPLOYMENT_MARKER } from "@/lib/sor.version";

const CompareSchema = z.object({
  left: CalculateV2InputSchema,
  right: CalculateV2InputSchema,
}).strict();

export const Route = createFileRoute("/api/public/v2/compare")({
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
        const parsed = CompareSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            "schema_validation_failed",
            "Both left and right scenarios must be complete V2 calculation inputs.",
            parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
            undefined,
            requestId,
          );
        }

        try {
          const left = runCanonicalV2(parsed.data.left);
          const right = runCanonicalV2(parsed.data.right);
          return jsonResponse({
            status: "compared",
            audience: "staff",
            left: {
              status: left.status,
              authoritative: left.authoritative,
              data: left.data,
              warnings: left.warnings,
              externalChecks: left.normalized.externalChecks,
              policyDecision: left.policyDecision,
            },
            right: {
              status: right.status,
              authoritative: right.authoritative,
              data: right.data,
              warnings: right.warnings,
              externalChecks: right.normalized.externalChecks,
              policyDecision: right.policyDecision,
            },
            comparison: compareCanonicalRuns(left, right),
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
          }, { headers: { "X-Request-Id": requestId } });
        } catch (error) {
          return errorResponse("internal_error", "Comparison engine failed.", error instanceof Error ? { name: error.name } : undefined, undefined, requestId);
        }
      },
    },
  },
});

