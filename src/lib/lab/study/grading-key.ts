/**
 * Comparison-study grading key. Evaluation only.
 *
 * No browser or runtime module may import this file (grading.ts and the
 * offline grading script are the only consumers, and study.test.ts enforces
 * that). Each case has exactly one appropriate next step, taken from the
 * fictional procedure that applies or, where the evidence is rejected,
 * missing or contradictory, from the escalation policy.
 */

import type { LabStudyNextStepId } from "./design";

export type LabStudyCategory =
  | "amount_mismatch"
  | "missing_record"
  | "status_mismatch"
  | "duplicate"
  | "conflicting_procedure"
  | "no_applicable_procedure";

export interface LabStudyKeyEntry {
  caseId: string;
  /** Cases with the same pair number are the matched pair across sets. */
  pair: number;
  category: LabStudyCategory;
  appropriateStepId: LabStudyNextStepId;
  basis: string;
}

const PAIRS: Omit<LabStudyKeyEntry, "caseId">[] = [
  {
    pair: 1,
    category: "amount_mismatch",
    appropriateStepId: "variance_note",
    basis: "FP-101: paired variance of 7500 cents, under the 100000 cent limit.",
  },
  {
    pair: 2,
    category: "missing_record",
    appropriateStepId: "request_originating",
    basis: "FP-102: one record exists in Ledger A only; absence is unconfirmed, never zero.",
  },
  {
    pair: 3,
    category: "status_mismatch",
    appropriateStepId: "confirm_status",
    basis: "FP-103: equal amounts, posted versus pending.",
  },
  {
    pair: 4,
    category: "duplicate",
    appropriateStepId: "escalate",
    basis: "Duplicate id rejects the input; a human resolves it at source. Rows are never merged.",
  },
  {
    pair: 5,
    category: "conflicting_procedure",
    appropriateStepId: "escalate",
    basis: "FP-201 and FP-202 contradict each other on reversed lines.",
  },
  {
    pair: 6,
    category: "no_applicable_procedure",
    appropriateStepId: "escalate",
    basis: "Variance of 150000 cents is outside FP-101 and no other procedure applies.",
  },
];

export const LAB_STUDY_GRADING_KEY: LabStudyKeyEntry[] = PAIRS.flatMap((p) => [
  { ...p, caseId: `study-x-${p.pair}` },
  { ...p, caseId: `study-y-${p.pair}` },
]);
