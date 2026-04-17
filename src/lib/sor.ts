/**
 * Schedule of Reductions (SOR) — Calculation engine
 *
 * Implements the official FSA SOR process per the April 10, 2026 guidance
 * (Working Families Tax Cuts Act / Pub. L. 119-21):
 *
 *   STEP 1 — Initial Maximum Annual Loan Limit
 *   STEP 2 — SOR % = (enrolled credits AY ÷ FT credits AY) × 100,
 *            rounded to nearest WHOLE percentage point. If ≥ 100 → no reduction.
 *   STEP 3 — Disbursement method:
 *             • Equal — annual ÷ number of terms (round to whole $; sum must equal annual)
 *             • Proportional — (term enrolled ÷ total enrolled) × annual (proportions NOT rounded;
 *               final dollar values rounded so they sum exactly)
 *
 * Reminders enforced:
 *  • Borrowers below half-time are ineligible.
 *  • Borrower may not receive more than the SOR annual loan limit, period.
 *  • Revised SOR after enrollment change: subtract amounts already disbursed; remaining
 *    is distributed across the remaining terms (equal or proportional).
 */

export type CalType = 1 | 2 | 3 | 4 | 5;
export type ProgramLevel = "undergraduate" | "graduate";
export type SummerPosition = "none" | "trailer" | "header";
export type AYType = "SAY" | "BBAY1" | "BBAY2";
export type DistributionModel = "equal" | "proportional";

export type TermKey =
  | "term1"
  | "term2"
  | "term3"
  | "term4"
  | "summer1"
  | "summer2"
  | "intersession1"
  | "intersession2";

export interface TermInput {
  key: TermKey;
  label: string;
  enabled: boolean;
  ftCredits: number; // full-time credit threshold for THIS term
  enrolledCredits: number;
  paidSub: number; // already disbursed to date
  paidUnsub: number;
  coaCapSub: number; // optional COA safety cap (0 = no cap)
  coaCapUnsub: number;
}

export interface SORInputs {
  calType: CalType;
  programLevel: ProgramLevel;
  summerPosition: SummerPosition;
  ayType: AYType;
  numStandardTerms: 2 | 3 | 4;
  includeSummer1: boolean;
  includeSummer2: boolean;
  includeIntersession1: boolean;
  includeIntersession2: boolean;
  /** AY full-time credit hours (denominator of Step 2). If 0 → auto-sum of term FT. */
  ayFtCredits: number;
  subStatutory: number;
  subNeed: number;
  unsubStatutory: number;
  unsubNeed: number;
  distribution: DistributionModel;
  terms: Record<TermKey, TermInput>;
}

export interface TermResult {
  key: TermKey;
  label: string;
  enabled: boolean;
  ftCredits: number;
  halfTime: number;
  enrolledCredits: number;
  eligible: boolean;
  status: "eligible" | "below_half_time" | "off";
  paidSub: number;
  paidUnsub: number;
  /** proportional share (decimal) used for proportional distribution, undefined if equal */
  proportion?: number;
  calcSub: number; // raw distribution per Step 3 (already rounded to $)
  calcUnsub: number;
  finalSub: number; // after COA safety cap
  finalUnsub: number;
  coaCapSub: number;
  coaCapUnsub: number;
}

export interface SORResults {
  enrolledSumAll: number; // across all enabled, half-time-or-above terms (Step 2 numerator)
  ftSumAll: number; // Step 2 denominator
  ayFtUsed: number;
  enrollmentFractionRaw: number; // pre-rounding
  sorPctRounded: number; // whole percentage point as decimal (e.g. 0.63)
  noReduction: boolean; // sorPctRounded ≥ 1
  subBaseline: number; // initial max sub
  unsubBaseline: number; // initial max unsub
  reducedSub: number; // SOR annual loan limit (Sub)
  reducedUnsub: number; // SOR annual loan limit (Unsub)
  paidSubTotal: number;
  paidUnsubTotal: number;
  remainingSub: number; // SOR limit − already disbursed
  remainingUnsub: number;
  eligibleTermsCount: number;
  remainingTermsCount: number; // terms with no prior disbursement (where remaining is split)
  termResults: TermResult[];
  totalFinalSub: number; // sum across terms (paid + new) of finalSub for verification
  totalFinalUnsub: number;
  verifySub: number; // reducedSub − totalFinalSub  → 0 = balanced
  verifyUnsub: number;
  warnings: string[];
}

export const TERM_ORDER: TermKey[] = [
  "term1",
  "term2",
  "term3",
  "term4",
  "summer1",
  "summer2",
  "intersession1",
  "intersession2",
];

