import { defineMcp } from "@lovable.dev/mcp-js";
import calculateSorTool from "./tools/calculate-sor";
import listScenariosTool from "./tools/list-scenarios";
import compareSorTool from "./tools/compare-sor";
import advancedStudentEstimateTool from "./tools/advanced-student-estimate";
import checkLoanLimitExceptionTool from "./tools/check-loan-limit-exception";
import { MCP_VERSION } from "@/lib/sor.version";

export default defineMcp({
  name: "project-sor-mcp",
  title: "Project SOR: Schedule of Reductions",
  version: MCP_VERSION,
  instructions:
    "Public MCP server for Project SOR. Use list_scenarios for fixtures, calculate_sor for one scenario, compare_sor for two scenarios, advanced_student_estimate for a student projection, and check_loan_limit_exception for a review-only triage of self-reported facts. Incomplete requests return specific follow-up questions. Detailed calculation stages are available on request. This is decision support, not an official Department of Education calculator. Verify aggregate limits, COD, proration, R2T4, and final packaging requirements separately. Do not include student identifiers in requests.",
  tools: [
    calculateSorTool,
    listScenariosTool,
    compareSorTool,
    advancedStudentEstimateTool,
    checkLoanLimitExceptionTool,
  ],
});
