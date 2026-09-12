/**
 * Reconciliation learning lab: built-in fictional data only.
 *
 * Every record, system name, dollar amount and procedure in this file is
 * invented for teaching purposes. Nothing here is a federal rule, a real
 * institutional policy, or a real person. There are no uploads: the lab can
 * only ever read the fixtures defined below.
 */

export const LAB_FIXTURE_VERSION = "lab-fixtures-1.0.0" as const;
export const LAB_PROCEDURE_CORPUS_VERSION = "lab-procedures-1.0.0" as const;

/** A single fictional ledger line in one of the two synthetic systems. */
export interface LabRecord {
  /** Business key used for matching. Duplicates are rejected, never merged. */
  id: string;
  label: string;
  /** Whole cents. Integer arithmetic only, never floating point dollars. */
  amountCents: number;
  status: "posted" | "pending" | "reversed" | "void";
}

export interface LabScenario {
  id: string;
  title: string;
  /** What a reviewer is being asked to investigate. */
  question: string;
  systemAName: string;
  systemBName: string;
  systemA: LabRecord[];
  systemB: LabRecord[];
  /** Free-text context passed to the model as scenario notes. */
  notes: string;
  /**
   * Expected outcome, written independently of the comparison engine and of
   * the model output. Used by the eval tests as the answer key.
   */
  expected: {
    kinds: LabFindingKind[];
    hasInputError: boolean;
    requireHumanReview: boolean;
    allowProposedCorrection: boolean;
  };
}

export type LabFindingKind =
  | "match"
  | "amount_mismatch"
  | "status_mismatch"
  | "amount_and_status_mismatch"
  | "missing_in_b"
  | "missing_in_a";

/** Fictional procedure passages. Explicitly not real regulation. */
export interface LabProcedure {
  id: string;
  title: string;
  /** Metadata tags used by the labelled keyword retrieval method. */
  tags: string[];
  text: string;
  /** Marked when another passage in the corpus contradicts this one. */
  conflictsWith?: string[];
}

export const LAB_PROCEDURES: LabProcedure[] = [
  {
    id: "FP-101",
    title: "Fictional Procedure 101: amount variance under one thousand units",
    tags: ["amount_mismatch", "variance", "amount"],
    text: "When two systems report a different amount for the same record id and the absolute variance is under 1,000 units, the reviewer opens a variance note, records both amounts in cents, and asks the source system owner which figure was entered last. No value is edited by the reconciliation tool itself.",
  },
  {
    id: "FP-102",
    title: "Fictional Procedure 102: record present in one system only",
    tags: ["missing_in_a", "missing_in_b", "missing", "one_sided"],
    text: "A record that exists in exactly one system is treated as unconfirmed, never as zero. The reviewer requests the originating entry from the system that holds the record and confirms whether the counterpart system rejected, delayed, or never received it.",
  },
  {
    id: "FP-103",
    title: "Fictional Procedure 103: status disagreement",
    tags: ["status_mismatch", "status", "posted", "pending", "reversed"],
    text: "If the amounts agree but the statuses differ, the later lifecycle state is not assumed to be correct. The reviewer captures both statuses and the timestamps behind them, then asks the owning office to confirm which lifecycle event actually occurred.",
  },
  {
    id: "FP-104",
    title: "Fictional Procedure 104: fully matching records",
    tags: ["match", "matched", "no_variance"],
    text: "When every record matches on id, amount in cents, and status, the reviewer records a clean comparison result and closes the review with no follow-up action.",
  },
  {
    id: "FP-201",
    title: "Fictional Procedure 201 (conflicting): reversed lines are excluded",
    tags: ["reversed", "status_mismatch", "conflict_demo"],
    text: "A line whose status is reversed in either system is excluded from the reconciliation total and requires no variance note.",
    conflictsWith: ["FP-202"],
  },
  {
    id: "FP-202",
    title: "Fictional Procedure 202 (conflicting): reversed lines are included",
    tags: ["reversed", "status_mismatch", "conflict_demo"],
    text: "A line whose status is reversed in either system stays inside the reconciliation total and always requires a variance note before the review closes.",
    conflictsWith: ["FP-201"],
  },
];

