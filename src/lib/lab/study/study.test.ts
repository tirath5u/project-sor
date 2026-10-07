import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compareLabRecords, findingKinds } from "../compare";
import { LAB_SCENARIOS } from "../fixtures";
import { decideReviewGate, retrieveProcedures } from "../retrieval";
import { LAB_HELDOUT_INPUTS } from "../heldout/inputs";
import { LAB_STUDY_CASES, LAB_STUDY_SET_X, LAB_STUDY_SET_Y, getLabStudyCase } from "./cases";
import {
  LAB_STUDY_ARMS,
  LAB_STUDY_ARM_IDS,
  LAB_STUDY_NEXT_STEPS,
  buildStudyExport,
  buildStudySchedule,
  isStudySession,
  newStudySession,
  type LabStudyResponse,
  type LabStudySession,
} from "./design";
import { LAB_STUDY_GRADING_KEY } from "./grading-key";
import {
  gradeStudyResponse,
  isDegradedTrial,
  parseStudyExports,
  summarizeStudyExports,
} from "./grading";

const SRC = path.resolve(__dirname, "../../..");

function run(caseId: string) {
  const c = getLabStudyCase(caseId)!;
  const comparison = compareLabRecords(c.systemA, c.systemB);
  const retrieval = retrieveProcedures(c, comparison);
  return { comparison, retrieval, gate: decideReviewGate(comparison, retrieval) };
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("study case sets", () => {
  it("has two sets of six with unique ids that collide with no other case", () => {
    expect(LAB_STUDY_SET_X).toHaveLength(6);
    expect(LAB_STUDY_SET_Y).toHaveLength(6);
    const ids = LAB_STUDY_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(12);
    for (const other of [...LAB_SCENARIOS, ...LAB_HELDOUT_INPUTS]) {
      expect(ids).not.toContain(other.id);
    }
    expect(LAB_STUDY_SET_X.every((c) => c.set === "X")).toBe(true);
    expect(LAB_STUDY_SET_Y.every((c) => c.set === "Y")).toBe(true);
  });

  it("carries no expected answer or category into the browser-side cases", () => {
    for (const c of LAB_STUDY_CASES) {
      expect(Object.keys(c).sort()).toEqual(
        expect.not.arrayContaining(["expected", "category", "pair", "appropriateStepId"]),
      );
    }
  });

  it("pairs are equivalent: same shape, wording, findings, procedures and escalation", () => {
    for (let i = 0; i < 6; i++) {
      const x = LAB_STUDY_SET_X[i];
      const y = LAB_STUDY_SET_Y[i];
      const strip = (s: string) => s.replace(/R-[XY]\d{3}/g, "R-ID");
      expect(strip(y.question)).toBe(strip(x.question));
      expect(y.notes).toBe(x.notes);
      expect(y.systemA.length).toBe(x.systemA.length);
      expect(y.systemB.length).toBe(x.systemB.length);
      expect(y.extraQueryTags).toEqual(x.extraQueryTags);

      const rx = run(x.id);
      const ry = run(y.id);
      expect(findingKinds(ry.comparison)).toEqual(findingKinds(rx.comparison));
      expect(ry.comparison.inputErrors.map((e) => e.code)).toEqual(
        rx.comparison.inputErrors.map((e) => e.code),
      );
      expect(ry.retrieval.passages.map((p) => p.id)).toEqual(
        rx.retrieval.passages.map((p) => p.id),
      );
      expect(ry.gate).toEqual(rx.gate);
      // Same absolute difference where the input is accepted. In the duplicate
      // pair the input is rejected; there both sets repeat one row whose two
      // copies add up exactly to the other ledger's amount.
      if (rx.comparison.inputErrors.length === 0) {
        expect(ry.comparison.summary.absoluteDeltaCents).toBe(
          rx.comparison.summary.absoluteDeltaCents,
        );
      } else {
        for (const c of [x, y]) {
          expect(c.systemA[0].amountCents * 2).toBe(c.systemB[0].amountCents);
        }
      }
    }
  });

  it("is reachable by the explain endpoint lookup, while held-out cases are not", () => {
    for (const c of LAB_STUDY_CASES) expect(getLabStudyCase(c.id)).toBe(c);
    for (const h of LAB_HELDOUT_INPUTS) expect(getLabStudyCase(h.id)).toBeUndefined();
  });
});

describe("grading key", () => {
  it("covers every study case once, and matched pairs share an answer", () => {
    expect(LAB_STUDY_GRADING_KEY.map((k) => k.caseId).sort()).toEqual(
      LAB_STUDY_CASES.map((c) => c.id).sort(),
    );
    for (const k of LAB_STUDY_GRADING_KEY) {
      const partner = LAB_STUDY_GRADING_KEY.find(
        (o) => o.pair === k.pair && o.caseId !== k.caseId,
      )!;
      expect(partner.appropriateStepId).toBe(k.appropriateStepId);
    }
  });

  it("agrees with the code-decided escalation and the one retrieved procedure", () => {
    const stepFor: Record<string, string> = {
      "FP-101": "variance_note",
      "FP-102": "request_originating",
      "FP-103": "confirm_status",
    };
    for (const k of LAB_STUDY_GRADING_KEY) {
      const { retrieval, gate } = run(k.caseId);
      if (gate.requireHumanReview) {
        expect(k.appropriateStepId).toBe("escalate");
      } else {
        expect(retrieval.passages).toHaveLength(1);
        expect(k.appropriateStepId).toBe(stepFor[retrieval.passages[0].id]);
      }
    }
  });

  it("is imported only by grading code and tests, never by the page or the runtime", () => {
    const importers = sourceFiles(SRC).filter(
      (f) =>
        !/\.test\.tsx?$/.test(f) &&
        /from\s+["'][^"']*study\/grading(-key)?["']|from\s+["']\.\/grading(-key)?["']/.test(
          readFileSync(f, "utf8"),
        ),
    );
    expect(importers.map((f) => path.relative(SRC, f))).toEqual([
      path.join("lib", "lab", "study", "grading.ts"),
    ]);
  });
});

describe("counterbalanced schedule", () => {
  it("fully crosses set-to-version pairing with version order", () => {
    const combos = LAB_STUDY_ARM_IDS.map((arm) =>
      LAB_STUDY_ARMS[arm].map((b) => `${b.set}${b.condition}`).join(">"),
    );
    expect(new Set(combos).size).toBe(4);
    expect(combos.sort()).toEqual(["XA>YB", "XB>YA", "YA>XB", "YB>XA"]);
  });

  it("never shows a reviewer the same case twice, in any arm or seed", () => {
    for (const arm of LAB_STUDY_ARM_IDS) {
      for (const seed of [0, 1, 42, 2 ** 31, 2 ** 32 - 1]) {
        const s = buildStudySchedule(arm, seed);
        expect(s).toHaveLength(12);
        expect(new Set(s.map((t) => t.caseId)).size).toBe(12);
        expect(s.map((t) => t.position)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
        const [first, second] = LAB_STUDY_ARMS[arm];
        expect(
          s
            .slice(0, 6)
            .every((t) => t.part === 1 && t.set === first.set && t.condition === first.condition),
        ).toBe(true);
        expect(
          s
            .slice(6)
            .every((t) => t.part === 2 && t.set === second.set && t.condition === second.condition),
        ).toBe(true);
      }
    }
  });

  it("reproduces the case order from the recorded seed", () => {
    expect(buildStudySchedule(3, 12345)).toEqual(buildStudySchedule(3, 12345));
  });
});

function respond(session: LabStudySession, step = "escalate"): LabStudySession {
  const responses: LabStudyResponse[] = session.schedule.map((t) => ({
    ...t,
    chosenStepId: step as LabStudyResponse["chosenStepId"],
    decisionMs: 1000 + t.position,
    pageHiddenWhileDeciding: false,
    explanation:
      t.condition === "B" ? { status: "ok", resultKind: "ai", attempts: 1, waitMs: 900 } : null,
  }));
  return { ...session, responses };
}

describe("anonymous export", () => {
  const session = respond(newStudySession(2, "random", "00000000-0000-4000-8000-000000000000", 7));

  it("holds only study fields: no clock time, browser details or free text", () => {
    const data = buildStudyExport(session);
    expect(Object.keys(data).sort()).toEqual(
      [
        "arm",
        "armSource",
        "complete",
        "corpusVersion",
        "fixtureVersion",
        "format",
        "responses",
        "seed",
        "sessionId",
        "studyVersion",
      ].sort(),
    );
    for (const r of data.responses) {
      expect(Object.keys(r).sort()).toEqual(
        [
          "caseId",
          "chosenStepId",
          "condition",
          "decisionMs",
          "explanation",
          "pageHiddenWhileDeciding",
          "part",
          "position",
          "set",
        ].sort(),
      );
    }
    expect(data.complete).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it("offers a fixed option list that includes unsafe choices", () => {
    const ids = LAB_STUDY_NEXT_STEPS.map((s) => s.id);
    expect(ids).toEqual(
      expect.arrayContaining(["correct_record", "treat_zero", "merge_duplicates"]),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("restores only well-formed sessions", () => {
    expect(isStudySession(session)).toBe(true);
    expect(isStudySession({ ...session, arm: 5 })).toBe(false);
    const tampered = { ...session, responses: [{ ...session.responses[0], caseId: "study-x-9" }] };
    expect(isStudySession(tampered)).toBe(false);
  });
});

describe("grading", () => {
  it("grades each kind of choice as defined", () => {
    expect(gradeStudyResponse("study-x-1", "variance_note")).toBe("appropriate");
    expect(gradeStudyResponse("study-x-1", "escalate")).toBe("over_escalated");
    expect(gradeStudyResponse("study-x-1", "confirm_status")).toBe("wrong_procedure");
    expect(gradeStudyResponse("study-y-5", "confirm_status")).toBe("unsupported_step");
    expect(gradeStudyResponse("study-y-4", "merge_duplicates")).toBe("unsafe");
    expect(gradeStudyResponse("study-x-2", "treat_zero")).toBe("unsafe");
    expect(gradeStudyResponse("study-x-6", "close_clean")).toBe("unsafe");
    expect(gradeStudyResponse("study-x-3", "not_sure")).toBe("no_answer");
  });

  it("excludes version B trials where no explanation was shown", () => {
    const base = respond(newStudySession(1, "random", "a", 1));
    const degraded = {
      ...base,
      responses: base.responses.map((r) =>
        r.condition === "B"
          ? {
              ...r,
              explanation: { status: "rate_limited", resultKind: null, attempts: 1, waitMs: 50 },
            }
          : r,
      ),
    };
    expect(degraded.responses.filter(isDegradedTrial)).toHaveLength(6);
    const [a, b] = summarizeStudyExports([buildStudyExport(degraded)]);
    expect(a.graded).toBe(6);
    expect(b.graded).toBe(0);
    expect(b.degradedExcluded).toBe(6);
  });

  it("rejects repeated sessions, repeated cases and foreign files", () => {
    const e = buildStudyExport(respond(newStudySession(1, "random", "s1", 1)));
    expect(() => parseStudyExports([e, e])).toThrow(/more than once/);
    const repeated = { ...e, responses: [e.responses[0], e.responses[0]] };
    expect(() => parseStudyExports([repeated])).toThrow(/repeated case/);
    expect(() => parseStudyExports([{ hello: "world" }])).toThrow(/not a valid/);
  });
});
