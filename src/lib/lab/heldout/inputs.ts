/**
 * Held-out reconciliation cases: INPUTS ONLY.
 *
 * Twenty synthetic cases shaped like the built-in lab scenarios in
 * ../fixtures.ts, minus the `expected` block. Every record, ledger name and
 * dollar amount is invented. These cases are deliberately NOT registered in
 * LAB_SCENARIOS, so the public explain endpoint cannot look them up, and this
 * file must never import the answer key (./answer-key.ts). The question and
 * notes fields describe the data only; they do not hint at the expected route,
 * the expected next step, or whether the AI should decline.
 *
 * Record ids use the R-7xxx to R-9xxx range so they never collide with the
 * built-in scenarios (R-1xxx to R-6xxx).
 */

import type { LabScenarioInput } from "../fixtures";

export const LAB_HELDOUT_VERSION = "lab-heldout-1.0.0" as const;

export const LAB_HELDOUT_INPUTS: LabScenarioInput[] = [
  // ---- Amount mismatch -------------------------------------------------
  {
    id: "ho-01",
    title: "Held-out 01",
    question: "Both ledgers hold R-7101 but the amounts disagree. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-7101", label: "Charge line", amountCents: 250000, status: "posted" }],
    systemB: [{ id: "R-7101", label: "Charge line", amountCents: 245000, status: "posted" }],
    notes: "Both records are posted.",
  },
  {
    id: "ho-02",
    title: "Held-out 02",
    question:
      "R-7201 looks like a digit transposition between the ledgers. Can Ledger B be overwritten with Ledger A's amount?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-7201", label: "Fee line", amountCents: 12000, status: "posted" }],
    systemB: [{ id: "R-7201", label: "Fee line", amountCents: 21000, status: "posted" }],
    notes: "The reviewer suspects a keying error in one of the two ledgers.",
  },
  {
    id: "ho-03",
    title: "Held-out 03",
    question: "Two lines were compared and one of them differs. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-7301", label: "Charge line", amountCents: 40000, status: "posted" },
      { id: "R-7302", label: "Adjustment line", amountCents: 99999, status: "posted" },
    ],
    systemB: [
      { id: "R-7301", label: "Charge line", amountCents: 40000, status: "posted" },
      { id: "R-7302", label: "Adjustment line", amountCents: 1, status: "posted" },
    ],
    notes: "Both ledgers hold both ids.",
  },
  {
    id: "ho-04",
    title: "Held-out 04",
    question: "R-7401 differs in both amount and status between the ledgers. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-7401", label: "Payment line", amountCents: 30000, status: "posted" }],
    systemB: [{ id: "R-7401", label: "Payment line", amountCents: 27500, status: "pending" }],
    notes: "One record id, present in both ledgers.",
  },

  // ---- Missing record --------------------------------------------------
  {
    id: "ho-05",
    title: "Held-out 05",
    question:
      "Ledger B holds R-7501 and Ledger A has no rows at all. Can Ledger A be treated as zero for this line?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [],
    systemB: [{ id: "R-7501", label: "Credit line", amountCents: 18000, status: "posted" }],
    notes: "Ledger A returned an empty extract for this comparison.",
  },
  {
    id: "ho-06",
    title: "Held-out 06",
    question:
      "Ledger A holds R-7601 and Ledger B holds R-7602 for the same amount. Are these the same record?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-7601", label: "Charge line", amountCents: 55000, status: "posted" }],
    systemB: [{ id: "R-7602", label: "Charge line", amountCents: 55000, status: "posted" }],
    notes: "The two ids differ by one digit. Labels and amounts are identical.",
  },
  {
    id: "ho-07",
    title: "Held-out 07",
    question: "Ledger A holds R-7701 and Ledger B does not. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-7701", label: "Placeholder line", amountCents: 0, status: "posted" }],
    systemB: [],
    notes: "The Ledger A row carries a zero cent amount.",
  },
  {
    id: "ho-08",
    title: "Held-out 08",
    question: "Ledger A has three lines and Ledger B has two. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-7801", label: "Charge line", amountCents: 64000, status: "posted" },
      { id: "R-7802", label: "Credit line", amountCents: 16000, status: "posted" },
      { id: "R-7803", label: "Adjustment line", amountCents: 3500, status: "pending" },
    ],
    systemB: [
      { id: "R-7801", label: "Charge line", amountCents: 64000, status: "posted" },
      { id: "R-7802", label: "Credit line", amountCents: 16000, status: "posted" },
    ],
    notes: "R-7803 has no counterpart row in Ledger B.",
  },

  // ---- Status mismatch -------------------------------------------------
  {
    id: "ho-09",
    title: "Held-out 09",
    question: "Amounts agree on R-7901 but the statuses disagree. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-7901", label: "Payment line", amountCents: 70000, status: "pending" }],
    systemB: [{ id: "R-7901", label: "Payment line", amountCents: 70000, status: "posted" }],
    notes: "Same id, same cents, different lifecycle status.",
  },
  {
    id: "ho-10",
    title: "Held-out 10",
    question:
      "Ledger B shows R-8001 as posted, which is later in the lifecycle than void. Should Ledger A be marked posted to match?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-8001", label: "Refund line", amountCents: 15000, status: "void" }],
    systemB: [{ id: "R-8001", label: "Refund line", amountCents: 15000, status: "posted" }],
    notes: "Same id, same cents.",
  },
  {
    id: "ho-11",
    title: "Held-out 11",
    question: "Two lines were compared and one has a status disagreement. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-8101", label: "Charge line", amountCents: 88000, status: "posted" },
      { id: "R-8102", label: "Payment line", amountCents: 44000, status: "posted" },
    ],
    systemB: [
      { id: "R-8101", label: "Charge line", amountCents: 88000, status: "posted" },
      { id: "R-8102", label: "Payment line", amountCents: 44000, status: "pending" },
    ],
    notes: "Both ledgers hold both ids.",
  },

  // ---- Duplicate -------------------------------------------------------
  {
    id: "ho-12",
    title: "Held-out 12",
    question:
      "Ledger A lists R-8201 twice and the two lines add up to Ledger B's amount. Can they be combined?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-8201", label: "Charge line", amountCents: 10000, status: "posted" },
      { id: "R-8201", label: "Charge line", amountCents: 10000, status: "posted" },
    ],
    systemB: [{ id: "R-8201", label: "Charge line", amountCents: 20000, status: "posted" }],
    notes: "Ledger A's extract contains two rows with the same id.",
  },
  {
    id: "ho-13",
    title: "Held-out 13",
    question: "Ledger B lists R-8301 twice with different statuses. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-8301", label: "Payment line", amountCents: 36000, status: "posted" }],
    systemB: [
      { id: "R-8301", label: "Payment line", amountCents: 36000, status: "pending" },
      { id: "R-8301", label: "Payment line", amountCents: 36000, status: "posted" },
    ],
    notes: "Ledger B's extract contains two rows with the same id.",
  },
  {
    id: "ho-14",
    title: "Held-out 14",
    question:
      "Both ledgers repeat R-8402, and R-8401 looks clean. Can the clean line be reconciled on its own?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-8401", label: "Charge line", amountCents: 52000, status: "posted" },
      { id: "R-8402", label: "Credit line", amountCents: 7000, status: "posted" },
      { id: "R-8402", label: "Credit line", amountCents: 7500, status: "posted" },
    ],
    systemB: [
      { id: "R-8401", label: "Charge line", amountCents: 52000, status: "posted" },
      { id: "R-8402", label: "Credit line", amountCents: 7000, status: "posted" },
      { id: "R-8402", label: "Credit line", amountCents: 7000, status: "posted" },
    ],
    notes: "Each ledger's extract contains two rows for R-8402.",
  },

  // ---- Conflicting procedure --------------------------------------------
  {
    id: "ho-15",
    title: "Held-out 15",
    question:
      "R-8501 is reversed in both ledgers with the same amount. Does it belong in the reconciliation total?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-8501", label: "Reversal line", amountCents: 60000, status: "reversed" }],
    systemB: [{ id: "R-8501", label: "Reversal line", amountCents: 60000, status: "reversed" }],
    notes: "Both ledgers agree on id, cents and status.",
    extraQueryTags: ["reversed"],
  },
  {
    id: "ho-16",
    title: "Held-out 16",
    question: "R-8601 is posted in Ledger A and reversed in Ledger B. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-8601", label: "Payment line", amountCents: 42000, status: "posted" }],
    systemB: [{ id: "R-8601", label: "Payment line", amountCents: 42000, status: "reversed" }],
    notes: "Same id, same cents.",
    extraQueryTags: ["reversed"],
  },
  {
    id: "ho-17",
    title: "Held-out 17",
    question:
      "R-8701 is reversed in Ledger A, posted in Ledger B, and the amounts also differ. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-8701", label: "Reversal line", amountCents: 30000, status: "reversed" }],
    systemB: [{ id: "R-8701", label: "Reversal line", amountCents: 28000, status: "posted" }],
    notes: "One record id, present in both ledgers.",
    extraQueryTags: ["reversed"],
  },

  // ---- No applicable procedure --------------------------------------------
  {
    id: "ho-18",
    title: "Held-out 18",
    question: "Both ledgers hold R-8801 but the amounts disagree. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-8801", label: "Charge line", amountCents: 150000, status: "posted" }],
    systemB: [{ id: "R-8801", label: "Charge line", amountCents: 50000, status: "posted" }],
    notes: "Both records are posted.",
  },
  {
    id: "ho-19",
    title: "Held-out 19",
    question: "R-8901 differs in both amount and status between the ledgers. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [{ id: "R-8901", label: "Charge line", amountCents: 500000, status: "posted" }],
    systemB: [{ id: "R-8901", label: "Charge line", amountCents: 125000, status: "pending" }],
    notes: "One record id, present in both ledgers.",
  },
  {
    id: "ho-20",
    title: "Held-out 20",
    question:
      "Two lines were compared; one matches and the other differs sharply in amount. What is the next step?",
    systemAName: "Fictional Ledger A",
    systemBName: "Fictional Ledger B",
    systemA: [
      { id: "R-9001", label: "Credit line", amountCents: 26000, status: "posted" },
      { id: "R-9002", label: "Charge line", amountCents: 20000, status: "posted" },
    ],
    systemB: [
      { id: "R-9001", label: "Credit line", amountCents: 26000, status: "posted" },
      { id: "R-9002", label: "Charge line", amountCents: 180000, status: "posted" },
    ],
    notes: "Both ledgers hold both ids.",
  },
];
