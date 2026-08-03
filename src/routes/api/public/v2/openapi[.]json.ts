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
    description: "Source-backed Schedule of Reductions calculation API. V2 adds release metadata, V56 calculation stages, warnings, comparison, and student estimate routes.",
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
    "/api/public/v2/compare": {
      post: {
        summary: "Compare two complete V2 scenarios",
        description: "Runs both scenarios independently through the shared engine. The service is stateless and returns numeric deltas, warning changes, and authoritative status for each side.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/CompareRequest" } } } },
        responses: { "200": { description: "Scenario comparison", content: { "application/json": { schema: { $ref: "#/components/schemas/CompareResponse" } } } }, "422": { description: "Invalid comparison inputs" } },
      },
    },
    "/api/public/v2/student-advanced": {
      post: {
        summary: "Run an advanced student estimate",
        description: "Runs a complete institution-specific V2 input through the shared engine and returns a student-readable projection with stages, warnings, and external checks. It is not an award and is stateless.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/AdvancedStudentEstimateRequest" } } } },
        responses: { "200": { description: "Advanced estimate", content: { "application/json": { schema: { $ref: "#/components/schemas/AdvancedStudentEstimateResponse" } } } }, "422": { description: "Invalid advanced estimate inputs" } },
      },
    },
    "/api/public/v2/migration-compare": {
      post: {
        summary: "Compare an approved V55 and V56 fixture",
        description: "Runs the current V56 engine against a stored, approved V55 baseline. This is a stateless migration aid and does not accept arbitrary historical inputs.",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/MigrationCompareRequest" } } } },
        responses: { "200": { description: "Migration comparison", content: { "application/json": { schema: { $ref: "#/components/schemas/MigrationCompareResponse" } } } }, "422": { description: "Fixture is not approved for migration comparison" } },
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
          awardYear: { type: "string", enum: AWARD_YEARS }, programLevel: { type: "string", enum: ["undergraduate", "graduate"] }, gradeLevel: { type: "string" }, dependency: { type: "string", enum: ["dependent", "independent"] }, parentPlusDenied: { type: "boolean", description: "V1 compatibility field. Prefer parentPlusEligibilityBasis in V2." }, parentPlusEligibilityBasis: { type: "string", enum: ["none", "adverseCreditDenied", "documentedExceptionalCircumstances", "otherOrUnverified"] }, parentPlusAggregateUsed: { type: ["number", "null"], minimum: 0, description: "Caller-supplied Parent PLUS aggregate usage. The service does not derive NSLDS aggregate room." }, loanLimitException: { type: "boolean" }, loanPeriodScope: { type: "string", enum: ["annualMultiTerm", "singleTerm"] }, coaScope: { type: "string", enum: ["academicYear", "singleTerm"] }, ayType: { type: "string", enum: ["SAY", "BBAY1", "BBAY2"] }, numStandardTerms: { type: "integer", minimum: 1, maximum: 4 }, ayFtCredits: { type: "number", minimum: 0 }, ayDenominatorOverride: { type: ["number", "null"], minimum: 0, description: "Positive verified override replaces the derived AY denominator. Zero retains the derived path and emits a review warning." }, traditionalProrationApplies: { type: "boolean", description: "V1 compatibility field." }, traditionalProrationStatus: { type: "string", enum: ["notApplied", "shortProgram", "remainingPeriodShorterThanAcademicYear"] }, annualNeed: { type: "number", minimum: 0 }, coa: { type: "number", minimum: 0 }, otherAid: { type: "number", minimum: 0 }, requestedGradPlus: { type: "number", minimum: 0 }, requestedSub: { type: ["number", "null"], minimum: 0 }, requestedUnsub: { type: ["number", "null"], minimum: 0 }, preSorCaps: { type: "object", additionalProperties: false, properties: { enabled: { type: "boolean" }, sub: { type: ["number", "null"], minimum: 0 }, unsub: { type: ["number", "null"], minimum: 0 }, gradPlus: { type: ["number", "null"], minimum: 0 } } }, remainingAnnualSub: { type: ["number", "null"], minimum: 0 }, remainingAnnualUnsub: { type: ["number", "null"], minimum: 0 }, remainingAnnualCombined: { type: ["number", "null"], minimum: 0 }, remainingAggregateSub: { type: ["number", "null"], minimum: 0 }, remainingAggregateUnsub: { type: ["number", "null"], minimum: 0 }, remainingAggregateCombined: { type: ["number", "null"], minimum: 0 }, distributionModel: { type: "string", enum: ["equal", "proportional"] }, terms: { type: "object", additionalProperties: { type: "object", properties: termProperties } }, childTerms: childTermsSchema, feeSubUnsubPercent: { type: "number", default: 1.057 }, feeGradPlusPercent: { type: "number", default: 4.228 },
        },
      },
      CalculateResponse: { type: "object", required: ["data", "meta", "contract"], properties: { data: { type: "object", additionalProperties: true }, meta: { type: "object", additionalProperties: true }, contract: { type: "object", required: ["calculationStatus", "authoritative", "policyDecision", "eligibilityStages", "modeledInputs", "externalChecks", "warnings", "inputPresence"], properties: { calculationStatus: { type: "string", enum: ["calculated", "calculated_with_external_checks", "blocked"] }, authoritative: { type: "boolean" }, policyDecision: { type: "object", additionalProperties: true }, eligibilityStages: { type: "array", items: { type: "object", additionalProperties: true } }, modeledInputs: { type: "array", items: { type: "string" } }, externalChecks: { type: "array", items: { type: "string" } }, warnings: { type: "array", items: { type: "object", required: ["id", "severity", "message"], properties: { id: { type: "string" }, severity: { type: "string", enum: ["info", "review"] }, message: { type: "string" } } } }, inputPresence: { type: "object", additionalProperties: { type: "boolean" } } } } } },
      StudentEstimateInput: {
        type: "object", required: ["awardYear", "programLevel", "gradeLevel", "dependency", "fallCredits", "springCredits", "fullTimeCreditsPerTerm"],
        properties: { awardYear: { type: "string", enum: AWARD_YEARS }, programLevel: { type: "string", enum: ["undergraduate", "graduate"] }, gradeLevel: { type: "string" }, dependency: { type: "string", enum: ["dependent", "independent"] }, fallCredits: { type: "number", minimum: 0 }, springCredits: { type: "number", minimum: 0 }, fullTimeCreditsPerTerm: { type: "number", exclusiveMinimum: 0 } },
      },
      CompareRequest: {
        type: "object",
        additionalProperties: false,
        required: ["left", "right"],
        properties: { left: { $ref: "#/components/schemas/CalculateInput" }, right: { $ref: "#/components/schemas/CalculateInput" } },
      },
      CompareResponse: {
        type: "object",
        required: ["status", "left", "right", "comparison", "meta"],
        properties: { status: { type: "string", enum: ["compared"] }, left: { type: "object", additionalProperties: true }, right: { type: "object", additionalProperties: true }, comparison: { type: "object", additionalProperties: true }, meta: { type: "object", additionalProperties: true } },
      },
      AdvancedStudentEstimateRequest: {
        type: "object",
        additionalProperties: false,
        required: ["input"],
        properties: { input: { $ref: "#/components/schemas/CalculateInput" }, resultDetail: { type: "string", enum: ["summary", "detailed"], default: "detailed" } },
      },
      AdvancedStudentEstimateResponse: {
        type: "object",
        required: ["status", "audience", "estimate", "contract", "disclaimer", "meta"],
        properties: { status: { type: "string", enum: ["calculated", "calculated_with_external_checks", "blocked"] }, audience: { type: "string", enum: ["student-advanced"] }, estimate: { type: "object", additionalProperties: true }, contract: { type: "object", additionalProperties: true }, disclaimer: { type: "string" }, meta: { type: "object", additionalProperties: true } },
      },
      MigrationCompareRequest: {
        type: "object",
        additionalProperties: false,
        required: ["fixtureId"],
        properties: { fixtureId: { type: "string", enum: ["fixture-v19-007"] } },
      },
      MigrationCompareResponse: {
        type: "object",
        required: ["status", "audience", "comparison", "meta"],
        properties: { status: { type: "string", enum: ["compared"] }, audience: { type: "string", enum: ["staff"] }, comparison: { type: "object", additionalProperties: true }, meta: { type: "object", additionalProperties: true } },
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
