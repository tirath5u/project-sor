import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import {
  ENGINE_VERSION,
  MCP_VERSION,
  POLICY_SNAPSHOT_DATE,
  POLICY_YEAR,
  RELEASE_ID,
  SUPPORTED_AWARD_YEARS,
} from "@/lib/sor.version";
import { corsPreflightResponse, jsonResponse } from "@/lib/api-errors";
import { PARITY_FIXTURES } from "@/lib/sor.fixtures";
import { calculateSORWithChildTerms } from "@/lib/sor";

export const Route = createFileRoute("/api/public/v1/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async () => {
        const exampleScenario = PARITY_FIXTURES[0];
        const exampleResult = calculateSORWithChildTerms(exampleScenario.input);
        const exampleStableData = {
          totalFinalSub: exampleScenario.expected.totalFinalSub ?? exampleResult.totalFinalSub,
          totalFinalUnsub: exampleScenario.expected.totalFinalUnsub ?? exampleResult.totalFinalUnsub,
          reducedSub: exampleScenario.expected.reducedSub ?? exampleResult.reducedSub,
          reducedUnsub: exampleScenario.expected.reducedUnsub ?? exampleResult.reducedUnsub,
          sorPctRounded: exampleResult.sorPctRounded,
          sorApplicable: exampleScenario.expected.sorApplicable ?? exampleResult.sorApplicable,
          effectiveCombinedLimit:
            exampleScenario.expected.effectiveCombinedLimit ?? exampleResult.effectiveCombinedLimit,
          subBaseline: exampleScenario.expected.subBaseline ?? exampleResult.subBaseline,
          unsubBaseline: exampleScenario.expected.unsubBaseline ?? exampleResult.unsubBaseline,
          termResults: exampleResult.termResults.map((term) => ({
            key: term.key,
            label: term.label,
            enabled: term.enabled,
            eligible: term.eligible,
            status: term.status,
            finalSub: term.finalSub,
            finalUnsub: term.finalUnsub,
            finalGradPlus: term.finalGradPlus,
          })),
        };

        const spec = {
          openapi: "3.1.0",
          info: {
            title: "Public Schedule of Reductions (SOR) Calculation API",
            version: ENGINE_VERSION,
            description:
              "Public, free, source-backed implementation of the V56 Direct Loan SOR (Schedule of Reductions) calculation engine. " +
              "Source code, fixtures, and parity tests are open. See /api-docs for usage guidance.",
            license: { name: "MIT" },
          },
          servers: [{ url: "https://sor.myproduct.life", description: "Production" }],
          paths: {
            "/api/public/v1/health": {
              get: {
                summary: "Service health and version metadata",
                operationId: "getHealth",
                responses: {
                  "200": {
                    description: "Service is healthy",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/HealthResponse" },
                        example: {
                          status: "ok",
                          engineVersion: ENGINE_VERSION,
                          mcpVersion: MCP_VERSION,
                          policyYear: POLICY_YEAR,
                          policySnapshotDate: POLICY_SNAPSHOT_DATE,
                          releaseId: RELEASE_ID,
                          sourceCommit: "local-dev",
                          supportedAwardYears: SUPPORTED_AWARD_YEARS,
                          requestId: "demo-sor-001",
                        },
                      },
                    },
                  },
                },
              },
            },
            "/api/public/v1/scenarios": {
              get: {
                summary: "Canonical parity scenarios",
                operationId: "listScenarios",
                responses: {
                  "200": {
                    description: "Scenario list",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ScenariosResponse" },
                        example: {
                          engineVersion: ENGINE_VERSION,
                          policyYear: POLICY_YEAR,
                          count: PARITY_FIXTURES.length,
                          scenarios: [
                            {
                              id: exampleScenario.id,
                              description: exampleScenario.description,
                              sourceRefs: exampleScenario.sourceRefs,
                              sourceStatus: exampleScenario.sourceStatus ?? "confirmed",
                              assertionLevel: exampleScenario.assertionLevel ?? "strict",
                              asOfDate: exampleScenario.asOfDate ?? POLICY_SNAPSHOT_DATE,
                              input: exampleScenario.input,
                              expected: exampleScenario.expected,
                            },
                          ],
                          requestId: "demo-sor-001",
                        },
                      },
                    },
                  },
                },
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
                          data: exampleStableData,
                          meta: {
                            engineVersion: ENGINE_VERSION,
                            policyYear: POLICY_YEAR,
                            policySnapshotDate: POLICY_SNAPSHOT_DATE,
                            sourceCommit: "local-dev",
                            policyStatus: "supported-preliminary",
                            sourceSet: [
                              "direct-loan-sor-v1",
                              "project-sor-v56-rule-corrections",
                            ],
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
                        example: {
                          error: {
                            code: "invalid_input",
                            message: "Request body is not valid JSON.",
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "405": {
                    description: "Method not allowed (only POST and OPTIONS are supported)",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "method_not_allowed",
                            message: "Method not allowed. Allowed: POST, OPTIONS.",
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "406": {
                    description: "Not acceptable (only application/json responses)",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "not_acceptable",
                            message: "Only application/json responses are supported.",
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "413": {
                    description: "Payload too large (request body exceeds 1 MB)",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "payload_too_large",
                            message: "Request body exceeds 1000000 bytes.",
                            details: { maxBytes: 1000000 },
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "415": {
                    description: "Unsupported media type",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "unsupported_media_type",
                            message: "Content-Type must be application/json.",
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "422": {
                    description:
                      "Schema validation failed (well-formed JSON, but violates the input contract)",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "schema_validation_failed",
                            message: "Input failed schema validation.",
                            details: [
                              {
                                path: ["viewMode"],
                                message: "Required",
                              },
                            ],
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "429": {
                    description: "Rate limited",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "rate_limited",
                            message: "Rate limit exceeded. Try again shortly.",
                            details: { retryAfterSec: 2 },
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                  "500": {
                    description: "Internal engine error",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "internal_error",
                            message: "Calculation engine threw an unexpected error.",
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                },
              },
              get: {
                summary: "Not allowed. Calculate accepts POST only.",
                operationId: "calculateSorWrongMethod",
                responses: {
                  "405": {
                    description: "Method not allowed",
                    content: {
                      "application/json": {
                        schema: { $ref: "#/components/schemas/ErrorResponse" },
                        example: {
                          error: {
                            code: "method_not_allowed",
                            message: "Method not allowed. Allowed: POST, OPTIONS.",
                            requestId: "demo-sor-001",
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          components: {
            schemas: {
              HealthResponse: {
                type: "object",
                required: [
                  "status",
                  "engineVersion",
                  "mcpVersion",
                  "policyYear",
                  "policySnapshotDate",
                  "releaseId",
                  "sourceCommit",
                  "supportedAwardYears",
                  "requestId",
                ],
                additionalProperties: false,
                properties: {
                  status: { type: "string", enum: ["ok"] },
                  engineVersion: { type: "string", example: ENGINE_VERSION },
                  mcpVersion: { type: "string", example: MCP_VERSION },
                  policyYear: { type: "string", example: POLICY_YEAR },
                  policySnapshotDate: { type: "string", example: POLICY_SNAPSHOT_DATE },
                  releaseId: { type: "string", example: RELEASE_ID },
                  sourceCommit: { type: "string", example: "local-dev" },
                  supportedAwardYears: {
                    type: "object",
                    additionalProperties: { type: "string" },
                    example: SUPPORTED_AWARD_YEARS,
                  },
                  requestId: { type: "string", example: "demo-sor-001" },
                },
              },
              ScenarioFixture: {
                type: "object",
                required: [
                  "id",
                  "description",
                  "sourceRefs",
                  "sourceStatus",
                  "assertionLevel",
                  "asOfDate",
                  "input",
                  "expected",
                ],
                additionalProperties: false,
                properties: {
                  id: { type: "string", example: exampleScenario.id },
                  description: { type: "string", example: exampleScenario.description },
                  sourceRefs: {
                    type: "array",
                    items: { type: "string" },
                    example: exampleScenario.sourceRefs,
                  },
                  sourceStatus: { type: "string", enum: ["confirmed", "preliminary"] },
                  assertionLevel: { type: "string", enum: ["strict", "directional"] },
                  asOfDate: { type: "string", format: "date" },
                  input: { $ref: "#/components/schemas/CalculateInput" },
                  expected: {
                    type: "object",
                    description: "Stable field-level assertions for this fixture.",
                    additionalProperties: true,
                  },
                },
              },
              ScenariosResponse: {
                type: "object",
                required: ["engineVersion", "policyYear", "count", "scenarios", "requestId"],
                additionalProperties: false,
                properties: {
                  engineVersion: { type: "string", example: ENGINE_VERSION },
                  policyYear: { type: "string", example: POLICY_YEAR },
                  count: { type: "integer", minimum: 0, example: PARITY_FIXTURES.length },
                  scenarios: {
                    type: "array",
                    items: { $ref: "#/components/schemas/ScenarioFixture" },
                  },
                  requestId: { type: "string", example: "demo-sor-001" },
                },
              },
              CalculateInput: {
                type: "object",
                additionalProperties: false,
                description:
                  "Mirrors SORInputs. Numeric fields use strict validation (no silent 0 coercion). " +
                  "term.paidSub / paidUnsub: null means blank (no anchor), 0 means explicit zero anchor. " +
                  "The optional childTerms object allocates an already-calculated parent gross payout " +
                  "by child credits or equally across active credited child terms; zero-credit children " +
                  "receive zero and paid child gross remains anchored. " +
                  "feeSubUnsubPercent and feeGradPlusPercent control net display from gross. " +
                  "The engine does not calculate NSLDS aggregate limits, lifetime maximum eligibility, " +
                  "Parent PLUS remaining eligibility, or consolidation allocation. " +
                  "The example below is the first published scenario from /api/public/v1/scenarios.",
                properties: {
                  childTerms: { $ref: "#/components/schemas/ChildTermsInput" },
                  feeSubUnsubPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    default: 1.057,
                    description: "Direct Subsidized/Unsubsidized fee percentage applied to gross for net display.",
                  },
                  feeGradPlusPercent: {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    default: 4.228,
                    description: "Direct PLUS fee percentage applied to gross for net display.",
                  },
                },
                example: exampleScenario.input,
              },
              ChildTermsInput: {
                type: "object",
                required: ["count", "allocationMethod", "parents"],
                additionalProperties: false,
                description:
                  "Optional V56 allocation layer. Parent SOR is calculated first; child rows do not create " +
                  "new SOR terms or level funds across parent terms.",
                properties: {
                  count: { type: "integer", minimum: 0, maximum: 4, example: 2 },
                  allocationMethod: {
                    type: "string",
                    enum: ["byChildCredits", "equalAcrossActiveChildTerms"],
                    example: "equalAcrossActiveChildTerms",
                  },
                  parents: {
                    type: "object",
                    additionalProperties: {
                      type: "array",
                      items: {
                        type: "object",
                        required: ["credits"],
                        additionalProperties: false,
                        properties: {
                          credits: { type: "number", minimum: 0, maximum: 60 },
                          paidGross: {
                            type: "object",
                            additionalProperties: false,
                            properties: {
                              sub: { type: ["number", "null"], minimum: 0 },
                              unsub: { type: ["number", "null"], minimum: 0 },
                              gradPlus: { type: ["number", "null"], minimum: 0 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
              TermResultStable: {
                type: "object",
                required: [
                  "key",
                  "label",
                  "enabled",
                  "eligible",
                  "status",
                  "finalSub",
                  "finalUnsub",
                  "finalGradPlus",
                ],
                additionalProperties: true,
                properties: {
                  key: { type: "string", example: "term1" },
                  label: { type: "string", example: "Fall" },
                  enabled: { type: "boolean", example: true },
                  eligible: { type: "boolean", example: true },
                  status: {
                    type: "string",
                    enum: ["eligible", "below_half_time", "off"],
                    example: "eligible",
                  },
                  finalSub: { type: "number", example: 1102 },
                  finalUnsub: { type: "number", example: 630 },
                  finalGradPlus: { type: "number", example: 0 },
                },
              },
              SORResultsStable: {
                type: "object",
                required: [
                  "totalFinalSub",
                  "totalFinalUnsub",
                  "reducedSub",
                  "reducedUnsub",
                  "sorPctRounded",
                  "sorApplicable",
                  "termResults",
                ],
                additionalProperties: true,
                description:
                  "Stable public calculation fields. The API may return additional engine diagnostics.",
                properties: {
                  totalFinalSub: { type: "number", example: exampleStableData.totalFinalSub },
                  totalFinalUnsub: { type: "number", example: exampleStableData.totalFinalUnsub },
                  reducedSub: { type: "number", example: exampleStableData.reducedSub },
                  reducedUnsub: { type: "number", example: exampleStableData.reducedUnsub },
                  sorPctRounded: { type: "number", example: exampleStableData.sorPctRounded },
                  sorApplicable: { type: "boolean", example: exampleStableData.sorApplicable },
                  effectiveCombinedLimit: {
                    type: "number",
                    example: exampleStableData.effectiveCombinedLimit,
                  },
                  subBaseline: { type: "number", example: exampleStableData.subBaseline },
                  unsubBaseline: { type: "number", example: exampleStableData.unsubBaseline },
                  termResults: {
                    type: "array",
                    items: { $ref: "#/components/schemas/TermResultStable" },
                  },
                },
              },
              CalculateMeta: {
                type: "object",
                required: [
                  "engineVersion",
                  "policyYear",
                  "policySnapshotDate",
                  "sourceCommit",
                  "policyStatus",
                  "sourceSet",
                  "citations",
                  "computedAt",
                  "requestId",
                ],
                additionalProperties: false,
                properties: {
                  engineVersion: { type: "string", example: ENGINE_VERSION },
                  policyYear: { type: "string", example: POLICY_YEAR },
                  policySnapshotDate: { type: "string", example: POLICY_SNAPSHOT_DATE },
                  sourceCommit: { type: "string", example: "local-dev" },
                  policyStatus: {
                    type: "string",
                    enum: ["confirmed", "supported-preliminary"],
                  },
                  sourceSet: {
                    type: "array",
                    items: { type: "string" },
                    example: [
                      "direct-loan-sor-v1",
                      "project-sor-v56-rule-corrections",
                    ],
                  },
                  citations: {
                    type: "array",
                    items: { type: "string" },
                  },
                  computedAt: { type: "string", format: "date-time" },
                  requestId: { type: "string", example: "demo-sor-001" },
                },
              },
              CalculateResponse: {
                type: "object",
                required: ["data", "meta"],
                additionalProperties: false,
                properties: {
                  data: { $ref: "#/components/schemas/SORResultsStable" },
                  meta: { $ref: "#/components/schemas/CalculateMeta" },
                },
              },
              ErrorResponse: {
                type: "object",
                required: ["error"],
                additionalProperties: false,
                properties: {
                  error: {
                    type: "object",
                    required: ["code", "message"],
                    additionalProperties: false,
                    properties: {
                      code: {
                        type: "string",
                        enum: [
                          "invalid_input",
                          "schema_validation_failed",
                          "payload_too_large",
                          "method_not_allowed",
                          "unsupported_media_type",
                          "not_acceptable",
                          "rate_limited",
                          "internal_error",
                          "not_found",
                        ],
                        example: "schema_validation_failed",
                      },
                      message: {
                        type: "string",
                        example: "Input failed schema validation.",
                      },
                      details: {
                        description:
                          "Optional machine-readable error details. Shape depends on the error code.",
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
            "Every response includes an X-Request-Id header and echoes it in the JSON envelope. " +
            "Clients may pass their own X-Request-Id (alphanumeric, underscore, dash; up to 64 chars).",
          "x-contract-testing":
            "The repository includes a contract script and Postman/Newman collection that replay the documented OpenAPI example against /api/public/v1/calculate.",
        };
        return jsonResponse(spec);
      },
    },
  },
});
