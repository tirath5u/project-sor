import { describe, expect, it } from "vitest";
import { compareLabRecords, findingKinds, formatCents } from "./compare";
import { LAB_SCENARIOS, getLabScenario, type LabRecord } from "./fixtures";
import { decideReviewGate, retrieveProcedures, LAB_RETRIEVAL_METHOD } from "./retrieval";
import {
  LabExplainRequestSchema,
  LabExplanationSchema,
  validateCitations,
} from "./ai-contract";
import { reserveLabCall } from "./throttle";

const rec = (over: Partial<LabRecord> = {}): LabRecord => ({
  id: "R-1",
  label: "Line",
  amountCents: 1000,
  status: "posted",
  ...over,
});

describe("deterministic comparison", () => {
  it("detects an amount mismatch in integer cents", () => {
    const c = compareLabRecords([rec({ amountCents: 100000 })], [rec({ amountCents: 80000 })]);
    expect(c.findings[0].kind).toBe("amount_mismatch");
    expect(c.findings[0].deltaCents).toBe(20000);
    expect(c.summary.absoluteDeltaCents).toBe(20000);
    expect(c.inputErrors).toHaveLength(0);
  });

  it("reports the reversed difference with the opposite sign", () => {
    const c = compareLabRecords([rec({ amountCents: 80000 })], [rec({ amountCents: 100000 })]);
    expect(c.findings[0].deltaCents).toBe(-20000);
    expect(c.summary.absoluteDeltaCents).toBe(20000);
  });

  it("finds missing records in both directions", () => {
    const a = compareLabRecords([rec({ id: "R-9" })], []);
    const b = compareLabRecords([], [rec({ id: "R-9" })]);
    expect(a.findings[0].kind).toBe("missing_in_b");
    expect(b.findings[0].kind).toBe("missing_in_a");
  });

  it("never treats a missing record as a zero amount", () => {
    const c = compareLabRecords([rec({ id: "R-0", amountCents: 0 })], []);
    expect(c.findings[0].kind).toBe("missing_in_b");
    expect(c.findings[0].amountBCents).toBeNull();
    expect(c.findings[0].deltaCents).toBeNull();
    // A genuine zero-versus-zero pair is a match, which is a different result.
    const z = compareLabRecords(
      [rec({ id: "R-0", amountCents: 0 })],
      [rec({ id: "R-0", amountCents: 0 })],
    );
    expect(z.findings[0].kind).toBe("match");
  });

  it("detects a status difference when the amounts agree", () => {
    const c = compareLabRecords([rec()], [rec({ status: "pending" })]);
    expect(c.findings[0].kind).toBe("status_mismatch");
    expect(c.findings[0].deltaCents).toBe(0);
  });

  it("reports amount and status differences together", () => {
    const c = compareLabRecords([rec()], [rec({ amountCents: 500, status: "reversed" })]);
    expect(c.findings[0].kind).toBe("amount_and_status_mismatch");
  });

  it("rejects duplicate ids instead of merging them", () => {
    const c = compareLabRecords([rec(), rec({ amountCents: 4000 })], [rec()]);
    expect(c.inputErrors.map((e) => e.code)).toContain("duplicate_id");
    // The first occurrence stands; the duplicate is not summed into a total.
    expect(c.findings[0].amountACents).toBe(1000);
  });

  it("rejects invalid amounts and unusable ids", () => {
    const c = compareLabRecords(
      [rec({ amountCents: 10.5 }), rec({ id: "  " })] as LabRecord[],
      [rec()],
    );
    expect(c.inputErrors.map((e) => e.code)).toEqual(
      expect.arrayContaining(["invalid_amount", "invalid_record"]),
    );
  });

  it("formats cents for display without touching the math", () => {
    expect(formatCents(100000)).toBe("$1,000.00");
    expect(formatCents(null)).toBe("no record");
  });
});

describe("retrieval", () => {
  it("labels its own method honestly", () => {
    expect(LAB_RETRIEVAL_METHOD).toContain("no embeddings");
    expect(LAB_RETRIEVAL_METHOD).toContain("no vector index");
  });

  it("returns no applicable source for the out-of-scope scenario", () => {
    const s = getLabScenario("no-applicable-procedure")!;
    const r = retrieveProcedures(s, compareLabRecords(s.systemA, s.systemB));
    expect(r.passages).toHaveLength(0);
    expect(r.noApplicableSource).toBe(true);
  });

  it("flags contradictory passages for the conflict scenario", () => {
    const s = getLabScenario("conflicting-procedures")!;
    const r = retrieveProcedures(s, compareLabRecords(s.systemA, s.systemB));
    expect(r.conflictingSources).toBe(true);
    expect(r.passages.map((p) => p.id)).toEqual(expect.arrayContaining(["FP-201", "FP-202"]));
  });
});

