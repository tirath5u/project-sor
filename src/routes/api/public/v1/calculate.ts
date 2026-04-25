import { createFileRoute } from "@tanstack/react-router";
import { CalculateInputSchema } from "@/lib/sor.schema";
import { calculateSOR } from "@/lib/sor";
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
} from "@/lib/api-errors";
import { checkRateLimit } from "@/lib/rate-limit";

export const Route = createFileRoute("/api/public/v1/calculate")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflightResponse(),

      POST: async ({ request }) => {
        // 1) Rate limit (salted-hash key only — no raw IP storage).
        const rl = await checkRateLimit(request);
        if (!rl.allowed) {
          return errorResponse(
            "rate_limited",
            "Rate limit exceeded. Try again shortly.",
            { retryAfterSec: rl.retryAfterSec },
            { "Retry-After": String(rl.retryAfterSec) },
          );
        }

        // 2) Validate Accept header (we only return JSON).
        const accept = request.headers.get("accept") || "";
        if (
          accept &&
          accept !== "*/*" &&
          !accept.includes("application/json")
        ) {
          return errorResponse(
            "not_acceptable",
            "Only application/json responses are supported.",
          );
        }

        // 3) Validate Content-Type.
        const ct = request.headers.get("content-type") || "";
        if (!ct.includes("application/json")) {
          return errorResponse(
            "unsupported_media_type",
            "Content-Type must be application/json.",
          );
        }

        // 4) Parse body.
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return errorResponse("invalid_input", "Request body is not valid JSON.");
        }

        // 5) Schema-validate input.
        const parsed = CalculateInputSchema.safeParse(body);
        if (!parsed.success) {
          return errorResponse(
            "invalid_input",
            "Input failed schema validation.",
            parsed.error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
          );
        }

        // 6) Run engine.
        let results;
        try {
          results = calculateSOR(parsed.data);
        } catch (e) {
          return errorResponse(
            "internal_error",
            "Calculation engine threw an unexpected error.",
            e instanceof Error ? { name: e.name } : undefined,
          );
        }

        // 7) Build response. citations[] is intentionally NOT populated for
        //    arbitrary input — the engine cannot map every scenario to a
        //    specific rule tag. Use sourceSet for the general framework.
        const ay = parsed.data.awardYear ?? POLICY_YEAR;
        return jsonResponse({
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
          },
        });
      },
    },
  },
});
