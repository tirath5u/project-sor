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
import { reserveLabCall, LAB_LIMITS } from "@/lib/lab/throttle";
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

        const comparison = compareLabRecords(scenario.systemA, scenario.systemB);
        const retrieval = retrieveProcedures(scenario, comparison);
        const gate = decideReviewGate(comparison, retrieval);

        const baseMeta = {
          fixtureVersion: LAB_FIXTURE_VERSION,
          corpusVersion: LAB_PROCEDURE_CORPUS_VERSION,
          compareVersion: comparison.compareVersion,
          retrievalVersion: retrieval.retrievalVersion,
          retrievalMethod: retrieval.method,
          requestId,
        };
        if (retrieval.noApplicableSource || retrieval.conflictingSources || comparison.inputErrors.length) {
          return json({
            status: "ok",
            resultKind: "rule_based",
            explanation: {
              summary: "Rule-based result: human review required. No model was called.",
              observations: [gate.reason],
              citedSourceIds: retrieval.passages.map((p) => p.id),
              proposedNextStep: "Ask a human reviewer to resolve the missing or conflicting evidence before considering a correction.",
              proposedCorrection: null,
              uncertainty: "The available evidence does not support an AI correction.",
              requiresHumanReview: true,
            },
            gate,
            meta: {
              ...baseMeta, model: "not called", promptVersion: "not used",
              latencyMs: null, tokenUsage: null, maxOutputTokens: 0,
              throttleScope: "not applicable: no model call", dailyCallsUsed: 0,
              dailyCallLimit: LAB_LIMITS.globalDailyLimit,
            },
          }, 200);
        }
        const reservation = await reserveLabCall();
        if (!reservation.allowed) {
          return json({
            status: "unavailable", reason: reservation.reason,
            message: "AI explanations are paused because shared usage-limit storage is unavailable. Comparison and retrieved procedures remain available.",
            retryAfterSeconds: null,
            meta: { ...baseMeta, throttleScope: "unavailable" },
          }, 503);
        }
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
          throttleScope: "unavailable" as const,
          dailyCallsUsed: 0,
          dailyCallLimit: LAB_LIMITS.globalDailyLimit,
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

        return json({ status: "ok", resultKind: "ai", explanation: outcome.explanation, gate, meta }, 200);
      },
    },
  },
});
