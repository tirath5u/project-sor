import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { CalculateInputSchema } from "@/lib/sor.schema";
import { calculateSOR, type SORInputs } from "@/lib/sor";
import {
  ENGINE_VERSION,
  POLICY_YEAR,
  POLICY_SNAPSHOT_DATE,
  SOURCE_COMMIT,
} from "@/lib/sor.version";
import {
  corsPreflightResponse,
  errorResponse,
  jsonResponse,
  methodNotAllowedResponse,
  resolveRequestId,
} from "../../../../lib/api-errors";
import { checkRateLimit } from "../../../../lib/rate-limit";

/** 1 MB cap on JSON request bodies. The largest legitimate payload - a fully
 *  populated 8-term BBAY2 input - is well under 20 KB; anything beyond 1 MB
 *  is either malicious or a serialization bug. */
const MAX_BODY_BYTES = 1_000_000;

const ALLOWED_METHODS = ["POST", "OPTIONS"];

export const Route = createFileRoute("/api/public/v1/calculate")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),

      GET: async ({ request }) => {
        const requestId = resolveRequestId(request);
        return methodNotAllowedResponse(ALLOWED_METHODS, requestId);
      },

      POST: async ({ request }) => {
        const requestId = resolveRequestId(request);

        // 1) Rate limit (salted-hash key only - no raw IP storage).
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

        // 2) Validate Accept header (we only return JSON).
        const accept = request.headers.get("accept") || "";
        if (accept && accept !== "*/*" && !accept.includes("application/json")) {
          return errorResponse(
            "not_acceptable",
            "Only application/json responses are supported.",
            undefined,
            undefined,
            requestId,
          );
        }

        // 3) Validate Content-Type.
        const ct = request.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          return errorResponse(
            "unsupported_media_type",
            "Content-Type must be application/json.",
            undefined,
            undefined,
            requestId,
          );
        }

        // 4) Enforce body-size cap, then parse.
        const declaredLength = Number(request.headers.get("content-length") || "0");
        if (declaredLength > MAX_BODY_BYTES) {
          return errorResponse(
            "payload_too_large",
            `Request body exceeds ${MAX_BODY_BYTES} bytes.`,
            { maxBytes: MAX_BODY_BYTES, declared: declaredLength },
            undefined,
            requestId,
          );
        }

        let rawText: string;
        try {
          rawText = await request.text();
        } catch {
          return errorResponse(
            "invalid_input",
            "Could not read request body.",
            undefined,
            undefined,
            requestId,
          );
        }
        if (rawText.length > MAX_BODY_BYTES) {
          return errorResponse(
            "payload_too_large",
            `Request body exceeds ${MAX_BODY_BYTES} bytes.`,
            { maxBytes: MAX_BODY_BYTES, actual: rawText.length },
            undefined,
            requestId,
          );
        }

        let body: unknown;
        try {
          body = JSON.parse(rawText);
        } catch {
          return errorResponse(
            "invalid_input",
            "Request body is not valid JSON.",
            undefined,
            undefined,
            requestId,
          );
        }

        // 5) Schema-validate input. Schema failures are 422 (well-formed JSON
        //    that violates the documented contract); pure JSON-parse errors
        //    above remain 400.
        const parsed = CalculateInputSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            "schema_validation_failed",
            "Input failed schema validation.",
            parsed.error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
            undefined,
            requestId,
          );
        }

        // 6) Run engine.
        let results;
        try {
          results = calculateSOR(parsed.data as unknown as SORInputs);
        } catch (e) {
          return errorResponse(
            "internal_error",
            "Calculation engine threw an unexpected error.",
            e instanceof Error ? { name: e.name } : undefined,
            undefined,
            requestId,
          );
        }

        // 7) Build response. citations[] is intentionally NOT populated for
        //    arbitrary input - the engine cannot map every scenario to a
        //    specific rule tag. Use sourceSet for the general framework.
        const ay = parsed.data.awardYear ?? POLICY_YEAR;
        return jsonResponse(
          {
            data: results,
            meta: {
              engineVersion: ENGINE_VERSION,
              policyYear: ay,
              policySnapshotDate: POLICY_SNAPSHOT_DATE,
              sourceCommit: SOURCE_COMMIT,
              policyStatus: ay === "2026-27" ? "supported-preliminary" : "confirmed",
              sourceSet: ["direct-loan-sor-v1"],
              citations: [],
              computedAt: new Date().toISOString(),
              requestId,
            },
          },
          { headers: { "X-Request-Id": requestId } },
        );
      },
    },
  },
});
