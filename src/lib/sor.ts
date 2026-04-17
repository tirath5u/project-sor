/**
 * Schedule of Reductions (SOR) — Calculation engine
 *
 * Implements the official Department of Education FIVE-STEP process from
 * the "Schedule of Reductions Scenarios for Direct Loans" guidance:
 *
 *   STEP 1 — Initial Maximum Annual Loan Limit (statutory + need cap, by loan type)
 *   STEP 2 — AY enrollment % = Σ enrolledAY ÷ AY-FT credits.
 *            Loan annual limit = initialMax × min(ayPct, 100%).
 *   STEP 3 — Per-term SHARE of the annual loan limit
 *            (annualLimit ÷ N terms; whole-dollar; last term absorbs rounding).
 *   STEP 4 — Per-term ENROLLMENT % = term enrolled ÷ term FT (can exceed 100%).
 *   STEP 5 — Disbursement = termShare × min(termPct, 100%).
 *            • Overflow (termPct > 100%) re-balances forward to subsequent terms
 *              that ran below 100%, capped at each term's own share ceiling.
 *            • Terms below half-time → $0 (eligibility gate).
 *
 * Disbursement (recalculation) mode:
 *   When a term is marked "Disbursed", its actualCredits replaces the planned
 *   enrollment for the AY-pct calculation, the dollar paid is locked in, and
 *   the engine recomputes the remaining-term plan from there. Over/under-awards
 *   are applied as adjustments to the next undisbursed term (clawback or
 *   balloon). Mirrors ED Scenarios 1, 2, 5, 9.1, 10.1.
 */

import {
  lookupLimits,
  isGradOrProf,
  type GradeLevel,
  type Dependency,
} from "./loanLimits";

export type CalType = 1 | 2 | 3 | 4;
export type ProgramLevel = "undergraduate" | "graduate";
export type SummerPosition = "none" | "trailer" | "header";
export type AYType = "SAY" | "BBAY1" | "BBAY2";
export type ViewMode = "plan" | "disbursement";

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
  ftCredits: number;
  enrolledCredits: number;
  /** Disbursement mode: true once funds released this term. Locks paidSub/Unsub. */
  disbursed: boolean;
  /** Disbursement mode: actual credits enrolled at the time of this disbursement.
   * Replaces enrolledCredits in AY-pct math for past terms. */
  actualCredits: number;
  paidSub: number;
  paidUnsub: number;
  refundSub: number;
  refundUnsub: number;
  coaCapSub: number;
  coaCapUnsub: number;
}

export interface SORInputs {
  viewMode: ViewMode;
  calType: CalType;
  programLevel: ProgramLevel;
  summerPosition: SummerPosition;
  ayType: AYType;
  numStandardTerms: 2 | 3 | 4;
  includeSummer1: boolean;
  includeSummer2: boolean;
  includeIntersession1: boolean;
  includeIntersession2: boolean;
  /** AY full-time credit hours (Step 2 denominator). 0 → auto-sum of term FT. */
  ayFtCredits: number;
  /** Grade Level + Dependency drive Step 1 lookup. */
  gradeLevel: GradeLevel;
  dependency: Dependency;
  /** Dependent undergrad whose parents were denied PLUS — unlocks Independent Unsub cap. */
  parentPlusDenied: boolean;
  /** Override the lookup with manual statutory caps. */
  overrideLimits: boolean;
  subStatutory: number;
  subNeed: number;
  unsubStatutory: number;
  unsubNeed: number;
  /** Apply Sub→Unsub shift after Step 2 (combined cap behavior per OBBBA). */
  applySubUnsubShift: boolean;
  /** Per the 4/15 VFG: when Need < statutory, reduce Need to the SOR cap FIRST,
   *  then re-apply SOR % to that reduced Need. ("Double-reduction".) */
  applyDoubleReduction: boolean;
  /** Count LTHT (below-half-time) credits in the AY-pct numerator (term still pays $0). */
  countLthtInAyPct: boolean;
  terms: Record<TermKey, TermInput>;
}