export const LAB_SCENARIOS: LabScenario[] = [
  {
    id: "amount-mismatch",
    title: "Amount mismatch: 1,000 versus 800",
    question:
      "Ledger A and Ledger B both hold record R-1001, but the amounts differ. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-1001", label: "Charge line", amountCents: 100000, status: "posted" }],
    systemB: [{ id: "R-1001", label: "Charge line", amountCents: 80000, status: "posted" }],
    notes: "Both systems agree the record exists and is posted. Only the amount differs.",
    expected: {
      kinds: ["amount_mismatch"],
      hasInputError: false,
      requireHumanReview: false,
      allowProposedCorrection: true,
    },
  },
  {
    id: "missing-record",
    title: "Missing record",
    question: "Ledger A holds R-2002 and Ledger B does not. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-2001", label: "Charge line", amountCents: 45000, status: "posted" },
      { id: "R-2002", label: "Adjustment line", amountCents: 22500, status: "posted" },
    ],
    systemB: [{ id: "R-2001", label: "Charge line", amountCents: 45000, status: "posted" }],
    notes: "R-2002 has no counterpart row in Ledger B. Absence is not the same as a zero amount.",
    expected: {
      kinds: ["match", "missing_in_b"],
      hasInputError: false,
      requireHumanReview: false,
      allowProposedCorrection: true,
    },
  },
  {
    id: "status-mismatch",
    title: "Status mismatch",
    question: "Amounts agree on R-3001 but the statuses disagree. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-3001", label: "Payment line", amountCents: 65000, status: "posted" }],
    systemB: [{ id: "R-3001", label: "Payment line", amountCents: 65000, status: "pending" }],
    notes: "Same id, same cents, different lifecycle status.",
    expected: {
      kinds: ["status_mismatch"],
      hasInputError: false,
      requireHumanReview: false,
      allowProposedCorrection: true,
    },
  },
  {
    id: "matching-records",
    title: "Matching records",
    question: "Both ledgers agree on every line. Is any follow-up needed?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-4001", label: "Charge line", amountCents: 120000, status: "posted" },
      { id: "R-4002", label: "Credit line", amountCents: 30000, status: "posted" },
    ],
    systemB: [
      { id: "R-4001", label: "Charge line", amountCents: 120000, status: "posted" },
      { id: "R-4002", label: "Credit line", amountCents: 30000, status: "posted" },
    ],
    notes: "Clean comparison. Nothing to escalate.",
    expected: {
      kinds: ["match"],
      hasInputError: false,
      requireHumanReview: false,
      allowProposedCorrection: true,
    },
  },
  {
    id: "conflicting-procedures",
    title: "Conflicting procedures",
    question:
      "R-5001 is reversed in one ledger, and two fictional procedures contradict each other on reversed lines. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-5001", label: "Reversal line", amountCents: 90000, status: "reversed" }],
    systemB: [{ id: "R-5001", label: "Reversal line", amountCents: 90000, status: "posted" }],
    notes:
      "The corpus deliberately contains two contradictory passages about reversed lines, so no single rule can be applied.",
    expected: {
      kinds: ["status_mismatch"],
      hasInputError: false,
      requireHumanReview: true,
      allowProposedCorrection: false,
    },
  },
  {
    id: "no-applicable-procedure",
    title: "No applicable procedure",
    question:
      "A currency code disagreement is out of scope for every fictional procedure in the corpus. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-6001", label: "Currency-coded line", amountCents: 50000, status: "void" }],
    systemB: [{ id: "R-6001", label: "Currency-coded line", amountCents: 50000, status: "void" }],
    notes:
      "The reviewer's actual question is about a currency code field that this lab does not model and that no fictional procedure covers.",
    expected: {
      kinds: ["match"],
      hasInputError: false,
      requireHumanReview: true,
      allowProposedCorrection: false,
    },
  },
];

export function getLabScenario(id: string): LabScenario | undefined {
  return LAB_SCENARIOS.find((s) => s.id === id);
}

/** Scenario ids whose retrieval must intentionally return nothing usable. */
export const LAB_NO_PROCEDURE_SCENARIOS = new Set<string>(["no-applicable-procedure"]);
