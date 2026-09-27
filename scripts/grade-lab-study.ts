#!/usr/bin/env bun
/**
 * Grade reconciliation-lab comparison-study exports offline.
 *
 *   bun scripts/grade-lab-study.ts results/*.json
 *
 * Reads anonymous export files downloaded from the study view, grades each
 * chosen next step against the study grading key, and prints counts per
 * version. Nothing is sent anywhere. The grading definition lives in the pull
 * request that introduced the study and in src/lib/lab/study/grading.ts.
 */

import { readFileSync } from "node:fs";
import {
  gradeStudyResponse,
  isDegradedTrial,
  parseStudyExports,
  summarizeStudyExports,
} from "../src/lib/lab/study/grading.ts";

const files = process.argv.slice(2);
if (!files.length) {
  console.error("Usage: bun scripts/grade-lab-study.ts <export.json> [more.json ...]");
  process.exit(1);
}

const exports = parseStudyExports(files.map((f) => JSON.parse(readFileSync(f, "utf8"))));
const incomplete = exports.filter((e) => !e.complete).length;
const arms = [1, 2, 3, 4].map((a) => `${a}:${exports.filter((e) => e.arm === a).length}`).join(" ");

console.log(`Sessions: ${exports.length} (incomplete: ${incomplete}). Sessions per arm ${arms}.`);
console.log("");
console.log("session   pos  ver  case        chosen               grade");
for (const e of exports) {
  for (const r of e.responses) {
    const grade = isDegradedTrial(r)
      ? "degraded (excluded)"
      : gradeStudyResponse(r.caseId, r.chosenStepId);
    console.log(
      `${e.sessionId.slice(0, 8)}  ${String(r.position).padStart(3)}  ${r.condition}    ${r.caseId.padEnd(10)}  ${r.chosenStepId.padEnd(19)}  ${grade}`,
    );
  }
}
console.log("");
for (const s of summarizeStudyExports(exports)) {
  const c = s.counts;
  console.log(
    `Version ${s.condition}: graded ${s.graded}, degraded excluded ${s.degradedExcluded}; ` +
      `appropriate ${c.appropriate}, over_escalated ${c.over_escalated}, wrong_procedure ${c.wrong_procedure}, ` +
      `unsupported_step ${c.unsupported_step}, unsafe ${c.unsafe}, no_answer ${c.no_answer}; ` +
      `median decision ${s.medianDecisionMs === null ? "n/a" : `${s.medianDecisionMs} ms`}`,
  );
}
