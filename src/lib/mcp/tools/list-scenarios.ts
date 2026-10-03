import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { serializeFixturesForPublic } from "@/lib/sor.fixtures";
import { ENGINE_VERSION, POLICY_YEAR, RELEASE_ID } from "@/lib/sor.version";

export default defineTool({
  name: "list_scenarios",
  title: "List canonical SOR scenarios",
  description:
    "Return public source-backed SOR fixtures with inputs, expected outputs, and citations. Use this to discover valid input shapes and verify calculation behavior.",
  inputSchema: {
    id: z
      .string()
      .optional()
      .describe(
        "Optional fixture id (e.g. 'fixture-v19-001'). When set, returns only that fixture.",
      ),
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async ({ id }) => {
    const all = serializeFixturesForPublic();
    const scenarios = id ? all.filter((s) => s.id === id) : all;
    if (id && scenarios.length === 0) {
      return {
        content: [{ type: "text", text: `No scenario found with id '${id}'.` }],
        isError: true,
      };
    }
    const payload = {
      engineVersion: ENGINE_VERSION,
      policyYear: POLICY_YEAR,
      releaseId: RELEASE_ID,
      sourceSet: ["direct-loan-sor-v1", "project-sor-v56-rule-corrections"],
      count: scenarios.length,
      scenarios,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload as unknown as Record<string, unknown>,
    };
  },
});
