import { createFileRoute } from "@tanstack/react-router";
import { ENGINE_VERSION, POLICY_YEAR } from "@/lib/sor.version";
import { corsPreflightResponse, jsonResponse } from "@/lib/api-errors";
import { PARITY_FIXTURES } from "@/lib/sor.fixtures";

export const Route = createFileRoute("/api/public/v1/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async () => {
        const exampleScenario = PARITY_FIXTURES[0];
        const spec = {
          openapi: "3.1.0",
          info: {
            title: "Public Schedule of Reductions (SOR) Calculation API",
            version: ENGINE_VERSION,
            description:
              "Public, free, portfolio-grade implementation of the Direct Loan SOR (Schedule of Reductions) calculation engine. " +
              "Source code, fixtures, and parity tests are open. See /api-docs for usage guidance.",
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
                operationId: "calculateSor",
                parameters: [
                  {
                    name: "X-Request-Id",
                    in: "header",
                    required: false,
                    description:
                      "Optional client supplied correlation ID. Alphanumeric, underscore, and dash only. Up to 64 characters.",
                    schema: { type: "string", example: "demo-sor-001" },
                  },
                ],
                requestBody: {
                  required: true,
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/CalculateInput" },
                      example: exampleScenario.input,
                      examples: {
                        firstPublishedScenario: {
                          summary: exampleScenario.description,
                          value: exampleScenario.input,
                        },
                      },
                    },
                  },
                },
                responses: {
                  "200": {
                    description: "Calculation results",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/CalculateResponse" },
                        example: {
                          data: exampleScenario.expected,
                          meta: {
                            engineVersion: ENGINE_VERSION,
                            policyYear: POLICY_YEAR,
                            policySnapshotDate: "2026-04-25",
                            sourceCommit: "local-dev",
                            policyStatus: "supported-preliminary",
                            sourceSet: ["direct-loan-sor-v1"],
                            citations: [],
                            computedAt: "2026-04-26T00:00:00.000Z",
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "400": {
                    description: "Invalid input (malformed JSON or unreadable body)",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                      },
                    },
                  },
                  "405": {
                    description: "Method not allowed (only POST and OPTIONS are supported)",
                  },
                  "406": { description: "Not acceptable (only application/json responses)" },
                  "413": { description: "Payload too large (request body exceeds 1 MB)" },
                  "415": { description: "Unsupported media type" },
                  "422": {
                    description:
                      "Schema validation failed (well-formed JSON, but violates the input contract)",
                  },
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
                additionalProperties: false,
                description:
                  "Mirrors SORInputs. Numeric fields use strict validation (no silent 0 coercion). " +
                  "term.paidSub / paidUnsub: null = blank (no anchor), 0 = explicit zero anchor. " +
                  "The example below is the first published scenario from /api/public/v1/scenarios.",
                example: exampleScenario.input,
              },
              CalculateResponse: {
                type: "object",
                required: ["data", "meta"],
                properties: {
                  data: {
                    type: "object",
                    description:
                      "SOR calculation results. The response can include additional engine fields over time.",
                  },
                  meta: {
                    type: "object",
                    required: [
                      "engineVersion",
                      "policyYear",
                      "policySnapshotDate",
                      "sourceCommit",
                      "policyStatus",
                      "sourceSet",
                      "computedAt",
                      "requestId",
                    ],
                    properties: {
                      engineVersion: { type: "string", example: ENGINE_VERSION },
                      policyYear: { type: "string", example: POLICY_YEAR },
                      policySnapshotDate: { type: "string", example: "2026-04-25" },
                      sourceCommit: { type: "string", example: "local-dev" },
                      policyStatus: {
                        type: "string",
                        enum: ["confirmed", "supported-preliminary"],
                      },
                      sourceSet: {
                        type: "array",
                        items: { type: "string" },
                        example: ["direct-loan-sor-v1"],
                      },
                      citations: {
                        type: "array",
                        items: { type: "string" },
                      },
                      computedAt: { type: "string", format: "date-time" },
                      requestId: { type: "string", example: "demo-sor-001" },
                    },
                  },
                },
              },
              ErrorResponse: {
                type: "object",
                required: ["error"],
                properties: {
                  error: {
                    type: "object",
                    required: ["code", "message"],
                    properties: {
                      code: {
                        type: "string",
                        example: "schema_validation_failed",
                      },
                      message: {
                        type: "string",
                        example: "Input failed schema validation.",
                      },
                      details: {
                        type: "array",
                        items: { type: "object" },
                      },
                      requestId: { type: "string", example: "demo-sor-001" },
                    },
                  },
                },
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
