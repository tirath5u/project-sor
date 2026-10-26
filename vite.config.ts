// @lovable.dev/vite-tanstack-config already includes the following - do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { buildSourceCommit } from "./scripts/build-source-commit.mjs";
import { sourceFingerprint } from "./scripts/source-fingerprint.mjs";

const provenance = buildSourceCommit();

export default defineConfig({
  vite: {
    define: {
      __SOR_SOURCE_FINGERPRINT__: JSON.stringify(sourceFingerprint()),
      __SOR_SOURCE_COMMIT__: JSON.stringify(provenance.commit),
      __SOR_SOURCE_COMMIT_STATUS__: JSON.stringify(provenance.status),
    },
  },
  // The MCP routes are committed and owned here so raw input can be checked
  // before the SDK strips unknown tool arguments.
});
