import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { z } from "zod";
import { corsPreflightResponse, errorResponse, jsonResponse, methodNotAllowedResponse, resolveRequestId } from "@/lib/api-errors";
import { APPROVED_MIGRATION_FIXTURE_IDS, compareApprovedMigrationFixture, getApprovedMigrationFixtures } from "@/lib/migration";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, RELEASE_ID, SOURCE_COMMIT, SOURCE_COMMIT_STATUS, DEPLOYMENT_MARKER } from "@/lib/sor.version";

const MigrationRequestSchema = z.object({
  fixtureId: z.enum(APPROVED_MIGRATION_FIXTURE_IDS),
}).strict();

export const Route = createFileRoute("/api/public/v2/migration-compare")({
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
        const parsed = MigrationRequestSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            "schema_validation_failed",
            "Provide the id of an approved V55 to V56 migration fixture.",
            { approvedFixtureIds: getApprovedMigrationFixtures(), issues: parsed.error.issues },
            undefined,
            requestId,
          );
        }

        const comparison = compareApprovedMigrationFixture(parsed.data.fixtureId);
        if (!comparison) {
          return errorResponse("not_found", "The requested migration fixture is not approved.", undefined, undefined, requestId);
        }

        return jsonResponse({
          status: "compared",
          audience: "staff",
          comparison,
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
      },
    },
  },
});