export interface TermResult {
  key: TermKey;
  label: string;
  enabled: boolean;
  ftCredits: number;
  halfTime: number;
  enrolledCredits: number;
  effectiveCredits: number; // actual if disbursed-mode locked, else planned
  termPct: number; // Step 4 (raw, can exceed 1)
  termPctCapped: number; // min(termPct, 1)
  shareSub: number; // Step 3 share
  shareUnsub: number;
  eligible: boolean;
  status: "eligible" | "below_half_time" | "off";
  disbursed: boolean;
  paidSub: number;
  paidUnsub: number;
  refundSub: number;
  refundUnsub: number;
  netPaidSub: number;
  netPaidUnsub: number;
  calcSub: number; // raw post-Step-5 disbursement
  calcUnsub: number;
  finalSub: number; // after COA cap
  finalUnsub: number;
  coaCapSub: number;
  coaCapUnsub: number;
  /** Adjustment relative to a prior plan (disbursement mode). */
  adjustmentSub: number;
  adjustmentUnsub: number;
}

export interface RecalcEvent {
  trigger: TermKey;
  triggerLabel: string;
  beforeAyPct: number;
  afterAyPct: number;
  beforeAnnualSub: number;
  afterAnnualSub: number;
  beforeAnnualUnsub: number;
  afterAnnualUnsub: number;
  appliedToTerm: TermKey | null;
  adjustmentSub: number;
  adjustmentUnsub: number;
  note: string;
}

export interface SORResults {
  enrolledSumAll: number;
  ftSumAll: number;
  ayFtUsed: number;
  enrollmentFractionRaw: number;
  sorPctRounded: number; // = min(1, round(ayPct*100)/100)
  noReduction: boolean;
  subBaseline: number;
  unsubBaseline: number;
  /** Step 1 baseline before Need-cap reduction (for double-reduction display). */
  subStatBaseline: number;
  unsubStatBaseline: number;
  /** Reduced (adjusted) Need cap after first SOR pass — only differs when
   *  applyDoubleReduction is on AND Need < Statutory. */
  subNeedAdjusted: number;
  unsubNeedAdjusted: number;
  doubleReductionApplied: boolean;
  /** Additional Unsub headroom (PLUS-denial uplift), subject to SOR. */
  additionalUnsubBase: number;
  additionalUnsubReduced: number;
  reducedSubRaw: number;
  reducedUnsubRaw: number;
  reducedSub: number; // annual loan limit (Sub) post-shift
  reducedUnsub: number;
  shiftedToUnsub: number;
  paidSubTotal: number;
  paidUnsubTotal: number;
  refundSubTotal: number;
  refundUnsubTotal: number;
  netPaidSubTotal: number;
  netPaidUnsubTotal: number;
  remainingSub: number;
  remainingUnsub: number;
  eligibleTermsCount: number;
  remainingTermsCount: number;
  termResults: TermResult[];
  totalFinalSub: number;
  totalFinalUnsub: number;
  verifySub: number;
  verifyUnsub: number;
  warnings: string[];
  recalcHistory: RecalcEvent[];
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
    disbursed: false,
    actualCredits: 0,
    paidSub: 0,
    paidUnsub: 0,
    refundSub: 0,
    refundUnsub: 0,
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

  const lim = lookupLimits("g0_1", "dependent");

  return {
    viewMode: "plan",
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
    gradeLevel: "g0_1",
    dependency: "dependent",
    parentPlusDenied: false,
    overrideLimits: false,
    subStatutory: lim.sub,
    subNeed: lim.sub,
    unsubStatutory: lim.unsub,
    unsubNeed: lim.unsub,
    applySubUnsubShift: true,
    applyDoubleReduction: false,
    countLthtInAyPct: true,
    terms,
  };
}

const round = (n: number) => Math.round(n);

function activeKeys(inp: SORInputs): TermKey[] {
  const standard = (
    ["term1", "term2", "term3", "term4"] as TermKey[]
  ).slice(0, inp.numStandardTerms);
  const opts: TermKey[] = [];
  if (inp.includeSummer1) opts.push("summer1");
  if (inp.includeSummer2) opts.push("summer2");
  if (inp.includeIntersession1) opts.push("intersession1");
  if (inp.includeIntersession2) opts.push("intersession2");
  return [...standard, ...opts].filter((k) => inp.terms[k]?.enabled);
}

