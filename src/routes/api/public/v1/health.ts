import { createFileRoute } from "@tanstack/react-router";
import {
  ENGINE_VERSION,
  POLICY_YEAR,
  POLICY_SNAPSHOT_DATE,
  SOURCE_COMMIT,
  SUPPORTED_AWARD_YEARS,
} from "@/lib/sor.version";
import { corsPreflightResponse, jsonResponse } from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/v1/health")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async () =>
        jsonResponse({
          status: "ok",
          engineVersion: ENGINE_VERSION,
          policyYear: POLICY_YEAR,
          policySnapshotDate: POLICY_SNAPSHOT_DATE,
          sourceCommit: SOURCE_COMMIT,
          supportedAwardYears: SUPPORTED_AWARD_YEARS,
        }),
    },
  },
});
