/**
 * Server-only Lovable AI call for the reconciliation lab.
 *
 * One HTTP request, one model call, no automatic retries. The model never
 * receives a browser payload: it receives the fixture, the deterministic
 * comparison result, and the exact retrieved passages that this server chose.
 * The model does no arithmetic; the numbers are computed in compare.ts and
 * handed to it as already-final facts.
 */

import {
  LAB_MAX_OUTPUT_TOKENS,
  LAB_MODEL_ID,
  LAB_PROMPT_VERSION,
  LAB_REQUEST_TIMEOUT_MS,
  LabExplanationSchema,
  validateCitations,
  type LabExplanation,
  type LabExplainFailureReason,
} from "./ai-contract";
import { formatCents, type LabComparison } from "./compare";
import type { LabScenario } from "./fixtures";
import type { LabRetrieval, LabReviewGate } from "./retrieval";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface LabModelOutcome {
  ok: boolean;
  explanation?: LabExplanation;
  reason?: LabExplainFailureReason;
  message?: string;
  latencyMs: number | null;
  tokenUsage: { prompt: number | null; completion: number | null; total: number | null } | null;
}

function buildPrompt(
  scenario: LabScenario,
  comparison: LabComparison,
  retrieval: LabRetrieval,
  gate: LabReviewGate,
): { system: string; user: string } {
  const system = [
    "You explain a reconciliation result inside a teaching lab that uses entirely fictional records and fictional procedures.",
    "You must not perform arithmetic. Every number is already computed by deterministic code and given to you; restate the given figures only.",
    "You may cite only the passage ids listed under RETRIEVED PASSAGES. Never cite a real regulation, a real statute, or any source not listed.",
    "You never modify records and never instruct anyone to modify a record automatically.",
    gate.allowProposedCorrection
      ? "A proposed correction is permitted, phrased as a suggestion for a human to confirm."
      : "A proposed correction is FORBIDDEN for this case. Set proposedCorrection to null and requiresHumanReview to true.",
    "Be brief: at most 3 short observations, and one or two sentences per field.",
    "Reply with a single JSON object and nothing else. Shape:",
    '{"summary":string,"observations":string[],"citedSourceIds":string[],"proposedNextStep":string,"proposedCorrection":string|null,"uncertainty":string,"requiresHumanReview":boolean}',
  ].join("\n");

  const rows = comparison.findings
    .map(
      (f) =>
        `- ${f.id} (${f.label}): finding=${f.kind}; ${scenario.systemAName}=${formatCents(
          f.amountACents,
        )} status=${f.statusA ?? "none"}; ${scenario.systemBName}=${formatCents(
          f.amountBCents,
        )} status=${f.statusB ?? "none"}; delta=${formatCents(f.deltaCents)}`,
    )
    .join("\n");

  const passages = retrieval.passages.length
    ? retrieval.passages
        .map((p) => `[${p.id}] ${p.title}\n${p.text}${p.conflictsWith.length ? `\n(conflicts with: ${p.conflictsWith.join(", ")})` : ""}`)
        .join("\n\n")
    : "(none: retrieval returned no applicable fictional procedure)";

  const user = [
    `SCENARIO: ${scenario.title}`,
    `REVIEWER QUESTION: ${scenario.question}`,
    `SCENARIO NOTES: ${scenario.notes}`,
    "",
    "DETERMINISTIC COMPARISON (computed in code, integer cents):",
    rows || "(no rows)",
    comparison.inputErrors.length
      ? `INPUT ERRORS: ${comparison.inputErrors.map((e) => `${e.code} in system ${e.system}: ${e.detail}`).join(" | ")}`
      : "INPUT ERRORS: none",
    "",
    `RETRIEVAL METHOD: ${retrieval.method}`,
    "RETRIEVED PASSAGES:",
    passages,
    "",
    `ESCALATION DECIDED BY CODE: requireHumanReview=${gate.requireHumanReview}; proposedCorrectionAllowed=${gate.allowProposedCorrection}; reason=${gate.reason}`,
  ].join("\n");

  return { system, user };
}

