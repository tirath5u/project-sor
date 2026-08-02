import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { handleCalculateRequest } from "../../../../lib/api-calculate";

export const Route = createFileRoute("/api/public/v1/calculate")({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => handleCalculateRequest(request, "v1"),
      GET: async ({ request }) => handleCalculateRequest(request, "v1"),
      POST: async ({ request }) => handleCalculateRequest(request, "v1"),
    },
  },
});