/** Split annual into N equal whole-dollar shares; last term takes the remainder. */
function equalShares(annual: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(annual / n);
  const out = new Array(n).fill(base);
  out[n - 1] = annual - base * (n - 1);
  return out;
}

/**
 * STEP 5 — distribute term share × term %, forwarding any > 100% overflow
 * to subsequent terms that have headroom (term % < 100%), capped at each
 * forward term's own share ceiling.
 */
function step5Distribute(
  shares: number[],
  termPctRaw: number[],
  eligible: boolean[],
): number[] {
  const n = shares.length;
  // Initial: each term takes share × min(pct, 100%)
  const out = shares.map((sh, i) => {
    if (!eligible[i]) return 0;
    const p = Math.min(1, Math.max(0, termPctRaw[i]));
    return round(sh * p);
  });
  // Overflow pool from terms running > 100%
  let pool = 0;
  shares.forEach((sh, i) => {
    if (!eligible[i]) return;
    if (termPctRaw[i] > 1) {
      pool += round(sh * (termPctRaw[i] - 1));
    }
  });
  // Forward-fill: give pool to remaining terms with headroom (in order).
  for (let i = 0; i < n && pool > 0; i++) {
    if (!eligible[i]) continue;
    const ceiling = shares[i];
    const headroom = Math.max(0, ceiling - out[i]);
    const give = Math.min(headroom, pool);
    out[i] += give;
    pool -= give;
  }
  return out;
}

/** Compute Steps 2-5 for a snapshot (used by both plan + disbursement-walker).
 *  When `countLthtInAyPct` is true, below-half-time terms still contribute their
 *  credits to the AY% numerator (per 4/15 VFG) but remain ineligible for any
 *  disbursement. */
function computeSnapshot(
  termsInOrder: TermInput[],
  effectiveCreditsBy: (t: TermInput) => number,
  ayFtUsed: number,
  initialSub: number,
  initialUnsub: number,
  countLthtInAyPct: boolean,
): {
  ayPctRaw: number;
  ayPctRounded: number;
  annualSub: number;
  annualUnsub: number;
  shareSub: number[];
  shareUnsub: number[];
  termPctRaw: number[];
  eligible: boolean[];
  termSub: number[];
  termUnsub: number[];
} {
  const eligible = termsInOrder.map((t) => {
    const half = t.ftCredits / 2;
    return t.enabled && half > 0 && effectiveCreditsBy(t) >= half;
  });
  // Numerator = eligible-term credits + (optional) LTHT credits from enabled
  // terms running below half-time (>0 credits). LTHT terms still pay $0.
  const enrolledSum = termsInOrder.reduce((s, t, i) => {
    const c = effectiveCreditsBy(t);
    if (eligible[i]) return s + c;
    if (countLthtInAyPct && t.enabled && c > 0) return s + c;
    return s;
  }, 0);
  const ayPctRaw = ayFtUsed > 0 ? enrolledSum / ayFtUsed : 0;
  const ayPctRounded = Math.min(1, Math.round(ayPctRaw * 100) / 100);
  const annualSub = round(initialSub * ayPctRounded);
  const annualUnsub = round(initialUnsub * ayPctRounded);

  const eligibleCount = eligible.filter(Boolean).length;
  const shareSubFlat = eligibleCount > 0 ? equalShares(annualSub, eligibleCount) : [];
  const shareUnsubFlat = eligibleCount > 0 ? equalShares(annualUnsub, eligibleCount) : [];
  const shareSub: number[] = [];
  const shareUnsub: number[] = [];
  let idx = 0;
  termsInOrder.forEach((_, i) => {
    if (eligible[i]) {
      shareSub.push(shareSubFlat[idx]);
      shareUnsub.push(shareUnsubFlat[idx]);
      idx++;
    } else {
      shareSub.push(0);
      shareUnsub.push(0);
    }
  });
  const termPctRaw = termsInOrder.map((t) =>
    t.ftCredits > 0 ? effectiveCreditsBy(t) / t.ftCredits : 0,
  );
  const termSub = step5Distribute(shareSub, termPctRaw, eligible);
  const termUnsub = step5Distribute(shareUnsub, termPctRaw, eligible);

  return {
    ayPctRaw,
    ayPctRounded,
    annualSub,
    annualUnsub,
    shareSub,
    shareUnsub,
    termPctRaw,
    eligible,
    termSub,
    termUnsub,
  };
}

