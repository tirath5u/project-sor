import { readFileSync } from "node:fs";
import { sourceFingerprint } from "./source-fingerprint.mjs";

(globalThis as Record<string, unknown>).__SOR_SOURCE_FINGERPRINT__ = sourceFingerprint();
(globalThis as Record<string, unknown>).__SOR_SOURCE_COMMIT__ = null;
(globalThis as Record<string, unknown>).__SOR_SOURCE_COMMIT_STATUS__ = "not_available_in_lovable_build";

const { ENGINE_VERSION, MCP_VERSION, RELEASE_ID } = await import("../src/lib/sor.version.ts");
const decision = JSON.parse(readFileSync("plugin/release-decision.json", "utf8"));
const plugin = JSON.parse(readFileSync("plugin/plugin.json", "utf8"));
const connection = JSON.parse(readFileSync("plugin/mcp.json", "utf8"));

const expected = {
  reviewedSourceFingerprint: sourceFingerprint(),
  releaseId: RELEASE_ID,
  engineVersion: ENGINE_VERSION,
  mcpVersion: MCP_VERSION,
  pluginPackageVersion: plugin.version,
  outcome: "compatible_backend_only",
};

for (const [key, value] of Object.entries(expected)) {
  if (decision[key] !== value) {
    throw new Error(`Plugin release decision ${key} is stale: expected ${value}`);
  }
}

if (connection.mcpServers?.[plugin.name]?.url !== "https://sor.myproduct.life/mcp") {
  throw new Error("Plugin MCP connection does not target the production SOR server");
}
if (plugin.extensions?.["com.openai"]?.interface?.displayName !== "Schedule of Reductions (SOR)") {
  throw new Error("Public plugin name differs from the approved listing");
}

console.log(`Plugin release decision is current for ${RELEASE_ID} and package ${plugin.version}`);
