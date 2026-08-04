import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  APPROVED_MIGRATION_FIXTURE_IDS,
  compareApprovedMigrationFixture,
  getApprovedMigrationFixtures,
} from "@/lib/migration";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, RELEASE_ID } from "@/lib/sor.version";

const InputSchema = z
  .object({
    fixtureId: z.enum(APPROVED_MIGRATION_FIXTURE_IDS),
  })
  .strict();

export default defineTool({
  name: "compare_sor_versions",
  title: "Compare approved V55 and V56 results",
  description:
    "Compare an approved V55 baseline fixture with the current V56 engine. This is a read-only migration aid for approved fixtures only, not a general historical calculator.",
  inputSchema: {
    fixtureId: z.enum(APPROVED_MIGRATION_FIXTURE_IDS),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (rawInput) => {
    const parsed = InputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const result = {
        status: "needs_input",
        canCalculate: false,
        missingInputs: [
          {
            field: "fixtureId",
            label: "Approved migration fixture",
            reason: "Historical comparison is limited to approved V55 baselines.",
            question: "Which approved migration fixture should be compared?",
            options: getApprovedMigrationFixtures(),
          },
        ],
        validationIssues: parsed.error.issues,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }
    const comparison = compareApprovedMigrationFixture(parsed.data.fixtureId);
    const result = {
      status: "compared",
      comparison,
      meta: {
        engineVersion: ENGINE_VERSION,
        mcpVersion: MCP_VERSION,
        policySnapshotDate: POLICY_SNAPSHOT_DATE,
        releaseId: RELEASE_ID,
        stateless: true,
      },
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result as Record<string, unknown>,
    };
  },
});
