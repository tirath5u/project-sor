import { createFileRoute } from "@tanstack/react-router";
import { ENGINE_VERSION, POLICY_YEAR } from "@/lib/sor.version";
import { corsPreflightResponse, jsonResponse } from "@/lib/api-errors";

export const Route = createFileRoute("/api/public/v1/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async () => {
        const spec = {
          openapi: "3.1.0",
          info: {
            title: "Public Schedule of Reductions (SOR) Calculation API",
            version: ENGINE_VERSION,
            description:
              "Public, free, portfolio-grade implementation of the Direct Loan SOR (Schedule of Reductions) calculation engine. " +
              "Source code, fixtures, and parity tests are open. See /docs for methodology.",
            license: { name: "MIT" },
          },
          servers: [{ url: "https://sor.myproduct.life", description: "Production" }],
          paths: {
            "/api/public/v1/health": {
              get: {
                summary: "Service health and version metadata",
                responses: { "200": { description: "Service is healthy" } },
              },
            },
            "/api/public/v1/scenarios": {
              get: {
                summary: "Canonical parity scenarios",
                responses: { "200": { description: "Scenario list" } },
              },
            },
            "/api/public/v1/calculate": {
              post: {
                summary: "Run an SOR calculation",
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/CalculateInput" },
                    },
                  },
                },
                responses: {
                  "200": { description: "Calculation results" },
                  "400": { description: "Invalid input (malformed JSON or unreadable body)" },
                  "405": { description: "Method not allowed (only POST and OPTIONS are supported)" },
                  "406": { description: "Not acceptable (only application/json responses)" },
                  "413": { description: "Payload too large (request body exceeds 1 MB)" },
                  "415": { description: "Unsupported media type" },
                  "422": { description: "Schema validation failed (well-formed JSON, but violates the input contract)" },
                  "429": { description: "Rate limited" },
                  "500": { description: "Internal engine error" },
                },
              },
              get: {
                summary: "Not allowed - calculate accepts POST only",
                responses: {
                  "405": { description: "Method not allowed" },
                },
              },
            },
          },
          components: {
            schemas: {
              CalculateInput: {
                type: "object",
                description:
                  "Mirrors SORInputs. Numeric fields use strict validation (no silent 0 coercion). " +
                  "term.paidSub / paidUnsub: null = blank (no anchor), 0 = explicit zero anchor. " +
                  "See /docs/methodology.md for field-level semantics.",
              },
            },
          },
          "x-policy-year": POLICY_YEAR,
          "x-request-id-header":
            "Every response includes an X-Request-Id header (also echoed in JSON " +
            "envelope). Clients may pass their own X-Request-Id (alphanumeric, " +
            "underscore, dash; up to 64 chars) and it will be echoed back.",
        };
        return jsonResponse(spec);
      },
    },
  },
});
