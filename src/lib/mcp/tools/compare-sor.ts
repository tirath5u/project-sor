import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CalculateV2InputSchema } from "@/lib/sor-v2-contract";
import { compareCanonicalRuns, runCanonicalV2 } from "@/lib/phase-b";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, RELEASE_ID } from "@/lib/sor.version";

const InputSchema = z
  .object({
    left: CalculateV2InputSchema,
    right: CalculateV2InputSchema,
  })
  .strict();

export default defineTool({
  name: "compare_sor",
  title: "Compare two SOR scenarios",
  description:
    "Run two complete scenarios independently through the shared V56 engine and return numeric deltas, warning changes, authoritative status, and calculation results. This tool is stateless and does not save student or scenario payloads.",
  inputSchema: { left: CalculateV2InputSchema, right: CalculateV2InputSchema },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (rawInput) => {
    const parsed = InputSchema.safeParse(rawInput);
    if (!parsed.success) {
      const result = {
        status: "needs_input",
        canCalculate: false,
        missingInputs: [
          {
            field: "left/right",
            label: "Two complete scenarios",
            reason: "Comparison requires complete V2 inputs for both scenarios.",
            question: "Please provide complete left and right calculation inputs.",
          },
        ],
        validationIssues: parsed.error.issues,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }

    const left = runCanonicalV2(parsed.data.left);
    const right = runCanonicalV2(parsed.data.right);
    const result = {
      status: "compared",
      left: {
        status: left.status,
        authoritative: left.authoritative,
        data: left.data,
        warnings: left.warnings,
        externalChecks: left.normalized.externalChecks,
      },
      right: {
        status: right.status,
        authoritative: right.authoritative,
        data: right.data,
        warnings: right.warnings,
        externalChecks: right.normalized.externalChecks,
      },
      comparison: compareCanonicalRuns(left, right),
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
