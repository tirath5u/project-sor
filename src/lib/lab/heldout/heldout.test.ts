/**
 * Structural and separation checks for the held-out set.
 *
 * These tests never run the comparison engine, retrieval, or the model on a
 * held-out input, and they report no scores. They only check that the set is
 * well formed and that the answer key cannot reach the runtime.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getLabScenario } from "../fixtures";
import { LAB_HELDOUT_INPUTS } from "./inputs";
import { LAB_HELDOUT_ANSWER_KEY, type LabHeldOutCategory } from "./answer-key";

const SRC = path.resolve(__dirname, "../../..");
const LAB = path.resolve(__dirname, "..");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("held-out set shape", () => {
  it("has 20 inputs and 20 answers with the same ids in the same order", () => {
    expect(LAB_HELDOUT_INPUTS).toHaveLength(20);
    expect(LAB_HELDOUT_ANSWER_KEY.map((a) => a.id)).toEqual(LAB_HELDOUT_INPUTS.map((c) => c.id));
    expect(new Set(LAB_HELDOUT_INPUTS.map((c) => c.id)).size).toBe(20);
  });

  it("covers all six categories", () => {
    const categories: LabHeldOutCategory[] = [
      "amount_mismatch",
      "missing_record",
      "status_mismatch",
      "duplicate",
      "conflicting_procedure",
      "no_applicable_procedure",
    ];
    for (const category of categories) {
      expect(LAB_HELDOUT_ANSWER_KEY.some((a) => a.category === category)).toBe(true);
    }
  });

  it("records a route, a decline decision and a safe next step for every case", () => {
    for (const a of LAB_HELDOUT_ANSWER_KEY) {
      expect(["model_call", "deterministic_escalation"]).toContain(a.expectedRoute);
      expect(typeof a.shouldDecline).toBe("boolean");
      expect(a.expectedSafeNextStep.length).toBeGreaterThan(0);
      expect(a.allowProposedCorrection).toBe(false);
      if (a.shouldDecline) expect(a.declineScope).toBeTruthy();
      if (a.expectedRoute === "deterministic_escalation") {
        expect(a.shouldDecline).toBe(true);
        expect(a.requireHumanReview).toBe(true);
      }
    }
  });

  it("uses integer cent amounts and record ids outside the built-in range", () => {
    for (const c of LAB_HELDOUT_INPUTS) {
      for (const r of [...c.systemA, ...c.systemB]) {
        expect(Number.isInteger(r.amountCents)).toBe(true);
        expect(r.id).toMatch(/^R-[789]\d{3}$/);
      }
    }
  });
});

describe("held-out answers stay out of the runtime", () => {
  it("is not reachable through the public scenario lookup", () => {
    for (const c of LAB_HELDOUT_INPUTS) expect(getLabScenario(c.id)).toBeUndefined();
  });

  it("carries no answer fields on the inputs", () => {
    for (const c of LAB_HELDOUT_INPUTS) {
      expect(Object.keys(c)).not.toContain("expected");
      for (const key of Object.keys(LAB_HELDOUT_ANSWER_KEY[0])) {
        if (key !== "id") expect(Object.keys(c)).not.toContain(key);
      }
    }
  });

  it("keeps expected answers out of the text that retrieval and the prompt read", () => {
    const leakPattern =
      /\b(FP-\d{3}|escalat\w*|human review\w*|decline\w*|model_call|deterministic|variance note|owning office|originating entry)\b/i;
    for (const c of LAB_HELDOUT_INPUTS) {
      const runtimeText = [c.title, c.question, c.notes, ...(c.extraQueryTags ?? [])].join(" ");
      expect(runtimeText).not.toMatch(leakPattern);
      const answer = LAB_HELDOUT_ANSWER_KEY.find((a) => a.id === c.id)!;
      expect(runtimeText).not.toContain(answer.expectedSafeNextStep);
    }
  });

  it("is imported by no runtime module and not by the inputs file", () => {
    const runtime = sourceFiles(SRC).filter(
      (f) => !f.startsWith(path.join(LAB, "heldout")) && !/\.test\.tsx?$/.test(f),
    );
    expect(runtime.length).toBeGreaterThan(0);
    for (const file of runtime) {
      expect(readFileSync(file, "utf8"), path.relative(SRC, file)).not.toMatch(/from\s+["'][^"']*heldout/);
    }
    expect(readFileSync(path.join(__dirname, "inputs.ts"), "utf8")).not.toMatch(
      /(from|import\()\s*["'][^"']*answer-key/,
    );
  });
});
