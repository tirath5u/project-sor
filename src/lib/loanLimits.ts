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
  | "g8"
  | "g9"
  | "g10"
  | "g11"
  | "g12"
  | "g13";

// Backwards-compat aliases (used by older callers).
export type LegacyGradeLevel = "g0_1" | "g3plus" | "g6" | "g7" | "graduate" | "professional";

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
  g0: "0 - 1st-Year Undergrad",
  g1: "1 - 1st-Year Undergrad",
  g2: "2 - 2nd-Year Undergrad",
  g3: "3 - 3rd-Year Undergrad",
  g4: "4 - 4th-Year Undergrad",
  g5: "5 - 5th-Year Undergrad",
  g8: "8 - Graduate, Never Professional",
  g9: "9 - Graduate (Independent only)",
  g10: "10 - Professional (Independent only)",
  g11: "11 - Professional, Was Graduate",
  g12: "12 - Graduate Concurrent",
  g13: "13 - Professional Concurrent",
};

export const GRADE_GROUPS: { label: string; codes: GradeLevel[] }[] = [
  {
    label: "Undergraduate",
    codes: ["g0", "g1", "g2", "g3", "g4", "g5"],
  },
  {
    label: "Graduate / Professional",
    codes: ["g8", "g9", "g10", "g11", "g12", "g13"],
  },
];

/**
 * Which Grade Levels are valid for which Award Year.
 *
 * Per the V19 spec, the same numeric Anthology/COD Grade Level mapping
 * applies to BOTH Award Years. The Loan Limit Exception (grandfathered)
 * toggle - not the Award Year - drives which limit table is used.
 */
export const GRADE_LEVELS_BY_AWARD_YEAR: Record<"2025-26" | "2026-27", GradeLevel[]> = {
  "2025-26": ["g0", "g1", "g2", "g3", "g4", "g5", "g8", "g9", "g10", "g11", "g12", "g13"],
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
  // Defensive: map legacy/unknown grade keys to a sane default so a stale
  // saved scenario can't blank-screen the app.
  const safeGrade: GradeLevel = (LIMITS as Record<string, unknown>)[grade]
    ? grade
    : grade === ("g0_1" as string)
      ? "g1"
      : grade === ("g3plus" as string)
        ? "g3"
        : grade === ("g6" as string) || grade === ("g7" as string)
          ? "g5"
          : grade === ("graduate" as string)
            ? "g8"
            : grade === ("professional" as string)
              ? "g10"
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
  return (
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