export function calculateSOR(inp: SORInputs): SORResults {
  const warnings: string[] = [];
  if (inp.calType === 3 || inp.calType === 4) {
    warnings.push(
      `Academic Calendar ${inp.calType} (non-standard) — confirm SOR applicability with the FSA Handbook.`,
    );
  }
  if (isGradOrProf(inp.gradeLevel) && inp.programLevel === "undergraduate") {
    warnings.push(
      "Grade Level is graduate/professional but Program Level is Undergraduate — review.",
    );
  }

  const keys = activeKeys(inp);
  const ordered = keys.map((k) => inp.terms[k]);

  // STEP 1 — initial max (statutory baseline + Need cap, by loan type).
  // Adds:
  //  • PLUS-denial Additional Unsub: dependent undergrad whose parent was
  //    denied PLUS gets the Independent Unsub cap. The PLUS-denial uplift
  //    is itself subject to SOR (per 4/15 VFG).
  //  • Double-reduction (toggle): if Need < Statutory, the Need cap is first
  //    reduced by SOR%, then SOR% is applied to that reduced Need on Step 2.
  //    When Need ≥ Statutory, this collapses to the standard single reduction.
  const subBaseline = Math.min(inp.subStatutory, inp.subNeed);
  const unsubBaseline = Math.min(inp.unsubStatutory, inp.unsubNeed);
  // Additional Unsub headroom from PLUS denial — only meaningful for dep undergrad.
  const lookup = lookupLimits(inp.gradeLevel, inp.dependency, inp.parentPlusDenied);
  const additionalUnsubBase =
    !inp.overrideLimits && inp.parentPlusDenied && inp.dependency === "dependent"
      ? lookup.additionalUnsub
      : 0;
  // Effective Unsub cap used in math = Need-bounded baseline + Addl Unsub headroom.
  const unsubBaselineEff = unsubBaseline + additionalUnsubBase;

  const sumOfTermFT = ordered.reduce((s, t) => s + t.ftCredits, 0);
  const ayFtUsed = inp.ayFtCredits > 0 ? inp.ayFtCredits : sumOfTermFT;

  // Disbursement vs Plan mode
  const isDisbursementMode = inp.viewMode === "disbursement";
  const recalcHistory: RecalcEvent[] = [];

  // For PLAN mode: use enrolledCredits everywhere; ignore disbursed/actual.
  // For DISBURSEMENT mode: walk terms; disbursed terms use actualCredits and
  // their paid amount is locked. Each disbursement event recomputes the plan.

  // Final per-term outputs (Sub/Unsub) — start from the last-snapshot plan.
  const finalSubByKey: Record<string, number> = {};
  const finalUnsubByKey: Record<string, number> = {};
  const adjustmentSubByKey: Record<string, number> = {};
  const adjustmentUnsubByKey: Record<string, number> = {};
  ordered.forEach((t) => {
    finalSubByKey[t.key] = 0;
    finalUnsubByKey[t.key] = 0;
    adjustmentSubByKey[t.key] = 0;
    adjustmentUnsubByKey[t.key] = 0;
  });

  // Effective credits in the FINAL snapshot (used for display)
  const effectiveCreditsBy = (t: TermInput) =>
    isDisbursementMode && t.disbursed ? t.actualCredits : t.enrolledCredits;

  // Helper: run a snapshot, optionally re-running for double-reduction.
  const runSnapshot = (creditsFn: (t: TermInput) => number) => {
    const first = computeSnapshot(
      ordered,
      creditsFn,
      ayFtUsed,
      subBaseline,
      unsubBaselineEff,
      inp.countLthtInAyPct,
    );
    if (!inp.applyDoubleReduction) return { snap: first, reduced: false };
    // Reduce Need to (Need × pct), capped at Statutory, then re-apply pct.
    const pct = first.ayPctRounded;
    const subNeedReduced = Math.min(inp.subNeed, Math.round(inp.subNeed * pct));
    const unsubNeedReduced = Math.min(inp.unsubNeed, Math.round(inp.unsubNeed * pct));
    const subBaseline2 = Math.min(inp.subStatutory, subNeedReduced);
    const unsubBaseline2 =
      Math.min(inp.unsubStatutory, unsubNeedReduced) + additionalUnsubBase;
    if (subBaseline2 === subBaseline && unsubBaseline2 === unsubBaselineEff) {
      return { snap: first, reduced: false };
    }
    const second = computeSnapshot(
      ordered,
      creditsFn,
      ayFtUsed,
      subBaseline2,
      unsubBaseline2,
      inp.countLthtInAyPct,
    );
    return { snap: second, reduced: true };
  };

  if (!isDisbursementMode) {
    const { snap } = runSnapshot((t) => t.enrolledCredits);
    ordered.forEach((t, i) => {
      finalSubByKey[t.key] = snap.termSub[i];
      finalUnsubByKey[t.key] = snap.termUnsub[i];
    });

    return assemble({
      inp,
      ordered,
      ayFtUsed,
      subBaseline,
      unsubBaseline,
      additionalUnsubBase,
      finalSubByKey,
      finalUnsubByKey,
      adjustmentSubByKey,
      adjustmentUnsubByKey,
      effectiveCreditsBy,
      recalcHistory,
      warnings,
      finalSnap: snap,
    });
  }

  // ----- Disbursement mode walker -----
  let workingPlannedCredits: number[] = ordered.map((t) => t.enrolledCredits);
  const baseSnapResult = runSnapshot((t) => {
    const idx = ordered.findIndex((x) => x.key === t.key);
    return workingPlannedCredits[idx];
  });
  const baseSnap = baseSnapResult.snap;
  // Initialize finals from the base plan
  ordered.forEach((t, i) => {
    finalSubByKey[t.key] = baseSnap.termSub[i];
    finalUnsubByKey[t.key] = baseSnap.termUnsub[i];
  });

  let prevSnap = baseSnap;
  for (let i = 0; i < ordered.length; i++) {
    const t = ordered[i];
    if (!t.disbursed) continue;
    // Update working credits with actuals for this term
    workingPlannedCredits = workingPlannedCredits.map((c, j) =>
      j === i ? t.actualCredits : c,
    );
    const newSnapResult = runSnapshot((_t) => {
      const idx = ordered.findIndex((x) => x.key === _t.key);
      return workingPlannedCredits[idx];
    });
    const newSnap = newSnapResult.snap;
    // Lock the paid amount as this term's final
    const paidSubLocked = Math.max(0, (t.paidSub || 0) - (t.refundSub || 0));
    const paidUnsubLocked = Math.max(
      0,
      (t.paidUnsub || 0) - (t.refundUnsub || 0),
    );
    finalSubByKey[t.key] = paidSubLocked;
    finalUnsubByKey[t.key] = paidUnsubLocked;

    // Adjustment = newSnap term plan − paidLocked. Positive = under-paid, push
    // a balloon onto next term. Negative = over-paid, clawback.
    const targetSub = newSnap.termSub[i];
    const targetUnsub = newSnap.termUnsub[i];
    const adjSub = targetSub - paidSubLocked;
    const adjUnsub = targetUnsub - paidUnsubLocked;

    // Find next undisbursed term to apply adjustment
    let appliedTo: TermKey | null = null;
    for (let j = i + 1; j < ordered.length; j++) {
      if (!ordered[j].disbursed) {
        appliedTo = ordered[j].key;
        finalSubByKey[appliedTo] = newSnap.termSub[j] + adjSub;
        finalUnsubByKey[appliedTo] = newSnap.termUnsub[j] + adjUnsub;
        adjustmentSubByKey[appliedTo] += adjSub;
        adjustmentUnsubByKey[appliedTo] += adjUnsub;
        // Update other future undisbursed terms to the new plan
        for (let k = j + 1; k < ordered.length; k++) {
          if (!ordered[k].disbursed) {
            finalSubByKey[ordered[k].key] = newSnap.termSub[k];
            finalUnsubByKey[ordered[k].key] = newSnap.termUnsub[k];
          }
        }
        break;
      }
    }
    if (!appliedTo) {
      // No future term to absorb — adjustment is just left for verification panel
      // (likely indicates an over-award that needs to be refunded).
    }

    recalcHistory.push({
      trigger: t.key,
      triggerLabel: t.label,
      beforeAyPct: prevSnap.ayPctRounded,
      afterAyPct: newSnap.ayPctRounded,
      beforeAnnualSub: prevSnap.annualSub,
      afterAnnualSub: newSnap.annualSub,
      beforeAnnualUnsub: prevSnap.annualUnsub,
      afterAnnualUnsub: newSnap.annualUnsub,
      appliedToTerm: appliedTo,
      adjustmentSub: adjSub,
      adjustmentUnsub: adjUnsub,
      note:
        adjSub === 0 && adjUnsub === 0
          ? "Disbursement matched the recalculated plan — no adjustment."
          : appliedTo
          ? `Net adjustment of ${fmtCurrency(adjSub)} Sub / ${fmtCurrency(
              adjUnsub,
            )} Unsub applied to ${TERM_LABELS[appliedTo]}.`
          : `Adjustment of ${fmtCurrency(adjSub)} Sub / ${fmtCurrency(
              adjUnsub,
            )} Unsub — no remaining term to apply against.`,
    });
    prevSnap = newSnap;
  }

  return assemble({
    inp,
    ordered,
    ayFtUsed,
    subBaseline,
    unsubBaseline,
    finalSubByKey,
    finalUnsubByKey,
    adjustmentSubByKey,
    adjustmentUnsubByKey,
    effectiveCreditsBy,
    recalcHistory,
    warnings,
    finalSnap: prevSnap,
  });
}

