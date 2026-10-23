import mcp from "./index";

export function unknownToolFields(toolName: string, args: unknown): string[] {
  if (!args || typeof args !== "object" || Array.isArray(args)) return [];
  const tool = mcp.tools.find((item) => item.name === toolName);
  if (!tool) return [];
  const allowed = new Set(Object.keys(tool.inputSchema ?? {}));
  return Object.keys(args).filter((key) => !allowed.has(key));
}
