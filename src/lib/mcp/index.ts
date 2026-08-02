import { defineMcp } from "@lovable.dev/mcp-js";
import calculateSorTool from "./tools/calculate-sor";
import listScenariosTool from "./tools/list-scenarios";
import { MCP_VERSION } from "@/lib/sor.version";

export default defineMcp({
  name: "project-sor-mcp",
  title: "Project SOR: Schedule of Reductions",
  version: MCP_VERSION,
  instructions:
    "Public MCP server for Project SOR V56. Use `list_scenarios` to discover canonical fixtures and `calculate_sor` for the shared engine. Streamable HTTP clients should send Accept: application/json, text/event-stream and retain the MCP session identifier returned during initialization. Incomplete requests return structured needs_input responses with exact follow-up questions rather than demo defaults. Complete results include gross and net outputs, stages, warnings, modeled versus external checks, applied public sources, and release metadata. Calculations are stateless and public; no user data is retained. This is decision support, not an official Department of Education calculator. Verify NSLDS aggregate, lifetime, Parent PLUS remaining eligibility, COD, proration, R2T4, and final packaging requirements outside this service.",
  tools: [calculateSorTool, listScenariosTool],
});