export const TERM_LABELS: Record<TermKey, string> = {
  term1: "Term 1",
  term2: "Term 2",
  term3: "Term 3",
  term4: "Term 4",
  summer1: "Summer 1",
  summer2: "Summer 2",
  intersession1: "Intersession 1",
  intersession2: "Intersession 2",
};

export function defaultTerm(key: TermKey): TermInput {
  return {
    key,
    label: TERM_LABELS[key],
    enabled: false,
    ftCredits: 12,
    enrolledCredits: 0,
    paidSub: 0,
    paidUnsub: 0,
    coaCapSub: 0,
    coaCapUnsub: 0,
  };
}

export function defaultInputs(): SORInputs {
  const terms = {} as Record<TermKey, TermInput>;
  TERM_ORDER.forEach((k) => (terms[k] = defaultTerm(k)));
  terms.term1.enabled = true;
  terms.term1.ftCredits = 12;
  terms.term2.enabled = true;
  terms.term2.ftCredits = 12;

  return {
    calType: 1,
    programLevel: "undergraduate",
    summerPosition: "none",
    ayType: "SAY",
    numStandardTerms: 2,
    includeSummer1: false,
    includeSummer2: false,
    includeIntersession1: false,
    includeIntersession2: false,
    ayFtCredits: 24,
    subStatutory: 3500,
    subNeed: 3500,
    unsubStatutory: 2000,
    unsubNeed: 2000,
    distribution: "proportional",
    terms,
  };
}

const round = (n: number) => Math.round(n);

function activeKeys(inp: SORInputs): TermKey[] {
  const standard: TermKey[] = ["term1", "term2", "term3", "term4"].slice(
    0,
    inp.numStandardTerms,
  ) as TermKey[];
  const opts: TermKey[] = [];
  if (inp.includeSummer1) opts.push("summer1");
  if (inp.includeSummer2) opts.push("summer2");
  if (inp.includeIntersession1) opts.push("intersession1");
  if (inp.includeIntersession2) opts.push("intersession2");
  return [...standard, ...opts].filter((k) => inp.terms[k]?.enabled);
}

/**
 * Distribute a target amount across N "shares" (1 each = equal, custom = proportional)
 * such that each piece is rounded to the nearest dollar AND the pieces sum exactly to target.
 * Largest-remainder method.
 */
function distributeWithRemainder(target: number, shares: number[]): number[] {
  const n = shares.length;
  if (n === 0) return [];
  const total = shares.reduce((s, x) => s + x, 0);
  if (total <= 0 || target === 0) return shares.map(() => 0);

  const exact = shares.map((s) => (target * s) / total);
  const floors = exact.map((x) => Math.floor(x));
  let allocated = floors.reduce((s, x) => s + x, 0);
  let leftover = round(target) - allocated;

  // Distribute leftover (positive or negative) by largest fractional remainder
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => (leftover >= 0 ? b.frac - a.frac : a.frac - b.frac));

  const result = floors.slice();
  let idx = 0;
  while (leftover !== 0 && idx < order.length * 4) {
    const k = order[idx % order.length].i;
    if (leftover > 0) {
      result[k] += 1;
      leftover -= 1;
    } else {
      result[k] -= 1;
      leftover += 1;
    }
    idx += 1;
  }
  return result;
}

