import { CalculateInputSchema } from "@/lib/sor.schema";
import { z } from "zod";
import {
  CalculateV2InputSchema,
  normalizeV2Input,
  toV2Warnings,
  v2PolicyDecision,
} from "@/lib/sor-v2-contract";
import { calculateSORWithChildTerms, type SORInputs } from "@/lib/sor";
import {
  corsPreflightResponse,
  errorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  resolveRequestId,
} from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  ENGINE_VERSION,
  MCP_VERSION,
  POLICY_YEAR,
  POLICY_SNAPSHOT_DATE,
  RELEASE_ID,
  SOURCE_COMMIT,
  SOURCE_COMMIT_STATUS,
  DEPLOYMENT_MARKER,
} from "@/lib/sor.version";

const MAX_BODY_BYTES = 1_000_000;
const ALLOWED_METHODS = ["POST", "OPTIONS"];

export async function handleCalculateRequest(request: Request, contractVersion: "v1" | "v2") {
  if (request.method === "OPTIONS") return corsPreflightResponse();
  if (request.method !== "POST") return methodNotAllowedResponse(ALLOWED_METHODS, resolveRequestId(request));

  const requestId = resolveRequestId(request);
  const rl = await checkRateLimit(request);
  if (!rl.allowed) {
    return errorResponse(
      "rate_limited",
      "Rate limit exceeded. Try again shortly.",
      { retryAfterSec: rl.retryAfterSec },
      { "Retry-After": String(rl.retryAfterSec) },
      requestId,
    );
  }

  const accept = request.headers.get("accept") || "";
  if (accept && accept !== "*/*" && !accept.includes("application/json")) {
    return errorResponse("not_acceptable", "Only application/json responses are supported.", undefined, undefined, requestId);
  }
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return errorResponse("unsupported_media_type", "Content-Type must be application/json.", undefined, undefined, requestId);
  }

  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return errorResponse("payload_too_large", `Request body exceeds ${MAX_BODY_BYTES} bytes.`, { maxBytes: MAX_BODY_BYTES }, undefined, requestId);
  }

  let rawText: string;
  try {
    rawText = await request.text();
  } catch {
    return errorResponse("invalid_input", "Could not read request body.", undefined, undefined, requestId);
  }
  if (rawText.length > MAX_BODY_BYTES) {
    return errorResponse("payload_too_large", `Request body exceeds ${MAX_BODY_BYTES} bytes.`, { maxBytes: MAX_BODY_BYTES }, undefined, requestId);
  }

  let body: unknown;
  try {
    body = JSON.parse(rawText);
  } catch {
    return errorResponse("invalid_input", "Request body is not valid JSON.", undefined, undefined, requestId);
  }

  const parsed = (contractVersion === "v2" ? CalculateV2InputSchema : CalculateInputSchema).safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      "schema_validation_failed",
      "Input failed schema validation.",
      parsed.error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
      undefined,
      requestId,
    );
  }

  const normalized = contractVersion === "v2"
    ? normalizeV2Input(parsed.data as unknown as z.infer<typeof CalculateV2InputSchema>)
    : { engineInput: parsed.data as unknown as z.infer<typeof CalculateInputSchema>, structured: undefined, externalChecks: [], warnings: [], blocked: false };

  let data;
  try {
    data = calculateSORWithChildTerms(normalized.engineInput as unknown as SORInputs);
  } catch (error) {
    return errorResponse(
      "internal_error",
      "Calculation engine threw an unexpected error.",
      error instanceof Error ? { name: error.name } : undefined,
      undefined,
      requestId,
    );
  }

  const awardYear = parsed.data.awardYear ?? POLICY_YEAR;
  const response: Record<string, unknown> = {
      data,
      meta: {
        contractVersion,
        engineVersion: ENGINE_VERSION,
        mcpVersion: MCP_VERSION,
        policyYear: awardYear,
        policySnapshotDate: POLICY_SNAPSHOT_DATE,
        sourceCommit: SOURCE_COMMIT, sourceCommitStatus: SOURCE_COMMIT_STATUS, deploymentMarker: DEPLOYMENT_MARKER,
        releaseId: RELEASE_ID,
        policyStatus: awardYear === "2026-27" ? "supported-preliminary" : "confirmed",
        sourceSet: ["direct-loan-sor-v1", "project-sor-v56-rule-corrections", "department-vfg-july-23-2026"],
        citations: ["https://fsapartners.ed.gov/more-info/important-dates/2026/06/10/live-webinar-schedule-reductions/loan-limits"],
        computedAt: new Date().toISOString(),
        requestId,
      },
  };

  if (contractVersion === "v2") {
    const resultData = data as unknown as Record<string, unknown>;
    const structuredWarnings = toV2Warnings(
      [...(Array.isArray(resultData.warnings) ? resultData.warnings as string[] : []), ...normalized.warnings],
      normalized.externalChecks,
    );
    const authoritative = normalized.externalChecks.length === 0 && !normalized.blocked;
    response.contract = {
      calculationStatus: normalized.blocked
        ? "blocked"
        : normalized.externalChecks.length > 0
          ? "calculated_with_external_checks"
          : "calculated",
      authoritative,
      policyDecision: v2PolicyDecision(resultData, authoritative),
      eligibilityStages: resultData.calculationStages ?? [],
      modeledInputs: resultData.modeledInputs ?? [],
      externalChecks: normalized.externalChecks,
      warnings: structuredWarnings,
      inputPresence: Object.fromEntries(Object.entries(normalized.structured ?? {}).map(([key, value]) => [key, value !== undefined])),
    };
  }

  return jsonResponse(
    response,
    { headers: { "X-Request-Id": requestId } },
  );
}
