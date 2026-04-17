/**
 * OBBBA / Working Families Tax Cuts Act — Annual Loan Limits, AY 2026-27.
 *
 * Source: SOR Regulatory Deep Dive (uploaded 2026-04). Statutory caps per
 * Pub. L. 119-21, applied to Direct Subsidized + Direct Unsubsidized.
 *
 * For SOR purposes the engine uses:
 *   • subStatutory       — Direct Subsidized annual cap
 *   • unsubStatutory     — Direct Unsubsidized annual cap (combined cap minus Sub),
 *                          PLUS additional Unsub headroom available to independents
 *                          and dependents whose parents were denied PLUS.
 */

export type GradeLevel = "g0_1" | "g2" | "g3plus" | "graduate" | "professional";
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
 */
export const LIMITS: Record<GradeLevel, Record<Dependency, LoanLimitRow>> = {
  g0_1: {
    dependent: { sub: 3500, combined: 5500 },
    independent: { sub: 3500, combined: 9500 },
  },
  g2: {
    dependent: { sub: 4500, combined: 6500 },
    independent: { sub: 4500, combined: 10500 },
  },
  g3plus: {
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
};

export const GRADE_LABELS: Record<GradeLevel, string> = {
  g0_1: "Grade 0/1 — 1st-year undergraduate",
  g2: "Grade 2 — 2nd-year undergraduate",
  g3plus: "Grade 3+ — 3rd/4th-year undergraduate",
  graduate: "Graduate",
  professional: "Professional",
};

export function lookupLimits(
  grade: GradeLevel,
  dependency: Dependency,
  parentPlusDenied: boolean = false,
): {
  sub: number;
  unsub: number;
  /** Portion of unsub that comes from the PLUS-denial uplift (Independent − Dependent). */
  additionalUnsub: number;
} {
  const isGP = isGradOrProf(grade);
  // Grad/Prof are independent by definition; PLUS denial doesn't apply.
  const effectiveDep: Dependency =
    isGP || dependency === "independent" || parentPlusDenied ? "independent" : "dependent";
  const row = LIMITS[grade][effectiveDep];
  const baseRow = LIMITS[grade]["dependent"];
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
