import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CalculateV2InputSchema } from "@/lib/sor-v2-contract";
import { runCanonicalV2 } from "@/lib/phase-b";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, RELEASE_ID } from "@/lib/sor.version";

const InputSchema = z
  .object({
    input: CalculateV2InputSchema,
    resultDetail: z.enum(["summary", "detailed"]).optional().default("detailed"),
  })
  .strict();

export default defineTool({
  name: "advanced_student_estimate",
  title: "Run an advanced student estimate",
  description:
    "Run a complete institution-specific V2 scenario through the shared engine and return a student-readable gross estimate with stages, warnings, and external checks. This is decision support, not an award, and it is stateless.",
  inputSchema: {
    input: CalculateV2InputSchema,
    resultDetail: z.enum(["summary", "detailed"]).optional(),
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
            field: "input",
            label: "Complete institution-specific input",
            reason:
              "The advanced estimate requires the complete V2 input shape so it does not invent school-specific facts.",
            question:
              "Please provide the institution-specific COA, OFA, need, term, and eligibility inputs.",
          },
        ],
        validationIssues: parsed.error.issues,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        structuredContent: result as Record<string, unknown>,
      };
    }

    const run = runCanonicalV2(parsed.data.input);
    const result = {
      status: run.status,
      audience: "student-advanced",
      canUseForSchoolReview: run.authoritative,
      estimate: {
        sorPercent: run.data.sorPctRounded,
        estimatedAnnualSub: run.data.reducedSub,
        estimatedAnnualUnsub: run.data.reducedUnsub,
        estimatedAnnualGradPlus: run.data.reducedGradPlus,
        estimatedAnnualTotal:
          run.data.reducedSub + run.data.reducedUnsub + run.data.reducedGradPlus,
        grossBasis: true,
      },
      data: parsed.data.resultDetail === "detailed" ? run.data : undefined,
      contract: {
        authoritative: run.authoritative,
        calculationStatus: run.status,
        policyDecision: run.policyDecision,
        eligibilityStages: run.data.calculationStages,
        warnings: run.warnings,
        externalChecks: run.normalized.externalChecks,
      },
      disclaimer:
        "This is decision support, not an award, approval, or guarantee. The school must verify all final eligibility and disbursement requirements.",
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
