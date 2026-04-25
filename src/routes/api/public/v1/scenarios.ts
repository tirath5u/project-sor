import { createFileRoute } from "@tanstack/react-router";
import { serializeFixturesForPublic } from "@/lib/sor.fixtures";
import { ENGINE_VERSION, POLICY_YEAR } from "@/lib/sor.version";
import { corsPreflightResponse, jsonResponse } from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/v1/scenarios")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async () => {
        const scenarios = serializeFixturesForPublic();
        return jsonResponse({
          engineVersion: ENGINE_VERSION,
          policyYear: POLICY_YEAR,
          count: scenarios.length,
          scenarios,
        });
      },
    },
  },
});