describe("eval: all six scenarios against independently written expectations", () => {
  for (const scenario of LAB_SCENARIOS) {
    it(`${scenario.id} matches its expected outcome`, () => {
      const comparison = compareLabRecords(scenario.systemA, scenario.systemB);
      const retrieval = retrieveProcedures(scenario, comparison);
      const gate = decideReviewGate(comparison, retrieval);

      expect(findingKinds(comparison)).toEqual([...scenario.expected.kinds].sort());
      expect(comparison.inputErrors.length > 0).toBe(scenario.expected.hasInputError);
      expect(gate.requireHumanReview).toBe(scenario.expected.requireHumanReview);
      expect(gate.allowProposedCorrection).toBe(scenario.expected.allowProposedCorrection);
    });
  }

  it("covers exactly the six documented scenarios", () => {
    expect(LAB_SCENARIOS.map((s) => s.id)).toEqual([
      "amount-mismatch",
      "missing-record",
      "status-mismatch",
      "matching-records",
      "conflicting-procedures",
      "no-applicable-procedure",
    ]);
  });

  it("blocks a proposed correction whenever sources are missing or conflicting", () => {
    for (const id of ["conflicting-procedures", "no-applicable-procedure"]) {
      const s = getLabScenario(id)!;
      const comparison = compareLabRecords(s.systemA, s.systemB);
      const gate = decideReviewGate(comparison, retrieveProcedures(s, comparison));
      expect(gate.allowProposedCorrection).toBe(false);
      expect(gate.requireHumanReview).toBe(true);
    }
  });

  it("requires human review when the input data is rejected", () => {
    const comparison = compareLabRecords([rec(), rec()], [rec()]);
    const s = getLabScenario("amount-mismatch")!;
    const gate = decideReviewGate(comparison, retrieveProcedures(s, comparison));
    expect(gate.requireHumanReview).toBe(true);
    expect(gate.allowProposedCorrection).toBe(false);
  });
});

describe("AI contract validation", () => {
  it("rejects a request without a scenario id", () => {
    expect(LabExplainRequestSchema.safeParse({}).success).toBe(false);
    expect(LabExplainRequestSchema.safeParse({ scenarioId: "x", extra: 1 }).success).toBe(false);
    expect(LabExplainRequestSchema.safeParse({ scenarioId: "amount-mismatch" }).success).toBe(true);
  });

  it("rejects model output that misses required fields", () => {
    expect(LabExplanationSchema.safeParse({ summary: "hi" }).success).toBe(false);
  });

  it("accepts well-formed model output", () => {
    const ok = LabExplanationSchema.safeParse({
      summary: "Amounts differ.",
      observations: ["A reports 1,000 and B reports 800."],
      citedSourceIds: ["FP-101"],
      proposedNextStep: "Ask the source system owner which figure was entered last.",
      proposedCorrection: null,
      uncertainty: "The lab does not know which entry is newer.",
      requiresHumanReview: false,
    });
    expect(ok.success).toBe(true);
  });

  it("rejects citations that were never retrieved", () => {
    expect(validateCitations(["FP-101", "FP-999"], ["FP-101"])).toEqual({
      ok: false,
      unknown: ["FP-999"],
    });
    expect(validateCitations(["FP-101"], ["FP-101", "FP-102"])).toEqual({ ok: true });
  });
});

describe("fail-closed cost boundary", () => {
  it("denies reservations when durable storage is unavailable", async () => {
    expect(await reserveLabCall()).toMatchObject({ allowed: false, reason: "quota_storage_unavailable" });
  });
  it("denies every concurrent reservation without a backend", async () => {
    const results = await Promise.all(Array.from({ length: 250 }, () => reserveLabCall()));
    expect(results.every((r) => !r.allowed)).toBe(true);
  });
  it("rejects empty citations when passages exist", () => {
    expect(validateCitations([], ["FP-101"]).ok).toBe(false);
    expect(validateCitations([], []).ok).toBe(true);
  });
});
