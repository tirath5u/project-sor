import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { corsPreflightResponse, jsonResponse } from "@/lib/api-errors";
import { ENGINE_VERSION, MCP_VERSION, POLICY_SNAPSHOT_DATE, POLICY_YEAR, RELEASE_ID } from "@/lib/sor.version";

const AWARD_YEARS = ["2025-26", "2026-27"];

const termProperties = {
  enabled: { type: "boolean" },
  ftCredits: { type: "number", minimum: 0, maximum: 60 },
  enrolledCredits: { type: "number", minimum: 0, maximum: 60 },
  disbursed: { type: "boolean" },
  actualCredits: { type: "number", minimum: 0, maximum: 60 },
  paidSub: { type: ["number", "null"], minimum: 0 },
  paidUnsub: { type: ["number", "null"], minimum: 0 },
  refundSub: { type: ["number", "null"], minimum: 0 },
  refundUnsub: { type: ["number", "null"], minimum: 0 },
  paidGradPlus: { type: ["number", "null"], minimum: 0 },
  refundGradPlus: { type: ["number", "null"], minimum: 0 },
};

const childTermsSchema = {
  type: "object",
  additionalProperties: false,
  required: ["count", "allocationMethod", "parents"],
  properties: {
    count: { type: "integer", enum: [0, 1, 2, 3, 4] },
    allocationMethod: { type: "string", enum: ["byChildCredits", "equalAcrossActiveChildTerms"] },
    parents: {
      type: "object",
      additionalProperties: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["credits"],
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
};

const spec = {
  openapi: "3.1.0",
  info: {
    title: "Project SOR V56 API",
    version: ENGINE_VERSION,
    description: "Source-backed Schedule of Reductions calculation API. V2 adds release metadata, V56 calculation stages, warnings, and a student estimate route.",
    license: { name: "MIT" },
  },
  servers: [{ url: "https://sor.myproduct.life", description: "Production" }],
  paths: {
    "/api/public/v2/health": { get: { summary: "V56 health and release metadata", responses: { "200": { description: "Healthy", content: { "application/json": { schema: { $ref: "#/components/schemas/HealthResponse" } } } } } } },
    "/api/public/v2/scenarios": { get: { summary: "Canonical scenario fixtures", responses: { "200": { description: "Scenario catalog", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } } } } },
    "/api/public/v2/calculate": {
      post: {
        summary: "Run the V56 SOR engine",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CalculateInput" } } } },
        responses: {
          "200": { description: "Calculation result", content: { "application/json": { schema: { $ref: "#/components/schemas/CalculateResponse" } } } },
          "400": { description: "Malformed request" },
          "415": { description: "Content-Type must be application/json" },
          "422": { description: "Schema validation failed" },
          "429": { description: "Rate limited" },
        },
      },
    },
    "/api/public/v2/student-estimate": {
      post: {
        summary: "Student-friendly standard Fall and Spring estimate",
        description: "A narrow estimate for a standard two-term path. It is not an award, approval, or final school determination.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/StudentEstimateInput" } } } },
        responses: { "200": { description: "Estimate", content: { "application/json": { schema: { type: "object", additionalProperties: true } } } }, "422": { description: "Invalid estimate inputs" } },
      },
    },
  },
  components: {
    schemas: {
      HealthResponse: {
        type: "object",
        required: ["status", "contractVersion", "engineVersion", "mcpVersion", "policyYear", "policySnapshotDate", "releaseId", "deploymentMarker", "sourceCommit", "sourceCommitStatus", "supportedAwardYears"],
        properties: {
          status: { type: "string", enum: ["ok"] }, contractVersion: { type: "string", example: "v2" }, engineVersion: { type: "string", example: ENGINE_VERSION }, mcpVersion: { type: "string", example: MCP_VERSION }, policyYear: { type: "string", example: POLICY_YEAR }, policySnapshotDate: { type: "string", example: POLICY_SNAPSHOT_DATE }, releaseId: { type: "string", example: RELEASE_ID }, deploymentMarker: { type: "string", example: RELEASE_ID }, sourceCommit: { type: ["string", "null"], example: null }, sourceCommitStatus: { type: "string", example: "not_available_in_lovable_build" }, supportedAwardYears: { type: "object", additionalProperties: { type: "string" } },
        },
      },
      CalculateInput: {
        type: "object",
        additionalProperties: false,
        required: ["awardYear", "programLevel", "gradeLevel", "dependency", "loanPeriodScope", "ayType", "numStandardTerms", "ayFtCredits", "annualNeed", "coa", "otherAid", "terms"],
        properties: {
          awardYear: { type: "string", enum: AWARD_YEARS }, programLevel: { type: "string", enum: ["undergraduate", "graduate"] }, gradeLevel: { type: "string" }, dependency: { type: "string", enum: ["dependent", "independent"] }, parentPlusDenied: { type: "boolean" }, loanLimitException: { type: "boolean" }, loanPeriodScope: { type: "string", enum: ["annualMultiTerm", "singleTerm"] }, ayType: { type: "string", enum: ["SAY", "BBAY1", "BBAY2"] }, numStandardTerms: { type: "integer", minimum: 1, maximum: 4 }, ayFtCredits: { type: "number", minimum: 0 }, annualNeed: { type: "number", minimum: 0 }, coa: { type: "number", minimum: 0 }, otherAid: { type: "number", minimum: 0 }, requestedGradPlus: { type: "number", minimum: 0 }, distributionModel: { type: "string", enum: ["equal", "proportional"] }, traditionalProrationApplies: { type: "boolean", description: "When true, suppresses a second SOR reduction for a valid traditional proration path." }, ayDenominatorVerified: { type: "boolean" }, terms: { type: "object", additionalProperties: { type: "object", properties: termProperties } }, childTerms: childTermsSchema, feeSubUnsubPercent: { type: "number", default: 1.057 }, feeGradPlusPercent: { type: "number", default: 4.228 },
        },
      },
      CalculateResponse: { type: "object", required: ["data", "meta"], properties: { data: { type: "object", additionalProperties: true }, meta: { type: "object", additionalProperties: true } } },
      StudentEstimateInput: {
        type: "object", required: ["awardYear", "programLevel", "gradeLevel", "dependency", "fallCredits", "springCredits", "fullTimeCreditsPerTerm"],
        properties: { awardYear: { type: "string", enum: AWARD_YEARS }, programLevel: { type: "string", enum: ["undergraduate", "graduate"] }, gradeLevel: { type: "string" }, dependency: { type: "string", enum: ["dependent", "independent"] }, fallCredits: { type: "number", minimum: 0 }, springCredits: { type: "number", minimum: 0 }, fullTimeCreditsPerTerm: { type: "number", exclusiveMinimum: 0 } },
      },
    },
  },
};

export const Route = createFileRoute("/api/public/v2/openapi.json")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),
      GET: async () => jsonResponse(spec),
    },
  },
});
