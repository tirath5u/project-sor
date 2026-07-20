import { defineMcp } from "@lovable.dev/mcp-js";
import calculateSorTool from "./tools/calculate-sor";
import listScenariosTool from "./tools/list-scenarios";

export default defineMcp({
  name: "project-sor-mcp",
  title: "Project SOR — Schedule of Reductions",
  version: "0.1.0",
  instructions:
    "Public MCP server for the Schedule of Reductions (SOR) calculator. Use `list_scenarios` to discover canonical borrower scenarios and valid input shapes, then `calculate_sor` to run the ED five-step SOR engine on your own inputs (award year, grade level, enrollment credits per term, financial need, etc.). All calculations are stateless and public; no user data is retained. This is a decision-support tool — production packaging must still be verified against NSLDS aggregate and lifetime-limit checks outside this calculator.",
  tools: [calculateSorTool, listScenariosTool],
});