function assemble(args: {
  inp: SORInputs;
  ordered: TermInput[];
  ayFtUsed: number;
  subBaseline: number;
  unsubBaseline: number;
  finalSubByKey: Record<string, number>;
  finalUnsubByKey: Record<string, number>;
  adjustmentSubByKey: Record<string, number>;
  adjustmentUnsubByKey: Record<string, number>;
  effectiveCreditsBy: (t: TermInput) => number;
  recalcHistory: RecalcEvent[];
  warnings: string[];
  finalSnap: ReturnType<typeof computeSnapshot>;
}): SORResults {
  const {
    inp,
    ordered,
    ayFtUsed,
    subBaseline,
    unsubBaseline,
    finalSubByKey,
    finalUnsubByKey,
    adjustmentSubByKey,
    adjustmentUnsubByKey,
    effectiveCreditsBy,
    recalcHistory,
    warnings,
    finalSnap,
  } = args;

  // Apply Sub→Unsub shift on the FINAL annual limits (combined cap)
  const reducedSubRaw = round(subBaseline * finalSnap.ayPctRounded);
  const reducedUnsubRaw = round(unsubBaseline * finalSnap.ayPctRounded);
  let reducedSub = reducedSubRaw;
  let reducedUnsub = reducedUnsubRaw;
  let shiftedToUnsub = 0;
  if (inp.applySubUnsubShift) {
    const subStatCeiling = round(inp.subStatutory * finalSnap.ayPctRounded);
    const unsubStatCeiling = round(inp.unsubStatutory * finalSnap.ayPctRounded);
    const subUnused = Math.max(0, subStatCeiling - reducedSubRaw);
    const unsubHeadroom = Math.max(0, unsubStatCeiling - reducedUnsubRaw);
    shiftedToUnsub = Math.min(subUnused, unsubHeadroom);
    reducedUnsub = reducedUnsubRaw + shiftedToUnsub;
  }

  const enrolledSum = ordered.reduce((s, t, i) => {
    return s + (finalSnap.eligible[i] ? effectiveCreditsBy(t) : 0);
  }, 0);

  const termResults: TermResult[] = ordered.map((t, i) => {
    const eff = effectiveCreditsBy(t);
    const half = t.ftCredits / 2;
    const eligible = finalSnap.eligible[i];
    const calcSub = finalSnap.termSub[i];
    const calcUnsub = finalSnap.termUnsub[i];
    const finalSub = finalSubByKey[t.key];
    const finalUnsub = finalUnsubByKey[t.key];
    const cappedSub = t.coaCapSub > 0 ? Math.min(finalSub, t.coaCapSub) : finalSub;
    const cappedUnsub = t.coaCapUnsub > 0 ? Math.min(finalUnsub, t.coaCapUnsub) : finalUnsub;
    const netPaidSub = Math.max(0, (t.paidSub || 0) - (t.refundSub || 0));
    const netPaidUnsub = Math.max(0, (t.paidUnsub || 0) - (t.refundUnsub || 0));
    const termPct = t.ftCredits > 0 ? eff / t.ftCredits : 0;
    return {
      key: t.key,
      label: t.label,
      enabled: t.enabled,
      ftCredits: t.ftCredits,
      halfTime: half,
      enrolledCredits: t.enrolledCredits,
      effectiveCredits: eff,
      termPct,
      termPctCapped: Math.min(1, termPct),
      shareSub: finalSnap.shareSub[i],
      shareUnsub: finalSnap.shareUnsub[i],
      eligible,
      status: !t.enabled ? "off" : eligible ? "eligible" : "below_half_time",
      disbursed: t.disbursed,
      paidSub: t.paidSub,
      paidUnsub: t.paidUnsub,
      refundSub: t.refundSub,
      refundUnsub: t.refundUnsub,
      netPaidSub,
      netPaidUnsub,
      calcSub,
      calcUnsub,
      finalSub: cappedSub,
      finalUnsub: cappedUnsub,
      coaCapSub: t.coaCapSub,
      coaCapUnsub: t.coaCapUnsub,
      adjustmentSub: adjustmentSubByKey[t.key],
      adjustmentUnsub: adjustmentUnsubByKey[t.key],
    };
  });

  const paidSubTotal = ordered.reduce((s, t) => s + (t.paidSub || 0), 0);
  const paidUnsubTotal = ordered.reduce((s, t) => s + (t.paidUnsub || 0), 0);
  const refundSubTotal = ordered.reduce((s, t) => s + (t.refundSub || 0), 0);
  const refundUnsubTotal = ordered.reduce((s, t) => s + (t.refundUnsub || 0), 0);
  const netPaidSubTotal = Math.max(0, paidSubTotal - refundSubTotal);
  const netPaidUnsubTotal = Math.max(0, paidUnsubTotal - refundUnsubTotal);

  const totalFinalSub = termResults.reduce((s, t) => s + t.finalSub, 0);
  const totalFinalUnsub = termResults.reduce((s, t) => s + t.finalUnsub, 0);
  const remainingSub = Math.max(0, reducedSub - totalFinalSub);
  const remainingUnsub = Math.max(0, reducedUnsub - totalFinalUnsub);

  const eligibleTermsCount = finalSnap.eligible.filter(Boolean).length;
  const remainingTermsCount = ordered.filter(
    (t, i) => finalSnap.eligible[i] && !t.disbursed,
  ).length;

  return {
    enrolledSumAll: enrolledSum,
    ftSumAll: ayFtUsed,
    ayFtUsed,
    enrollmentFractionRaw: finalSnap.ayPctRaw,
    sorPctRounded: finalSnap.ayPctRounded,
    noReduction: finalSnap.ayPctRounded >= 1,
    subBaseline,
    unsubBaseline,
    reducedSubRaw,
    reducedUnsubRaw,
    reducedSub,
    reducedUnsub,
    shiftedToUnsub,
    paidSubTotal,
    paidUnsubTotal,
    refundSubTotal,
    refundUnsubTotal,
    netPaidSubTotal,
    netPaidUnsubTotal,
    remainingSub,
    remainingUnsub,
    eligibleTermsCount,
    remainingTermsCount,
    termResults,
    totalFinalSub,
    totalFinalUnsub,
    verifySub: reducedSub - totalFinalSub,
    verifyUnsub: reducedUnsub - totalFinalUnsub,
    warnings: Array.from(new Set(warnings)),
    recalcHistory,
  };
}

export const fmtCurrency = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    signDisplay: n < 0 ? "always" : "auto",
  }).format(n);

export const fmtPct = (n: number) => `${Math.round(n * 100)}%`;

export const fmtPctPrecise = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(n);

export type { GradeLevel, Dependency } from "./loanLimits";
