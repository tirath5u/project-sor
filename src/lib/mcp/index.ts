import { defineMcp } from "@lovable.dev/mcp-js";
import calculateSorTool from "./tools/calculate-sor";
import listScenariosTool from "./tools/list-scenarios";

export default defineMcp({
  name: "project-sor-mcp",
  title: "Project SOR: Schedule of Reductions",
  version: "0.2.0",
  instructions:
    "Public MCP server for the Project SOR calculator. Use `list_scenarios` to discover canonical scenarios and `calculate_sor` for parent-term SOR calculations with optional v55 child/module allocation. Child allocation runs after the parent SOR result and never creates a second SOR calculation. Calculations are stateless and public; no user data is retained. This is decision support, not an official Department of Education calculator. Verify NSLDS aggregate, lifetime, COD, proration, and final packaging requirements outside this service.",
  tools: [calculateSorTool, listScenariosTool],
});
