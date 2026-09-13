/**
 * Deterministic reconciliation comparison. Code owns all arithmetic.
 *
 * Rules:
 * - records are matched by id only
 * - amounts are compared as integer cents, never as floating point dollars
 * - duplicate ids inside one system are rejected, never merged or summed
 * - a record present in one system only is reported as missing in the other,
 *   in both directions, and is never treated as a zero amount
 * - status differences are reported even when the amounts agree
 *
 * No model is involved in any line of this file.
 */

import type { LabFindingKind, LabRecord } from "./fixtures";

export const LAB_COMPARE_VERSION = "lab-compare-1.0.0" as const;

export interface LabFinding {
  id: string;
  label: string;
  kind: LabFindingKind;
  amountACents: number | null;
  amountBCents: number | null;
  /** A minus B in cents when both sides exist, otherwise null. */
  deltaCents: number | null;
  statusA: LabRecord["status"] | null;
  statusB: LabRecord["status"] | null;
}

export interface LabInputError {
  code: "duplicate_id" | "invalid_amount" | "invalid_record";
  system: "A" | "B";
  detail: string;
}

export interface LabComparison {
  findings: LabFinding[];
  inputErrors: LabInputError[];
  summary: {
    compared: number;
    matched: number;
    amountMismatches: number;
    statusMismatches: number;
    missingInB: number;
    missingInA: number;
    absoluteDeltaCents: number;
    unmatchedAmountCents: number;
  };
  compareVersion: typeof LAB_COMPARE_VERSION;
}

function indexBySystem(
  records: LabRecord[],
  system: "A" | "B",
  errors: LabInputError[],
): Map<string, LabRecord> {
  const map = new Map<string, LabRecord>();
  for (const record of records) {
    if (!record || typeof record.id !== "string" || record.id.trim() === "") {
      errors.push({ code: "invalid_record", system, detail: "Record is missing a usable id." });
      continue;
    }
    if (!Number.isInteger(record.amountCents)) {
      errors.push({
        code: "invalid_amount",
        system,
        detail: `Record ${record.id} does not carry an integer cent amount.`,
      });
      continue;
    }
    if (map.has(record.id)) {
      // Rejected, not merged: summing duplicates would invent a total.
      errors.push({
        code: "duplicate_id",
        system,
        detail: `Record id ${record.id} appears more than once in system ${system}.`,
      });
      continue;
    }
    map.set(record.id, record);
  }
  return map;
}

export function compareLabRecords(systemA: LabRecord[], systemB: LabRecord[]): LabComparison {
  const inputErrors: LabInputError[] = [];
  const a = indexBySystem(systemA, "A", inputErrors);
  const b = indexBySystem(systemB, "B", inputErrors);

  const ids = Array.from(new Set([...a.keys(), ...b.keys()])).sort();
  const findings: LabFinding[] = [];

  for (const id of ids) {
    const left = a.get(id);
    const right = b.get(id);

    if (left && !right) {
      findings.push({
        id,
        label: left.label,
        kind: "missing_in_b",
        amountACents: left.amountCents,
        amountBCents: null,
        deltaCents: null,
        statusA: left.status,
        statusB: null,
      });
      continue;
    }
    if (!left && right) {
      findings.push({
        id,
        label: right.label,
        kind: "missing_in_a",
        amountACents: null,
        amountBCents: right.amountCents,
        deltaCents: null,
        statusA: null,
        statusB: right.status,
      });
      continue;
    }
    if (!left || !right) continue;

    const amountDiffers = left.amountCents !== right.amountCents;
    const statusDiffers = left.status !== right.status;
    const kind: LabFindingKind =
      amountDiffers && statusDiffers
        ? "amount_and_status_mismatch"
        : amountDiffers
          ? "amount_mismatch"
          : statusDiffers
            ? "status_mismatch"
            : "match";

    findings.push({
      id,
      label: left.label,
      kind,
      amountACents: left.amountCents,
      amountBCents: right.amountCents,
      deltaCents: left.amountCents - right.amountCents,
      statusA: left.status,
      statusB: right.status,
    });
  }

  const summary = {
    compared: findings.length,
    matched: findings.filter((f) => f.kind === "match").length,
    amountMismatches: findings.filter(
      (f) => f.kind === "amount_mismatch" || f.kind === "amount_and_status_mismatch",
    ).length,
    statusMismatches: findings.filter(
      (f) => f.kind === "status_mismatch" || f.kind === "amount_and_status_mismatch",
    ).length,
    missingInB: findings.filter((f) => f.kind === "missing_in_b").length,
    missingInA: findings.filter((f) => f.kind === "missing_in_a").length,
    unmatchedAmountCents: findings.reduce((sum, f) => sum + (f.deltaCents === null ? Math.abs(f.amountACents ?? f.amountBCents ?? 0) : 0), 0),
    absoluteDeltaCents: findings.reduce((sum, f) => sum + Math.abs(f.deltaCents ?? 0), 0),
  };

  return { findings, inputErrors, summary, compareVersion: LAB_COMPARE_VERSION };
}

/** Cents to a display string. Presentation only; never used for math. */
export function formatCents(cents: number | null): string {
  if (cents === null) return "no record";
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const rest = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}$${whole.toLocaleString("en-US")}.${rest}`;
}

/** Distinct finding kinds present, sorted, for eval comparisons. */
export function findingKinds(comparison: LabComparison): LabFindingKind[] {
  return Array.from(new Set(comparison.findings.map((f) => f.kind))).sort();
}
