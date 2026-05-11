import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import {
  ENGINE_VERSION,
  POLICY_YEAR,
  POLICY_SNAPSHOT_DATE,
  SOURCE_COMMIT,
  SUPPORTED_AWARD_YEARS,
} from "@/lib/sor.version";
import {
  corsPreflightResponse,
  jsonResponse,
  methodNotAllowedResponse,
  resolveRequestId,
} from "@/lib/api-errors";

const ALLOWED_METHODS = ["GET", "OPTIONS"];

export const Route = createFileRoute("/api/public/v1/health")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async ({ request }) => {
        const requestId = resolveRequestId(request);
        return jsonResponse(
          {
            status: "ok",
            engineVersion: ENGINE_VERSION,
            policyYear: POLICY_YEAR,
            policySnapshotDate: POLICY_SNAPSHOT_DATE,
            sourceCommit: SOURCE_COMMIT,
            supportedAwardYears: SUPPORTED_AWARD_YEARS,
            requestId,
          },
          { headers: { "X-Request-Id": requestId } },
        );
      },
      POST: async ({ request }) => {
        const requestId = resolveRequestId(request);
        return methodNotAllowedResponse(ALLOWED_METHODS, requestId);
      },
    },
  },
});
