/**
 * Offline grading for comparison-study exports. Evaluation only; never
 * imported by the page. See the pull request that introduced the study for
 * the written grading definition this code implements.
 */

import {
  LAB_STUDY_EXPORT_FORMAT,
  isNextStepId,
  isStudyArm,
  type LabStudyCondition,
  type LabStudyExport,
  type LabStudyNextStepId,
  type LabStudyResponse,
} from "./design";
import { LAB_STUDY_GRADING_KEY } from "./grading-key";

export type LabStudyGrade =
  | "appropriate"
  | "over_escalated"
  | "wrong_procedure"
  | "unsupported_step"
  | "unsafe"
  | "no_answer";

const PROCEDURE_STEPS = new Set<LabStudyNextStepId>([
  "variance_note",
  "request_originating",
  "confirm_status",
]);
const UNSAFE_STEPS = new Set<LabStudyNextStepId>([
  "close_clean",
  "correct_record",
  "treat_zero",
  "merge_duplicates",
]);

export function gradeStudyResponse(caseId: string, chosen: LabStudyNextStepId): LabStudyGrade {
  const key = LAB_STUDY_GRADING_KEY.find((k) => k.caseId === caseId);
  if (!key) throw new Error(`No grading key entry for ${caseId}`);
  if (chosen === key.appropriateStepId) return "appropriate";
  if (chosen === "not_sure") return "no_answer";
  // Every study case has a real discrepancy or rejected input, so closing it
  // clean is as unsafe as editing a record.
  if (UNSAFE_STEPS.has(chosen)) return "unsafe";
  if (chosen === "escalate") return "over_escalated";
  if (PROCEDURE_STEPS.has(chosen)) {
    return key.appropriateStepId === "escalate" ? "unsupported_step" : "wrong_procedure";
  }
  return "no_answer";
}

/**
 * A version B trial counts toward the primary B figures only if the reviewer
 * actually saw a result from the endpoint. Otherwise it is reported as degraded.
 */
export function isDegradedTrial(r: LabStudyResponse): boolean {
  return r.condition === "B" && r.explanation?.status !== "ok";
}

export interface LabStudyConditionSummary {
  condition: LabStudyCondition;
  graded: number;
  degradedExcluded: number;
  counts: Record<LabStudyGrade, number>;
  medianDecisionMs: number | null;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round((s[mid - 1] + s[mid]) / 2);
}

export function summarizeStudyExports(exports: LabStudyExport[]): LabStudyConditionSummary[] {
  return (["A", "B"] as const).map((condition) => {
    const all = exports.flatMap((e) => e.responses).filter((r) => r.condition === condition);
    const kept = all.filter((r) => !isDegradedTrial(r));
    const counts: Record<LabStudyGrade, number> = {
      appropriate: 0,
      over_escalated: 0,
      wrong_procedure: 0,
      unsupported_step: 0,
      unsafe: 0,
      no_answer: 0,
    };
    for (const r of kept) counts[gradeStudyResponse(r.caseId, r.chosenStepId)]++;
    return {
      condition,
      graded: kept.length,
      degradedExcluded: all.length - kept.length,
      counts,
      medianDecisionMs: median(kept.map((r) => r.decisionMs)),
    };
  });
}

/** Rejects files that are not study exports, or that repeat a session. */
export function parseStudyExports(raw: unknown[]): LabStudyExport[] {
  const seen = new Set<string>();
  return raw.map((value, i) => {
    const e = value as Partial<LabStudyExport>;
    const ok =
      e &&
      e.format === LAB_STUDY_EXPORT_FORMAT &&
      typeof e.sessionId === "string" &&
      isStudyArm(e.arm) &&
      Array.isArray(e.responses) &&
      e.responses.every(
        (r) =>
          LAB_STUDY_GRADING_KEY.some((k) => k.caseId === r.caseId) &&
          isNextStepId(r.chosenStepId) &&
          (r.condition === "A" || r.condition === "B") &&
          Number.isFinite(r.decisionMs),
      );
    if (!ok) throw new Error(`Input ${i + 1} is not a valid ${LAB_STUDY_EXPORT_FORMAT} file.`);
    if (seen.has(e.sessionId!)) throw new Error(`Session ${e.sessionId} appears more than once.`);
    seen.add(e.sessionId!);
    const caseIds = e.responses!.map((r) => r.caseId);
    if (new Set(caseIds).size !== caseIds.length) {
      throw new Error(`Session ${e.sessionId} contains a repeated case.`);
    }
    return e as LabStudyExport;
  });
}
