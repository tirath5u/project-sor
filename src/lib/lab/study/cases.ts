/**
 * Comparison-study case sets for the reconciliation lab.
 *
 * Two equivalent sets, X and Y, of six fictional cases each. Case i in X and
 * case i in Y form a matched pair: same finding type, same number and shape of
 * rows, the same side of the FP-101 threshold, the same question template and
 * the same notes. Only record ids, labels and cent amounts differ. Every value
 * is invented.
 *
 * These cases ship to the browser and are accepted by the explain endpoint so
 * version B can show a live explanation. They therefore carry no category and
 * no expected answer: the grading key lives in ./grading-key.ts, which no
 * browser or runtime module imports. They are separate from the held-out set
 * in ../heldout, which is never shown to reviewers or sent to the model.
 */

import type { LabScenarioInput } from "../fixtures";

export type LabStudySet = "X" | "Y";

export interface LabStudyCase extends LabScenarioInput {
  set: LabStudySet;
}

const base = {
  title: "Study case",
  systemAName: "Fictional Ledger A",
  systemBName: "Fictional Ledger B",
} as const;

export const LAB_STUDY_SET_X: LabStudyCase[] = [
  {
    ...base,
    id: "study-x-1",
    set: "X",
    question: "Both ledgers hold R-X101 but the amounts disagree. What is the next step?",
    systemA: [{ id: "R-X101", label: "Charge line", amountCents: 320000, status: "posted" }],
    systemB: [{ id: "R-X101", label: "Charge line", amountCents: 312500, status: "posted" }],
    notes: "Both records are posted.",
  },
  {
    ...base,
    id: "study-x-2",
    set: "X",
    question: "Ledger A has two lines and Ledger B has one. What is the next step?",
    systemA: [
      { id: "R-X111", label: "Charge line", amountCents: 45000, status: "posted" },
      { id: "R-X112", label: "Adjustment line", amountCents: 13000, status: "posted" },
    ],
    systemB: [{ id: "R-X111", label: "Charge line", amountCents: 45000, status: "posted" }],
    notes: "Ledger B's extract is shorter than Ledger A's.",
  },
  {
    ...base,
    id: "study-x-3",
    set: "X",
    question: "Amounts agree on R-X121 but the statuses disagree. What is the next step?",
    systemA: [{ id: "R-X121", label: "Payment line", amountCents: 56000, status: "posted" }],
    systemB: [{ id: "R-X121", label: "Payment line", amountCents: 56000, status: "pending" }],
    notes: "Same id, same cents, different lifecycle status.",
  },
  {
    ...base,
    id: "study-x-4",
    set: "X",
    question: "Ledger A lists R-X131 twice. What is the next step?",
    systemA: [
      { id: "R-X131", label: "Fee line", amountCents: 15000, status: "posted" },
      { id: "R-X131", label: "Fee line", amountCents: 15000, status: "posted" },
    ],
    systemB: [{ id: "R-X131", label: "Fee line", amountCents: 30000, status: "posted" }],
    notes: "Ledger A's extract contains two rows with the same id.",
  },
  {
    ...base,
    id: "study-x-5",
    set: "X",
    question: "R-X141 is posted in Ledger A and reversed in Ledger B. What is the next step?",
    systemA: [{ id: "R-X141", label: "Payment line", amountCents: 38000, status: "posted" }],
    systemB: [{ id: "R-X141", label: "Payment line", amountCents: 38000, status: "reversed" }],
    notes: "Same id, same cents.",
    extraQueryTags: ["reversed"],
  },
  {
    ...base,
    id: "study-x-6",
    set: "X",
    question: "Both ledgers hold R-X151 but the amounts disagree. What is the next step?",
    systemA: [{ id: "R-X151", label: "Charge line", amountCents: 240000, status: "posted" }],
    systemB: [{ id: "R-X151", label: "Charge line", amountCents: 90000, status: "posted" }],
    notes: "Both records are posted.",
  },
];

export const LAB_STUDY_SET_Y: LabStudyCase[] = [
  {
    ...base,
    id: "study-y-1",
    set: "Y",
    question: "Both ledgers hold R-Y201 but the amounts disagree. What is the next step?",
    systemA: [{ id: "R-Y201", label: "Fee line", amountCents: 84000, status: "posted" }],
    systemB: [{ id: "R-Y201", label: "Fee line", amountCents: 91500, status: "posted" }],
    notes: "Both records are posted.",
  },
  {
    ...base,
    id: "study-y-2",
    set: "Y",
    question: "Ledger A has two lines and Ledger B has one. What is the next step?",
    systemA: [
      { id: "R-Y211", label: "Credit line", amountCents: 72000, status: "posted" },
      { id: "R-Y212", label: "Refund line", amountCents: 9500, status: "posted" },
    ],
    systemB: [{ id: "R-Y211", label: "Credit line", amountCents: 72000, status: "posted" }],
    notes: "Ledger B's extract is shorter than Ledger A's.",
  },
  {
    ...base,
    id: "study-y-3",
    set: "Y",
    question: "Amounts agree on R-Y221 but the statuses disagree. What is the next step?",
    systemA: [{ id: "R-Y221", label: "Refund line", amountCents: 23000, status: "posted" }],
    systemB: [{ id: "R-Y221", label: "Refund line", amountCents: 23000, status: "pending" }],
    notes: "Same id, same cents, different lifecycle status.",
  },
  {
    ...base,
    id: "study-y-4",
    set: "Y",
    question: "Ledger A lists R-Y231 twice. What is the next step?",
    systemA: [
      { id: "R-Y231", label: "Charge line", amountCents: 8000, status: "posted" },
      { id: "R-Y231", label: "Charge line", amountCents: 8000, status: "posted" },
    ],
    systemB: [{ id: "R-Y231", label: "Charge line", amountCents: 16000, status: "posted" }],
    notes: "Ledger A's extract contains two rows with the same id.",
  },
  {
    ...base,
    id: "study-y-5",
    set: "Y",
    question: "R-Y241 is posted in Ledger A and reversed in Ledger B. What is the next step?",
    systemA: [{ id: "R-Y241", label: "Credit line", amountCents: 61000, status: "posted" }],
    systemB: [{ id: "R-Y241", label: "Credit line", amountCents: 61000, status: "reversed" }],
    notes: "Same id, same cents.",
    extraQueryTags: ["reversed"],
  },
  {
    ...base,
    id: "study-y-6",
    set: "Y",
    question: "Both ledgers hold R-Y251 but the amounts disagree. What is the next step?",
    systemA: [{ id: "R-Y251", label: "Fee line", amountCents: 60000, status: "posted" }],
    systemB: [{ id: "R-Y251", label: "Fee line", amountCents: 210000, status: "posted" }],
    notes: "Both records are posted.",
  },
];

export const LAB_STUDY_CASES: LabStudyCase[] = [...LAB_STUDY_SET_X, ...LAB_STUDY_SET_Y];

export function getLabStudyCase(id: string): LabStudyCase | undefined {
  return LAB_STUDY_CASES.find((c) => c.id === id);
}

export function studySet(set: LabStudySet): LabStudyCase[] {
  return set === "X" ? LAB_STUDY_SET_X : LAB_STUDY_SET_Y;
}
