/**
 * OBBBA / Working Families Tax Cuts Act — Annual Loan Limits, AY 2026-27.
 *
 * v18 master spreadsheet uses 14 numeric grade codes (0..13) covering every
 * undergraduate, graduate, professional, and teacher-cert tier. Each row
 * exposes the Direct Subsidized statutory cap and the combined Sub+Unsub cap
 * at both Dependent and Independent levels (Independent applies if dependency
 * is Independent OR a dependent's parent was denied PLUS).
 *
 * Source: Pub. L. 119-21 + ED Dear Colleague Apr-2026.
 */

export type GradeLevel =
  | "g0"
  | "g1"
  | "g2"
  | "g3"
  | "g4"
  | "g5"
  | "g6"
  | "g7"
  | "graduate"
  | "professional"
  | "g10_teacher_cert"
  | "g11_prep_undergrad"
  | "g12_prep_teacher"
  | "g13_prep_grad";

// Backwards-compat aliases (used by older callers).
export type LegacyGradeLevel = "g0_1" | "g3plus";

export type Dependency = "dependent" | "independent";

export interface LoanLimitRow {
  /** Direct Subsidized annual statutory cap. */
  sub: number;
  /** Total combined Sub + Unsub annual cap. */
  combined: number;
}

/**
 * 2026-27 limits per OBBBA. Combined column = Sub + Unsub maximum.
 * Independent (and PLUS-denied dependent) undergrads get the higher
 * combined cap; grad/professional borrowers are independent by definition.
 *
 * Codes 10-13 are the Title-IV "preparatory coursework" rows from v18 — they
 * use the same caps as the corresponding regular tier (1st-yr undergrad for
 * 10/11, graduate for 13, etc.) per ED guidance.
 */
export const LIMITS: Record<GradeLevel, Record<Dependency, LoanLimitRow>> = {
  g0: {
    dependent: { sub: 3500, combined: 5500 },
    independent: { sub: 3500, combined: 9500 },
  },
  g1: {
    dependent: { sub: 3500, combined: 5500 },
    independent: { sub: 3500, combined: 9500 },
  },
  g2: {
    dependent: { sub: 4500, combined: 6500 },
    independent: { sub: 4500, combined: 10500 },
  },
  g3: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
  g4: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
  g5: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
  g6: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
  g7: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
  graduate: {
    dependent: { sub: 0, combined: 20500 },
    independent: { sub: 0, combined: 20500 },
  },
  professional: {
    dependent: { sub: 0, combined: 50000 },
    independent: { sub: 0, combined: 50000 },
  },
  g10_teacher_cert: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
  g11_prep_undergrad: {
    dependent: { sub: 2625, combined: 6625 },
    independent: { sub: 2625, combined: 10625 },
  },
  g12_prep_teacher: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
  g13_prep_grad: {
    dependent: { sub: 5500, combined: 7500 },
    independent: { sub: 5500, combined: 12500 },
  },
};

/**
 * v19 — Two parallel limit tables.
 *
 * `LEGACY_LIMITS` mirrors the v18 values used for grandfathered students
 * (Loan Limit Exception = Yes). `OBBB_LIMITS` is the post-OBBB 2026-27 table
 * used for non-grandfathered students. Per the v19 plan §3.2, the OBBB table
 * currently MIRRORS the Legacy values as a working placeholder pending the
 * final ED rule. Update OBBB_LIMITS in place when the final values land.
 */
export const LEGACY_LIMITS = LIMITS;
export const OBBB_LIMITS: Record<GradeLevel, Record<Dependency, LoanLimitRow>> = LIMITS;

/** True until ED publishes the final OBBB 2026-27 limit table. Drives the UI banner. */
export const OBBB_TABLE_IS_PLACEHOLDER = true;

export const GRADE_LABELS: Record<GradeLevel, string> = {
  g0: "0 - 1st-year undergrad (≤ 1 AY remaining)",
  g1: "1 - 1st-year undergrad",
  g2: "2 - 2nd-year undergrad",
  g3: "3 - 3rd-year undergrad",
  g4: "4 - 4th-year undergrad",
  g5: "5 - 5th-year undergrad",
  g6: "6 - Continuing undergrad",
  g7: "7 - Senior / 4+ year",
  graduate: "G - Graduate",
  professional: "P - Professional",
  g10_teacher_cert: "10 - Post-bacc teacher certification",
  g11_prep_undergrad: "11 - Preparatory coursework, undergrad",
  g12_prep_teacher: "12 - Preparatory coursework, teacher cert",
  g13_prep_grad: "13 - Preparatory coursework, graduate",
};

export const GRADE_GROUPS: { label: string; codes: GradeLevel[] }[] = [
  {
    label: "Undergraduate",
    codes: ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"],
  },
  { label: "Graduate / Professional", codes: ["graduate", "professional"] },
  {
    label: "Teacher cert / Preparatory",
    codes: ["g10_teacher_cert", "g11_prep_undergrad", "g12_prep_teacher", "g13_prep_grad"],
  },
];

export function lookupLimits(
  grade: GradeLevel,
  dependency: Dependency,
  parentPlusDenied: boolean = false,
  useLegacyTable: boolean = true,
): {
  sub: number;
  unsub: number;
  /** Portion of unsub that comes from the PLUS-denial uplift (Independent − Dependent). */
  additionalUnsub: number;
} {
  // Defensive: map legacy/unknown grade keys to a sane default so a stale
  // saved scenario can't blank-screen the app.
  const safeGrade: GradeLevel = (LIMITS as Record<string, unknown>)[grade]
    ? grade
    : grade === ("g0_1" as string)
      ? "g1"
      : grade === ("g3plus" as string)
        ? "g3"
        : "g1";
  const isGP = isGradOrProf(safeGrade);
  // Grad/Prof are independent by definition; PLUS denial doesn't apply.
  const effectiveDep: Dependency =
    isGP || dependency === "independent" || parentPlusDenied ? "independent" : "dependent";
  const table = useLegacyTable ? LEGACY_LIMITS : OBBB_LIMITS;
  const row = table[safeGrade][effectiveDep];
  const baseRow = table[safeGrade]["dependent"];
  const baseUnsub = Math.max(0, baseRow.combined - baseRow.sub);
  const totalUnsub = Math.max(0, row.combined - row.sub);
  const additionalUnsub =
    !isGP && dependency === "dependent" && parentPlusDenied
      ? Math.max(0, totalUnsub - baseUnsub)
      : 0;
  return { sub: row.sub, unsub: totalUnsub, additionalUnsub };
}

export function isGradOrProf(grade: GradeLevel): boolean {
  return grade === "graduate" || grade === "professional";
}

/** Aggregate lifetime caps used by the Lifecycle tracker. */
export interface AggregateCap {
  sub: number;
  total: number;
}

export function aggregateCap(
  level: "undergrad_dependent" | "undergrad_independent" | "graduate",
): AggregateCap {
  switch (level) {
    case "undergrad_dependent":
      return { sub: 23000, total: 31000 };
    case "undergrad_independent":
      return { sub: 23000, total: 57500 };
    case "graduate":
      return { sub: 65500, total: 138500 };
  }
}