function stripFences(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith("```")) return trimmed;
  return trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

export async function requestLabExplanation(
  scenario: LabScenario,
  comparison: LabComparison,
  retrieval: LabRetrieval,
  gate: LabReviewGate,
): Promise<LabModelOutcome> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    return {
      ok: false,
      reason: "model_not_configured",
      message: "The AI explanation service is not configured on this deployment.",
      latencyMs: null,
      tokenUsage: null,
    };
  }

  const { system, user } = buildPrompt(scenario, comparison, retrieval, gate);
  const startedAt = Date.now();
  // Single attempt. A timeout is surfaced to the visitor, never retried,
  // because a retry would double the cost of one click.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LAB_REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(GATEWAY_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: LAB_MODEL_ID,
        max_tokens: LAB_MAX_OUTPUT_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch (error) {
    clearTimeout(timer);
    const aborted = error instanceof Error && error.name === "AbortError";
    return {
      ok: false,
      reason: aborted ? "model_timeout" : "model_unavailable",
      message: aborted
        ? `The model did not answer within ${Math.round(LAB_REQUEST_TIMEOUT_MS / 1000)} seconds. Nothing was retried automatically.`
        : "The model could not be reached for this request.",
      latencyMs: Date.now() - startedAt,
      tokenUsage: null,
    };
  }
  clearTimeout(timer);

  const latencyMs = Date.now() - startedAt;

  if (!response.ok) {
    const status = response.status;
    const reason: LabExplainFailureReason =
      status === 402 || status === 403
        ? "model_quota_exceeded"
        : status === 429
          ? "rate_limited"
          : "model_unavailable";
    let detail = "";
    try {
      const body = (await response.json()) as { error?: { message?: string }; message?: string };
      detail = body?.error?.message || body?.message || "";
    } catch {
      detail = "";
    }
    return {
      ok: false,
      reason,
      message:
        reason === "model_quota_exceeded"
          ? `The AI credit allowance for this lab is exhausted or blocked, so no explanation was generated. ${detail}`.trim()
          : reason === "rate_limited"
            ? "The model is rate limiting requests right now. Nothing was retried automatically."
            : `The model returned an error (HTTP ${status}) and no explanation was generated. ${detail}`.trim(),
      latencyMs,
      tokenUsage: null,
    };
  }

  let payload: {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  };
  try {
    payload = await response.json();
  } catch {
    return {
      ok: false,
      reason: "model_unavailable",
      message: "The model response could not be read.",
      latencyMs,
      tokenUsage: null,
    };
  }

  const tokenUsage = {
    prompt: payload.usage?.prompt_tokens ?? null,
    completion: payload.usage?.completion_tokens ?? null,
    total: payload.usage?.total_tokens ?? null,
  };

  const text = payload.choices?.[0]?.message?.content ?? "";
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(stripFences(text));
  } catch {
    return {
      ok: false,
      reason: "schema_validation_failed",
      message: "The model did not return the required JSON shape, so nothing is shown as fact.",
      latencyMs,
      tokenUsage,
    };
  }

  const parsed = LabExplanationSchema.safeParse(parsedJson);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "schema_validation_failed",
      message: "The model output failed schema validation, so it is not displayed.",
      latencyMs,
      tokenUsage,
    };
  }

  const citations = validateCitations(
    parsed.data.citedSourceIds,
    retrieval.passages.map((p) => p.id),
  );
  if (!citations.ok) {
    return {
      ok: false,
      reason: "citation_validation_failed",
      message: `The model cited source ids that were never retrieved (${citations.unknown.join(", ")}), so the answer is rejected.`,
      latencyMs,
      tokenUsage,
    };
  }

  // Code, not the model, has the final word on escalation.
  const explanation: LabExplanation = {
    ...parsed.data,
    requiresHumanReview: gate.requireHumanReview || parsed.data.requiresHumanReview,
    proposedCorrection: gate.allowProposedCorrection ? parsed.data.proposedCorrection : null,
  };

  return { ok: true, explanation, latencyMs, tokenUsage };
}
