import { defineConfig } from "vitest/config";
import path from "node:path";
import { buildSourceCommit } from "./scripts/build-source-commit.mjs";
import { sourceFingerprint } from "./scripts/source-fingerprint.mjs";

// Standalone Vitest config - bypasses the TanStack Start Vite plugin so the
// pure-logic engine tests can run in a Node environment without an SSR shell.
const provenance = buildSourceCommit();

export default defineConfig({
  define: {
    __SOR_SOURCE_FINGERPRINT__: JSON.stringify(sourceFingerprint()),
    __SOR_SOURCE_COMMIT__: JSON.stringify(provenance.commit),
    __SOR_SOURCE_COMMIT_STATUS__: JSON.stringify(provenance.status),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
