import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { serializeFixturesForPublic } from "@/lib/sor.fixtures";
import { ENGINE_VERSION, POLICY_YEAR, RELEASE_ID } from "@/lib/sor.version";
import {
  corsPreflightResponse,
  jsonResponse,
  methodNotAllowedResponse,
  resolveRequestId,
} from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/v2/scenarios")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async ({ request }) => {
        const requestId = resolveRequestId(request);
        const scenarios = serializeFixturesForPublic();
        return jsonResponse(
          {
            contractVersion: "v2",
            engineVersion: ENGINE_VERSION,
            policyYear: POLICY_YEAR,
            releaseId: RELEASE_ID,
            count: scenarios.length,
            scenarios,
            requestId,
          },
          { headers: { "X-Request-Id": requestId } },
        );
      },
      POST: async ({ request }) =>
        methodNotAllowedResponse(["GET", "OPTIONS"], resolveRequestId(request)),
    },
  },
});
