import { createFileRoute } from "@tanstack/react-router";
import { createTanStackMcpHandler } from "@lovable.dev/mcp-js/stacks/tanstack";
import mcp from "../lib/mcp/index";
import { unknownToolFields } from "../lib/mcp/strict-input";

const sdkHandler = createTanStackMcpHandler(mcp, {
  resourcePath: "/mcp",
  metadataPath: "/.well-known/oauth-protected-resource",
  trustForwardedHost: true,
});

async function handleMcp(ctx: { request: Request }): Promise<Response> {
  if (ctx.request.method !== "POST") return sdkHandler(ctx);
  const body = await ctx.request.clone().json().catch(() => null);
  const messages = Array.isArray(body) ? body : [body];
  const invalid = messages.find((message) => message?.method === "tools/call" &&
    unknownToolFields(message.params?.name, message.params?.arguments).length > 0);
  if (invalid) {
    const fields = unknownToolFields(invalid.params.name, invalid.params.arguments);
    return new Response(JSON.stringify({
      jsonrpc: "2.0",
      id: invalid.id ?? null,
      result: {
        content: [{ type: "text", text: `Unsupported input fields: ${fields.join(", ")}. Remove identifying or unsupported fields and retry.` }],
        isError: true,
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  }
  return sdkHandler(ctx);
}

export const Route = createFileRoute("/mcp")({
  server: { handlers: { ANY: handleMcp } },
});