export function calculateSOR(inp: SORInputs): SORResults {
  const warnings: string[] = [];
  if (inp.calType === 3 || inp.calType === 4) {
    warnings.push(
      `Cal Type ${inp.calType} (non-standard) — confirm SOR applicability with FSA Handbook.`,
    );
  }
  if (inp.calType === 5) {
    warnings.push("Cal Type 5 (clock-hour) is out of scope for the SOR formula — verify manually.");
  }

  const keys = activeKeys(inp);
  const termsActive = keys.map((k) => inp.terms[k]);

  // Eligibility (at least half-time)
  const enriched = termsActive.map((t) => {
    const halfTime = t.ftCredits / 2;
    const eligible = t.enabled && halfTime > 0 && t.enrolledCredits >= halfTime;
    return { ...t, halfTime, eligible };
  });

  const eligibleTerms = enriched.filter((t) => t.eligible);

  // STEP 2 — SOR %
  const enrolledSumAll = eligibleTerms.reduce((s, t) => s + t.enrolledCredits, 0);
  const sumOfTermFT = eligibleTerms.reduce((s, t) => s + t.ftCredits, 0);
  const ayFtUsed = inp.ayFtCredits > 0 ? inp.ayFtCredits : sumOfTermFT;
  const ftSumAll = ayFtUsed;
  const enrollmentFractionRaw = ftSumAll > 0 ? enrolledSumAll / ftSumAll : 0;
  // Round to nearest WHOLE percentage point per FSA rule
  const sorPctRounded = Math.min(1, Math.round(enrollmentFractionRaw * 100) / 100);
  const noReduction = sorPctRounded >= 1;

  // STEP 1 — Initial maximum annual limit (lower of statutory/need)
  const subBaseline = Math.min(inp.subStatutory, inp.subNeed);
  const unsubBaseline = Math.min(inp.unsubStatutory, inp.unsubNeed);

  // SOR annual loan limit (round to whole $)
  const reducedSub = round(subBaseline * sorPctRounded);
  const reducedUnsub = round(unsubBaseline * sorPctRounded);

  // Already disbursed
  const paidSubTotal = enriched.reduce((s, t) => s + (t.paidSub || 0), 0);
  const paidUnsubTotal = enriched.reduce((s, t) => s + (t.paidUnsub || 0), 0);
  const remainingSub = Math.max(0, reducedSub - paidSubTotal);
  const remainingUnsub = Math.max(0, reducedUnsub - paidUnsubTotal);

  // STEP 3 — Distribute remaining to eligible terms WITHOUT prior payment
  const remainingTerms = eligibleTerms.filter(
    (t) => (t.paidSub || 0) === 0 && (t.paidUnsub || 0) === 0,
  );

  const calcMap: Record<string, { sub: number; unsub: number; proportion?: number }> = {};
  enriched.forEach((t) => (calcMap[t.key] = { sub: 0, unsub: 0 }));

  if (remainingTerms.length > 0) {
    const shares =
      inp.distribution === "equal"
        ? remainingTerms.map(() => 1)
        : remainingTerms.map((t) => t.enrolledCredits || 0);

    const subAlloc = distributeWithRemainder(remainingSub, shares);
    const unsubAlloc = distributeWithRemainder(remainingUnsub, shares);
    const totalShare = shares.reduce((s, x) => s + x, 0) || 1;
    remainingTerms.forEach((t, i) => {
      calcMap[t.key].sub = subAlloc[i];
      calcMap[t.key].unsub = unsubAlloc[i];
      calcMap[t.key].proportion = inp.distribution === "proportional" ? shares[i] / totalShare : undefined;
    });
  }

  const termResults: TermResult[] = enriched.map((t) => {
    const calcSub = calcMap[t.key]?.sub ?? 0;
    const calcUnsub = calcMap[t.key]?.unsub ?? 0;
    const capSub = t.coaCapSub > 0 ? Math.min(calcSub, t.coaCapSub) : calcSub;
    const capUnsub = t.coaCapUnsub > 0 ? Math.min(calcUnsub, t.coaCapUnsub) : calcUnsub;
    return {
      key: t.key,
      label: t.label,
      enabled: t.enabled,
      ftCredits: t.ftCredits,
      halfTime: t.halfTime,
      enrolledCredits: t.enrolledCredits,
      eligible: t.eligible,
      status: !t.enabled ? "off" : t.eligible ? "eligible" : "below_half_time",
      paidSub: t.paidSub,
      paidUnsub: t.paidUnsub,
      proportion: calcMap[t.key]?.proportion,
      calcSub,
      calcUnsub,
      finalSub: capSub,
      finalUnsub: capUnsub,
      coaCapSub: t.coaCapSub,
      coaCapUnsub: t.coaCapUnsub,
    };
  });

  const totalFinalSub = termResults.reduce((s, t) => s + t.finalSub + t.paidSub, 0);
  const totalFinalUnsub = termResults.reduce((s, t) => s + t.finalUnsub + t.paidUnsub, 0);
  const verifySub = reducedSub - totalFinalSub;
  const verifyUnsub = reducedUnsub - totalFinalUnsub;

  return {
    enrolledSumAll,
    ftSumAll,
    ayFtUsed,
    enrollmentFractionRaw,
    sorPctRounded,
    noReduction,
    subBaseline,
    unsubBaseline,
    reducedSub,
    reducedUnsub,
    paidSubTotal,
    paidUnsubTotal,
    remainingSub,
    remainingUnsub,
    eligibleTermsCount: eligibleTerms.length,
    remainingTermsCount: remainingTerms.length,
    termResults,
    totalFinalSub,
    totalFinalUnsub,
    verifySub,
    verifyUnsub,
    warnings: Array.from(new Set(warnings)),
  };
}

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export const fmtPct = (n: number) =>
  `${Math.round(n * 100)}%`;

export const fmtPctPrecise = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(n);
