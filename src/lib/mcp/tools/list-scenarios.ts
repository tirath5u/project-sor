import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { serializeFixturesForPublic } from "@/lib/sor.fixtures";
import { ENGINE_VERSION, POLICY_YEAR, RELEASE_ID } from "@/lib/sor.version";

export default defineTool({
  name: "list_scenarios",
  title: "List published SOR scenarios",
  description:
    "Return public SOR fixtures with inputs, expected outputs, source references, sourceStatus, and assertionLevel. Directional or preliminary fixtures are regression examples, not Department-certified dollar oracles. Use them to discover input shapes and compare supported behavior.",
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
