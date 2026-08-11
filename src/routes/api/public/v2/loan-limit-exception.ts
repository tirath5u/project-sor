import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import {
  CheckLoanLimitExceptionInputSchema,
  buildLoanLimitExceptionPayload,
} from "@/lib/student-lle-payload";
import {
  corsPreflightResponse,
  errorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  resolveRequestId,
} from "@/lib/api-errors";
import { SOURCE_COMMIT, SOURCE_COMMIT_STATUS, DEPLOYMENT_MARKER } from "@/lib/sor.version";

export const Route = createFileRoute("/api/public/v2/loan-limit-exception")({
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
        const parsed = CheckLoanLimitExceptionInputSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            "schema_validation_failed",
            "The loan limit exception check accepts only the documented self-report fields. Free-text and identifying data are not accepted.",
            parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
            undefined,
            requestId,
          );
        }

        try {
          const payload = buildLoanLimitExceptionPayload(parsed.data);
          return jsonResponse(
            {
              ...payload,
              meta: {
                ...payload.meta,
                sourceCommit: SOURCE_COMMIT,
                sourceCommitStatus: SOURCE_COMMIT_STATUS,
                deploymentMarker: DEPLOYMENT_MARKER,
                requestId,
              },
            },
            { headers: { "X-Request-Id": requestId } },
          );
        } catch (error) {
          return errorResponse(
            "internal_error",
            "The loan limit exception check failed.",
            error instanceof Error ? { name: error.name } : undefined,
            undefined,
            requestId,
          );
        }
      },
    },
  },
});
