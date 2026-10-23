import { createFileRoute } from "@tanstack/react-router";
import { createTanStackInvokeToolHandler } from "@lovable.dev/mcp-js/stacks/tanstack";
import mcp from "../../../lib/mcp/index";
import { unknownToolFields } from "../../../lib/mcp/strict-input";

const sdkHandler = createTanStackInvokeToolHandler(mcp, {
  resourcePath: "/mcp",
  metadataPath: "/.well-known/oauth-protected-resource",
  trustForwardedHost: true,
});

async function handleInvoke(ctx: { request: Request; params: { tool: string } }): Promise<Response> {
  if (ctx.request.method !== "POST") return sdkHandler(ctx);
  const args = await ctx.request.clone().json().catch(() => null);
  const fields = unknownToolFields(ctx.params.tool, args);
  if (fields.length > 0) {
    return new Response(JSON.stringify({ error: "unsupported input fields", fields }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  return sdkHandler(ctx);
}

export const Route = createFileRoute("/.mcp/invoke-tool/$tool")({
  server: { handlers: { ANY: handleInvoke } },
});
