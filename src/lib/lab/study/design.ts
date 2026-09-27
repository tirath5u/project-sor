/**
 * Comparison-study design: arms, schedule, response options and export shape.
 *
 * Version A shows the deterministic comparison, the retrieved fictional
 * procedures and the code-decided escalation. Version B shows the same plus
 * the explanation returned by the lab endpoint (an AI explanation, or the
 * rule-based escalation when code blocks the model call).
 *
 * Each reviewer sees 12 distinct cases: one full set in version A and the
 * other full set in version B. Four arms counterbalance which set is paired
 * with which version and which version comes first. Within a part, case order
 * is shuffled per session with a recorded seed.
 *
 * Nothing here identifies a reviewer. The session id is random, and the export
 * holds no wall-clock time, browser details or free text.
 */

import { LAB_FIXTURE_VERSION, LAB_PROCEDURE_CORPUS_VERSION } from "../fixtures";
import { studySet, type LabStudySet } from "./cases";

export const LAB_STUDY_VERSION = "lab-study-1.0.0" as const;
export const LAB_STUDY_EXPORT_FORMAT = "lab-study-export-1" as const;

export type LabStudyCondition = "A" | "B";
export type LabStudyArmId = 1 | 2 | 3 | 4;

export interface LabStudyBlock {
  set: LabStudySet;
  condition: LabStudyCondition;
}

/** Set-to-version pairing and version order, fully crossed. */
export const LAB_STUDY_ARMS: Record<LabStudyArmId, [LabStudyBlock, LabStudyBlock]> = {
  1: [
    { set: "X", condition: "A" },
    { set: "Y", condition: "B" },
  ],
  2: [
    { set: "Y", condition: "A" },
    { set: "X", condition: "B" },
  ],
  3: [
    { set: "X", condition: "B" },
    { set: "Y", condition: "A" },
  ],
  4: [
    { set: "Y", condition: "B" },
    { set: "X", condition: "A" },
  ],
};

export const LAB_STUDY_ARM_IDS: LabStudyArmId[] = [1, 2, 3, 4];

export function isStudyArm(value: unknown): value is LabStudyArmId {
  return value === 1 || value === 2 || value === 3 || value === 4;
}

/**
 * One fixed list of next steps, identical for every case and both versions.
 * It deliberately includes unsafe choices so an unsafe decision can be seen.
 */
export const LAB_STUDY_NEXT_STEPS = [
  {
    id: "variance_note",
    label:
      "Open a variance note, record both amounts in cents, and ask the source system owner which figure was entered last.",
  },
  {
    id: "request_originating",
    label:
      "Treat the record as unconfirmed and request the originating entry from the system that holds it.",
  },
  {
    id: "confirm_status",
    label:
      "Capture both statuses and their timestamps, and ask the owning office which lifecycle event actually occurred.",
  },
  {
    id: "escalate",
    label: "Escalate to a human reviewer for a ruling, and propose no correction.",
  },
  { id: "close_clean", label: "Record a clean comparison and close the review with no follow-up." },
  { id: "correct_record", label: "Correct the record in one ledger so that both systems agree." },
  { id: "treat_zero", label: "Treat the missing amount as zero and close the line." },
  {
    id: "merge_duplicates",
    label: "Combine the repeated rows into one line and compare the total.",
  },
  { id: "not_sure", label: "I cannot choose a next step from what is shown." },
] as const;

export type LabStudyNextStepId = (typeof LAB_STUDY_NEXT_STEPS)[number]["id"];

export function isNextStepId(value: unknown): value is LabStudyNextStepId {
  return LAB_STUDY_NEXT_STEPS.some((s) => s.id === value);
}

export interface LabStudyTrial {
  /** 1-based position across the whole session. */
  position: number;
  /** 1 or 2: which part of the session. */
  part: 1 | 2;
  condition: LabStudyCondition;
  set: LabStudySet;
  caseId: string;
}

/** Small deterministic PRNG so a recorded seed reproduces the case order. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function buildStudySchedule(arm: LabStudyArmId, seed: number): LabStudyTrial[] {
  const rand = mulberry32(seed);
  const trials: LabStudyTrial[] = [];
  LAB_STUDY_ARMS[arm].forEach((block, index) => {
    for (const c of shuffled(studySet(block.set), rand)) {
      trials.push({
        position: trials.length + 1,
        part: index === 0 ? 1 : 2,
        condition: block.condition,
        set: block.set,
        caseId: c.id,
      });
    }
  });
  return trials;
}

/** What version B actually showed for one case. Null in version A. */
export interface LabStudyExplanationRecord {
  /** "ok" when an explanation was shown, otherwise the failure reason. */
  status: string;
  resultKind: "ai" | "rule_based" | null;
  /** Attempts made for this case, including retries the reviewer asked for. */
  attempts: number;
  /** Wait from case display until the shown result arrived. */
  waitMs: number;
}

export interface LabStudyResponse extends LabStudyTrial {
  chosenStepId: LabStudyNextStepId;
  /** From the moment all evidence for the case was on screen until submit. */
  decisionMs: number;
  /** True if the tab was hidden at any point while deciding. */
  pageHiddenWhileDeciding: boolean;
  explanation: LabStudyExplanationRecord | null;
}

export interface LabStudySession {
  studyVersion: typeof LAB_STUDY_VERSION;
  /** Random, generated in the browser. Not linked to any person or device id. */
  sessionId: string;
  arm: LabStudyArmId;
  armSource: "random" | "facilitator";
  seed: number;
  schedule: LabStudyTrial[];
  responses: LabStudyResponse[];
}

export interface LabStudyExport {
  format: typeof LAB_STUDY_EXPORT_FORMAT;
  studyVersion: string;
  fixtureVersion: string;
  corpusVersion: string;
  sessionId: string;
  arm: LabStudyArmId;
  armSource: "random" | "facilitator";
  seed: number;
  complete: boolean;
  responses: LabStudyResponse[];
}

export function newStudySession(
  arm: LabStudyArmId,
  armSource: LabStudySession["armSource"],
  sessionId: string,
  seed: number,
): LabStudySession {
  return {
    studyVersion: LAB_STUDY_VERSION,
    sessionId,
    arm,
    armSource,
    seed,
    schedule: buildStudySchedule(arm, seed),
    responses: [],
  };
}

export function buildStudyExport(session: LabStudySession): LabStudyExport {
  return {
    format: LAB_STUDY_EXPORT_FORMAT,
    studyVersion: session.studyVersion,
    fixtureVersion: LAB_FIXTURE_VERSION,
    corpusVersion: LAB_PROCEDURE_CORPUS_VERSION,
    sessionId: session.sessionId,
    arm: session.arm,
    armSource: session.armSource,
    seed: session.seed,
    complete: session.responses.length === session.schedule.length,
    responses: session.responses,
  };
}

/** Structural check for a restored session, so a stale or edited value is discarded. */
export function isStudySession(value: unknown): value is LabStudySession {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<LabStudySession>;
  return (
    v.studyVersion === LAB_STUDY_VERSION &&
    typeof v.sessionId === "string" &&
    isStudyArm(v.arm) &&
    (v.armSource === "random" || v.armSource === "facilitator") &&
    typeof v.seed === "number" &&
    Array.isArray(v.schedule) &&
    Array.isArray(v.responses) &&
    v.responses.length <= v.schedule.length &&
    v.responses.every((r, i) => r.caseId === v.schedule![i].caseId && isNextStepId(r.chosenStepId))
  );
}
