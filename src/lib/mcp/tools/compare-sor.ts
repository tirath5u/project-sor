import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CalculateV2InputSchema } from "@/lib/sor-v2-contract";
import { compareCanonicalRuns, runCanonicalV2 } from "@/lib/phase-b";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, RELEASE_ID } from "@/lib/sor.version";
import { publicReviewReasons } from "@/lib/mcp/public-review";
import type { SORInputs } from "@/lib/sor";

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
    "Run two complete scenarios independently through the shared SOR engine and compare numeric results, term payouts, warnings, and authority status. Do not include student identifiers.",
  inputSchema: { left: CalculateV2InputSchema, right: CalculateV2InputSchema },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
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
    const missingInputs = [
      ...left.normalized.missingRequiredInputs.map((item) => ({ ...item, field: `left.${item.field}` })),
      ...right.normalized.missingRequiredInputs.map((item) => ({ ...item, field: `right.${item.field}` })),
    ];
    if (missingInputs.length > 0) {
      const result = { status: "needs_input", canCalculate: false, missingInputs, nextQuestions: missingInputs.map((item) => item.question) };
      return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result as Record<string, unknown> };
    }
    const reviewReasons = [
      ...publicReviewReasons(left.normalized.engineInput as SORInputs, left.data, left.normalized).map((reason) => `Left: ${reason}`),
      ...publicReviewReasons(right.normalized.engineInput as SORInputs, right.data, right.normalized).map((reason) => `Right: ${reason}`),
      ...(left.normalized.blocked ? left.normalized.warnings.map((reason) => `Left: ${reason}`) : []),
      ...(right.normalized.blocked ? right.normalized.warnings.map((reason) => `Right: ${reason}`) : []),
    ];
    if (left.normalized.blocked || right.normalized.blocked || reviewReasons.length > 0) {
      const result = {
        status: left.normalized.blocked || right.normalized.blocked ? "blocked" : "review_required",
        canCalculate: false,
        reviewReasons: [...new Set(reviewReasons)],
        meta: { engineVersion: ENGINE_VERSION, mcpVersion: MCP_VERSION, releaseId: RELEASE_ID },
      };
      return { content: [{ type: "text", text: JSON.stringify(result) }], structuredContent: result as Record<string, unknown> };
    }
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
