// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/tanstack/vite";

export default defineConfig({
  // @lovable.dev/mcp-js 0.24.0 has a Windows-only path separator check that
  // rejects an otherwise valid generated route tree. The routes are committed
  // and remain available for local verification; Lovable's Linux build keeps
  // the generator enabled.
  plugins: process.platform === "win32" ? [] : [mcpPlugin()],
});
