import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import {
  LAB_MAX_OUTPUT_TOKENS,
  LAB_MODEL_ID,
  LAB_PROMPT_VERSION,
  LabExplainRequestSchema,
  type LabExplainResponse,
} from "@/lib/lab/ai-contract";
import { compareLabRecords } from "@/lib/lab/compare";
import {
  LAB_FIXTURE_VERSION,
  LAB_PROCEDURE_CORPUS_VERSION,
  getLabScenario,
} from "@/lib/lab/fixtures";
import { decideReviewGate, retrieveProcedures } from "@/lib/lab/retrieval";
import { callerKey, checkLabThrottle, recordLabCall } from "@/lib/lab/throttle";
import { requestLabExplanation } from "@/lib/lab/explain.server";
import { CORS_HEADERS, resolveRequestId } from "@/lib/api-errors";

/**
 * Public endpoint for the reconciliation learning lab.
 *
 * The browser sends only { scenarioId }. Everything else, including the
 * fictional records, the retrieved passages and the escalation decision, is
 * assembled here on the server. No secret ever reaches the client.
 */
export const Route = createFileRoute("/api/public/lab/explain")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS_HEADERS }),
      POST: async ({ request }) => {
        const requestId = resolveRequestId(request);
        const json = (body: LabExplainResponse, status: number) =>
          Response.json(body, {
            status,
            headers: { ...CORS_HEADERS, "X-Request-Id": requestId, "Cache-Control": "no-store" },
          });

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return json(
            {
              status: "unavailable",
              reason: "invalid_input",
              message: "Request body must be JSON containing a scenarioId.",
              retryAfterSeconds: null,
              meta: { requestId },
            },
            400,
          );
        }

        const parsed = LabExplainRequestSchema.safeParse(raw);
        if (!parsed.success) {
          return json(
            {
              status: "unavailable",
              reason: "invalid_input",
              message: "scenarioId is required and must be a short string.",
              retryAfterSeconds: null,
              meta: { requestId },
            },
            400,
          );
        }

        const scenario = getLabScenario(parsed.data.scenarioId);
        if (!scenario) {
          return json(
            {
              status: "unavailable",
              reason: "unknown_scenario",
              message: "That scenario id does not exist in the built-in fixture set.",
              retryAfterSeconds: null,
              meta: { requestId },
            },
            404,
          );
        }

        const key = await callerKey(request);
        const throttle = checkLabThrottle(key);
        if (!throttle.allowed) {
          return json(
            {
              status: "unavailable",
              reason: throttle.reason,
              message:
                throttle.reason === "daily_limit_reached"
                  ? "This lab has a conservative global daily cap on model calls, and today's cap is reached. The deterministic comparison and the retrieved passages still work."
                  : "You have requested explanations faster than this lab allows. Nothing was retried automatically.",
              retryAfterSeconds: throttle.retryAfterSeconds,
              meta: {
                requestId,
                dailyCallsUsed: throttle.dailyCallsUsed,
                dailyCallLimit: throttle.dailyCallLimit,
                throttleScope: "in-memory per server instance",
              },
            },
            429,
          );
        }

        const comparison = compareLabRecords(scenario.systemA, scenario.systemB);
        const retrieval = retrieveProcedures(scenario, comparison);
        const gate = decideReviewGate(comparison, retrieval);

        const dailyCallsUsed = recordLabCall(key);
        const outcome = await requestLabExplanation(scenario, comparison, retrieval, gate);

        const meta = {
          model: LAB_MODEL_ID,
          promptVersion: LAB_PROMPT_VERSION,
          fixtureVersion: LAB_FIXTURE_VERSION,
          corpusVersion: LAB_PROCEDURE_CORPUS_VERSION,
          compareVersion: comparison.compareVersion,
          retrievalVersion: retrieval.retrievalVersion,
          retrievalMethod: retrieval.method,
          latencyMs: outcome.latencyMs,
          tokenUsage: outcome.tokenUsage,
          maxOutputTokens: LAB_MAX_OUTPUT_TOKENS,
          requestId,
          throttleScope: "in-memory per server instance" as const,
          dailyCallsUsed,
          dailyCallLimit: throttle.dailyCallLimit,
        };

        if (!outcome.ok || !outcome.explanation) {
          return json(
            {
              status: "unavailable",
              reason: outcome.reason ?? "model_unavailable",
              message: outcome.message ?? "No explanation was generated.",
              retryAfterSeconds: null,
              meta,
            },
            200,
          );
        }

        return json({ status: "ok", explanation: outcome.explanation, gate, meta }, 200);
      },
    },
  },
});
