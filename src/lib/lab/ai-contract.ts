/**
 * Contract between the lab UI and the server-side AI explanation endpoint.
 *
 * The browser only ever sends a scenario id. The server loads the fixture,
 * runs the deterministic comparison, retrieves the fictional passages, and
 * calls the model. The model output is schema-validated and its citations are
 * checked against the exact passage ids that were actually retrieved.
 */

import { z } from "zod";

export const LAB_PROMPT_VERSION = "lab-prompt-1.0.0" as const;
export const LAB_MODEL_ID = "google/gemini-3.8-flash" as const;

/** Hard caps that keep public consumption bounded. */
export const LAB_MAX_OUTPUT_TOKENS = 700;
export const LAB_REQUEST_TIMEOUT_MS = 25_000;

export const LabExplainRequestSchema = z
  .object({
    scenarioId: z.string().min(1).max(64),
  })
  .strict();

export const LabExplanationSchema = z
  .object({
    summary: z.string().min(1).max(1200),
    observations: z.array(z.string().min(1).max(400)).min(1).max(6),
    citedSourceIds: z.array(z.string().min(1).max(32)).max(6),
    proposedNextStep: z.string().min(1).max(600),
    proposedCorrection: z.string().max(600).nullable(),
    uncertainty: z.string().min(1).max(600),
    requiresHumanReview: z.boolean(),
  })
  .strict();

export type LabExplanation = z.infer<typeof LabExplanationSchema>;

export type LabExplainFailureReason =
  | "invalid_input"
  | "unknown_scenario"
  | "model_not_configured"
  | "rate_limited"
  | "daily_limit_reached"
  | "model_timeout"
  | "model_quota_exceeded"
  | "model_unavailable"
  | "schema_validation_failed"
  | "citation_validation_failed";

export interface LabExplainMeta {
  model: string;
  promptVersion: string;
  fixtureVersion: string;
  corpusVersion: string;
  compareVersion: string;
  retrievalVersion: string;
  retrievalMethod: string;
  latencyMs: number | null;
  tokenUsage: { prompt: number | null; completion: number | null; total: number | null } | null;
  maxOutputTokens: number;
  requestId: string;
  /**
   * Honest statement about the throttle: counters live in the running server
   * instance's memory, so they reset when the instance recycles.
   */
  throttleScope: "in-memory per server instance";
  dailyCallsUsed: number;
  dailyCallLimit: number;
}

export interface LabExplainSuccess {
  status: "ok";
  explanation: LabExplanation;
  gate: { requireHumanReview: boolean; allowProposedCorrection: boolean; reason: string };
  meta: LabExplainMeta;
}

export interface LabExplainFailure {
  status: "unavailable";
  reason: LabExplainFailureReason;
  /** Plain, non-invented explanation of what happened. */
  message: string;
  retryAfterSeconds: number | null;
  meta: Partial<LabExplainMeta>;
}

export type LabExplainResponse = LabExplainSuccess | LabExplainFailure;

/** Every cited id must be one of the ids that retrieval actually returned. */
export function validateCitations(
  cited: string[],
  retrievedIds: string[],
): { ok: true } | { ok: false; unknown: string[] } {
  const allowed = new Set(retrievedIds);
  const unknown = cited.filter((id) => !allowed.has(id));
  return unknown.length === 0 ? { ok: true } : { ok: false, unknown };
}
