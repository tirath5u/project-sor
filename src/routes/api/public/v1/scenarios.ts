import { createFileRoute } from "@tanstack/react-router";
import { serializeFixturesForPublic } from "@/lib/sor.fixtures";
import { ENGINE_VERSION, POLICY_YEAR } from "@/lib/sor.version";
import {
  corsPreflightResponse,
  jsonResponse,
  methodNotAllowedResponse,
  resolveRequestId,
} from "@/lib/api-errors";

const ALLOWED_METHODS = ["GET", "OPTIONS"];

export const Route = createFileRoute("/api/public/v1/scenarios")({
  server: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async ({ request }: { request: Request }) => {
        const requestId = resolveRequestId(request);
        const scenarios = serializeFixturesForPublic();
        return jsonResponse(
          {
            engineVersion: ENGINE_VERSION,
            policyYear: POLICY_YEAR,
            count: scenarios.length,
            scenarios,
            requestId,
          },
          { headers: { "X-Request-Id": requestId } },
        );
      },
      POST: async ({ request }: { request: Request }) => {
        const requestId = resolveRequestId(request);
        return methodNotAllowedResponse(ALLOWED_METHODS, requestId);
      },
  },
});
