import { defineConfig } from "vitest/config";
import path from "node:path";

// Standalone Vitest config — bypasses the TanStack Start Vite plugin so the
// pure-logic engine tests can run in a Node environment without an SSR shell.
export default defineConfig({
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
