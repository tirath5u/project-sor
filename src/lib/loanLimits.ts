/**
 * OBBBA / Working Families Tax Cuts Act - Annual Loan Limits, AY 2026-27.
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
  | "g8"
  | "g9"
  | "g10"
  | "g11"
  | "g12"
  | "g13";

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
 * Codes 10-13 are the Title-IV "preparatory coursework" rows from v18 - they
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
  // 2025-26 ONLY graduate/professional codes (retired for 2026-27 per COD Edit 208).
  g6: {
    dependent: { sub: 0, combined: 20500 },
    independent: { sub: 0, combined: 20500 },
  },
  g7: {
    dependent: { sub: 0, combined: 20500 },
    independent: { sub: 0, combined: 20500 },
  },
  // 2026-27 ONLY graduate/professional codes (new per OBBB).
  g8: {
    dependent: { sub: 0, combined: 20500 },
    independent: { sub: 0, combined: 20500 },
  },
  g9: {
    dependent: { sub: 0, combined: 20500 },
    independent: { sub: 0, combined: 20500 },
  },
  g10: {
    dependent: { sub: 0, combined: 50000 },
    independent: { sub: 0, combined: 50000 },
  },
  g11: {
    dependent: { sub: 0, combined: 50000 },
    independent: { sub: 0, combined: 50000 },
  },
  g12: {
    dependent: { sub: 0, combined: 20500 },
    independent: { sub: 0, combined: 20500 },
  },
  g13: {
    dependent: { sub: 0, combined: 50000 },
    independent: { sub: 0, combined: 50000 },
  },
};

/**
 * Two parallel limit tables. `LEGACY_LIMITS` is used for grandfathered
 * students (Loan Limit Exception = Yes). `OBBB_LIMITS` is used for
 * non-grandfathered students under the post-OBBB 2026-27 rules.
 */
export const LEGACY_LIMITS = LIMITS;
export const OBBB_LIMITS: Record<GradeLevel, Record<Dependency, LoanLimitRow>> = LIMITS;

/** Reserved for any future UI banner about the OBBB limit table. */
export const OBBB_TABLE_IS_PLACEHOLDER = false;

export const GRADE_LABELS: Record<GradeLevel, string> = {
  g0: "0 - 1st Year Undergrad (no prior postsecondary)",
  g1: "1 - 1st Year Undergrad (with prior postsecondary)",
  g2: "2 - 2nd Year Undergrad",
  g3: "3 - 3rd Year Undergrad",
  g4: "4 - 4th Year Undergrad",
  g5: "5 - 5th Year / Other Undergrad",
  g6: "6 - Graduate/Professional (Continuing)",
  g7: "7 - 1st Year Graduate/Professional",
  g8: "8 - Graduate Never Professional",
  g9: "9 - Graduate (Independent only)",
  g10: "10 - Professional (Independent only)",
  g11: "11 - Professional Was Graduate",
  g12: "12 - Graduate Concurrent",
  g13: "13 - Professional Concurrent",
};

export const GRADE_GROUPS: { label: string; codes: GradeLevel[] }[] = [
  {
    label: "Undergraduate",
    codes: ["g0", "g1", "g2", "g3", "g4", "g5"],
  },
  {
    label: "Graduate / Professional (2025-26 only)",
    codes: ["g6", "g7"],
  },
  {
    label: "Graduate / Professional (2026-27 only)",
    codes: ["g8", "g9", "g10", "g11", "g12", "g13"],
  },
];

/**
 * Which Grade Levels are valid for which Award Year, per COD Edit 208.
 *
 * - 2025-26: undergraduate codes 0-5 plus the legacy graduate/professional
 *   codes 6 and 7. Codes 8-13 are invalid for 2025-26.
 * - 2026-27: undergraduate codes 0-5 plus the new graduate/professional
 *   codes 8-13 introduced by OBBB. Codes 6 and 7 are retired for 2026-27.
 */
export const GRADE_LEVELS_BY_AWARD_YEAR: Record<"2025-26" | "2026-27", GradeLevel[]> = {
  "2025-26": ["g0", "g1", "g2", "g3", "g4", "g5", "g6", "g7"],
  "2026-27": ["g0", "g1", "g2", "g3", "g4", "g5", "g8", "g9", "g10", "g11", "g12", "g13"],
};

/** Returns the Grade Levels available for a given Award Year. */
export function gradeLevelsForAwardYear(ay: "2025-26" | "2026-27"): GradeLevel[] {
  return GRADE_LEVELS_BY_AWARD_YEAR[ay] ?? (Object.keys(LIMITS) as GradeLevel[]);
}

/** Filters GRADE_GROUPS down to only the codes valid for the given Award Year. */
export function gradeGroupsForAwardYear(
  ay: "2025-26" | "2026-27",
): { label: string; codes: GradeLevel[] }[] {
  const allowed = new Set<GradeLevel>(gradeLevelsForAwardYear(ay));
  return GRADE_GROUPS.map((g) => ({
    label: g.label,
    codes: g.codes.filter((c) => allowed.has(c)),
  })).filter((g) => g.codes.length > 0);
}

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
  // Defensive: map legacy/unknown grade keys to a sane current code so a
  // stale saved scenario can't blank-screen the app.
  const legacyMap: Record<string, GradeLevel> = {
    g0_1: "g1",
    g3plus: "g3",
    graduate: "g8",
    professional: "g10",
    g10_teacher_cert: "g5",
    g11_prep_undergrad: "g1",
    g12_prep_teacher: "g5",
    g13_prep_grad: "g8",
  };
  const safeGrade: GradeLevel = (LIMITS as Record<string, unknown>)[grade]
    ? grade
    : (legacyMap[grade as string] ?? "g1");
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
  return (
    grade === "g6" ||
    grade === "g7" ||
    grade === "g8" ||
    grade === "g9" ||
    grade === "g10" ||
    grade === "g11" ||
    grade === "g12" ||
    grade === "g13"
  );
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
