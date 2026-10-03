import { defineConfig } from "vitest/config";
import path from "node:path";
import { sourceFingerprint } from "./scripts/source-fingerprint.mjs";

// Standalone Vitest config - bypasses the TanStack Start Vite plugin so the
// pure-logic engine tests can run in a Node environment without an SSR shell.
export default defineConfig({
  define: { __SOR_SOURCE_FINGERPRINT__: JSON.stringify(sourceFingerprint()) },
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
