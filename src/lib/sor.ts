/**
 * Schedule of Reductions (SOR) — Calculation engine (v18 master parity).
 *
 * Implements the Department of Education FIVE-STEP process plus Sections G/H
 * of the v18 master spreadsheet:
 *
 *   STEP 1 — Initial Maximum Annual Loan Limit (statutory + need cap, by loan type).
 *            v18 takes a single Annual Financial Need and splits it: Sub gets
 *            the lesser of need and the Sub statutory cap; Unsub gets the
 *            remaining need up to the Unsub statutory cap. Override toggle
 *            keeps Sub/Unsub need editable independently for QA.
 *   STEP 2 — AY enrollment % = Σ enrolledAY ÷ AY-FT credits.
 *            Loan annual limit = initialMax × min(ayPct, 100%).
 *   STEP 3 — Per-term SHARE of the annual loan limit. Two models (v18 § G):
 *              · "equal"        → annual ÷ N eligible terms
 *              · "proportional" → annual × (term FT credits ÷ Σ term FT credits)
 *            Whole-dollar; last term absorbs the rounding remainder.
 *   STEP 4 — Per-term ENROLLMENT % = term enrolled ÷ term FT (can exceed 100%).
 *   STEP 5 — Disbursement = termShare × min(termPct, 100%). Plus v18 § H
 *            balance-forward: any unspent share (term % < 100%, ineligible
 *            term, or already-paid term that drew less than its share) flows
 *            forward to subsequent eligible terms — capped at each forward
 *            term's own ceiling.
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
export type DistributionModel = "equal" | "proportional";

export type TermKey =
  | "term1"
  | "term2"
  | "term3"
  | "term4"
  | "summer1"
  | "summer2"
  | "winter1"
  | "winter2";

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
  includeWinter1: boolean;
  includeWinter2: boolean;
  /** AY full-time credit hours (Step 2 denominator). 0 → auto-sum of term FT. */
  ayFtCredits: number;
  /** Grade Level + Dependency drive Step 1 lookup. */
  gradeLevel: GradeLevel;
  dependency: Dependency;
  /** Dependent undergrad whose parents were denied PLUS — unlocks Independent Unsub cap. */
  parentPlusDenied: boolean;
  /** Override the lookup with manual statutory caps. */
  overrideLimits: boolean;
  /** Single-input v18 model: total annual financial need; engine splits Sub/Unsub. */
  annualNeed: number;
  subStatutory: number;
  unsubStatutory: number;
  /** v18 § G — per-term share model. */
  distributionModel: DistributionModel;
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
  /** Derived Sub need (= min(annualNeed, subStatutory)). */
  subNeed: number;
  /** Derived Unsub need (= min(annualNeed − subNeed, unsubStatutory)). */
  unsubNeed: number;
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
  "winter1",
  "term2",
  "winter2",
  "term3",
  "term4",
  "summer1",
  "summer2",
];

export const TERM_LABELS: Record<TermKey, string> = {
  term1: "Fall",
  term2: "Spring",
  term3: "Term 3",
  term4: "Term 4",
  summer1: "Summer 1",
  summer2: "Summer 2",
  winter1: "Winter 1",
  winter2: "Winter 2",
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

  const lim = lookupLimits("g1", "dependent");

  return {
    viewMode: "plan",
    calType: 1,
    programLevel: "undergraduate",
    summerPosition: "none",
    ayType: "SAY",
    numStandardTerms: 2,
    includeSummer1: false,
    includeSummer2: false,
    includeWinter1: false,
    includeWinter2: false,
    ayFtCredits: 24,
    gradeLevel: "g1",
    dependency: "dependent",
    parentPlusDenied: false,
    overrideLimits: false,
    annualNeed: lim.sub + lim.unsub,
    subStatutory: lim.sub,
    unsubStatutory: lim.unsub,
    distributionModel: "equal",
    applySubUnsubShift: true,
    applyDoubleReduction: false,
    countLthtInAyPct: true,
    terms,
  };
}

const round = (n: number) => Math.round(n);

function activeKeys(inp: SORInputs): TermKey[] {
  // Standard terms = first N of [term1..term4] in standard order, but we
  // interleave winter terms in TERM_ORDER for display. activeKeys returns
  // them in display order so the matrix matches v18's column layout.
  const standardSet = new Set<TermKey>(
    (["term1", "term2", "term3", "term4"] as TermKey[]).slice(0, inp.numStandardTerms),
  );
  const optional: Record<TermKey, boolean> = {
    summer1: inp.includeSummer1,
    summer2: inp.includeSummer2,
    winter1: inp.includeWinter1,
    winter2: inp.includeWinter2,
    term1: false,
    term2: false,
    term3: false,
    term4: false,
  };
  return TERM_ORDER.filter(
    (k) => (standardSet.has(k) || optional[k]) && inp.terms[k]?.enabled,
  );
}

/** Split annual into N equal whole-dollar shares; last term takes the remainder. */
function equalShares(annual: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(annual / n);
  const out = new Array(n).fill(base);
  out[n - 1] = annual - base * (n - 1);
  return out;
}

/** Proportional shares weighted by term FT credit hours; last term absorbs remainder. */
function proportionalShares(annual: number, weights: number[]): number[] {
  const total = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || weights.length === 0) return weights.map(() => 0);
  const out = weights.map((w) => Math.floor((annual * w) / total));
  const used = out.reduce((s, v) => s + v, 0);
  if (out.length > 0) out[out.length - 1] += annual - used;
  return out;
}

/**
 * STEP 5 — distribute term share × min(term %, 100%), then run a
 * v18 § H balance-forward pass: ANY unspent dollars (a term that drew
 * below its share, an ineligible term whose share lapsed, or an
 * already-paid term whose lock is below its share) flow forward to the
 * next eligible terms with headroom.
 */
function step5Distribute(
  shares: number[],
  termPctRaw: number[],
  eligible: boolean[],
  /** Per-term hard ceiling. Defaults to share. Used to lock disbursed terms. */
  ceilings?: number[],
): number[] {
  const n = shares.length;
  const cap = (i: number) =>
    ceilings && Number.isFinite(ceilings[i]) ? ceilings[i] : shares[i];
  // Initial pass: each term takes share × min(pct, 100%), capped by its ceiling.
  const out = shares.map((sh, i) => {
    if (!eligible[i]) return 0;
    const p = Math.min(1, Math.max(0, termPctRaw[i]));
    return Math.min(cap(i), round(sh * p));
  });
  // Pool from > 100% overload AND any lapsed share (ineligible / under-cap).
  let pool = 0;
  shares.forEach((sh, i) => {
    if (!eligible[i]) {
      pool += sh; // share lapses entirely → forward
      return;
    }
    if (termPctRaw[i] > 1) {
      pool += round(sh * (termPctRaw[i] - 1));
    }
    // Under-share (term % < 100%): lapsed remainder also forwards.
    const consumed = out[i];
    const intendedAtCeiling = Math.min(cap(i), sh);
    if (consumed < intendedAtCeiling) {
      // already accounted for via term-pct < 1; no double count
    }
  });
  // Forward-fill: distribute pool to eligible terms (in order) up to their ceiling.
  for (let i = 0; i < n && pool > 0; i++) {
    if (!eligible[i]) continue;
    const ceiling = cap(i);
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
  distributionModel: DistributionModel,
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

  // Step 3 — per term share for eligible terms.
  const eligibleIdx = termsInOrder
    .map((_, i) => i)
    .filter((i) => eligible[i]);
  const eligibleCount = eligibleIdx.length;

  let shareSubFlat: number[] = [];
  let shareUnsubFlat: number[] = [];
  if (eligibleCount > 0) {
    if (distributionModel === "proportional") {
      const weights = eligibleIdx.map((i) => termsInOrder[i].ftCredits || 0);
      shareSubFlat = proportionalShares(annualSub, weights);
      shareUnsubFlat = proportionalShares(annualUnsub, weights);
    } else {
      shareSubFlat = equalShares(annualSub, eligibleCount);
      shareUnsubFlat = equalShares(annualUnsub, eligibleCount);
    }
  }
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

/** v18 splits one annualNeed into Sub + Unsub need.
 *  When overrideLimits is on, callers may have a separate path; here we just
 *  derive the canonical split. */
export function splitNeed(
  annualNeed: number,
  subStat: number,
  unsubStat: number,
): { subNeed: number; unsubNeed: number } {
  const subNeed = Math.max(0, Math.min(annualNeed, subStat));
  const unsubNeed = Math.max(0, Math.min(annualNeed - subNeed, unsubStat));
  return { subNeed, unsubNeed };
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

  // STEP 1 - derive Sub / Unsub baselines.
  // Sub is need-based: capped at min(annualNeed, subStatutory).
  // Unsub is NON-need-based (per FSA spec §5): the borrower can take the
  // full Unsub statutory cap regardless of remaining need, as long as the
  // combined Sub+Unsub does not exceed the combined annual limit.
  const { subNeed, unsubNeed } = splitNeed(
    inp.annualNeed,
    inp.subStatutory,
    inp.unsubStatutory,
  );
  const subBaseline = Math.min(inp.subStatutory, subNeed);
  // Unsub baseline = full Unsub statutory cap (decoupled from need).
  const unsubBaseline = Math.max(0, inp.unsubStatutory);
  const lookup = lookupLimits(inp.gradeLevel, inp.dependency, inp.parentPlusDenied);
  const additionalUnsubBase =
    !inp.overrideLimits && inp.parentPlusDenied && inp.dependency === "dependent"
      ? lookup.additionalUnsub
      : 0;
  const unsubBaselineEff = unsubBaseline + additionalUnsubBase;

  const sumOfTermFT = ordered.reduce((s, t) => s + t.ftCredits, 0);
  const ayFtUsed = inp.ayFtCredits > 0 ? inp.ayFtCredits : sumOfTermFT;

  const isDisbursementMode = inp.viewMode === "disbursement";
  const recalcHistory: RecalcEvent[] = [];

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

  const effectiveCreditsBy = (t: TermInput) =>
    isDisbursementMode && t.disbursed ? t.actualCredits : t.enrolledCredits;

  const runSnapshot = (creditsFn: (t: TermInput) => number) => {
    const first = computeSnapshot(
      ordered,
      creditsFn,
      ayFtUsed,
      subBaseline,
      unsubBaselineEff,
      inp.countLthtInAyPct,
      inp.distributionModel,
    );
    if (!inp.applyDoubleReduction) return { snap: first, reduced: false };
    const pct = first.ayPctRounded;
    const subNeedReduced = Math.min(subNeed, Math.round(subNeed * pct));
    const unsubNeedReduced = Math.min(unsubNeed, Math.round(unsubNeed * pct));
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
      inp.distributionModel,
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
      subNeed,
      unsubNeed,
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
  ordered.forEach((t, i) => {
    finalSubByKey[t.key] = baseSnap.termSub[i];
    finalUnsubByKey[t.key] = baseSnap.termUnsub[i];
  });

  let prevSnap = baseSnap;
  for (let i = 0; i < ordered.length; i++) {
    const t = ordered[i];
    if (!t.disbursed) continue;
    workingPlannedCredits = workingPlannedCredits.map((c, j) =>
      j === i ? t.actualCredits : c,
    );
    const newSnapResult = runSnapshot((_t) => {
      const idx = ordered.findIndex((x) => x.key === _t.key);
      return workingPlannedCredits[idx];
    });
    const newSnap = newSnapResult.snap;
    const paidSubLocked = Math.max(0, (t.paidSub || 0) - (t.refundSub || 0));
    const paidUnsubLocked = Math.max(
      0,
      (t.paidUnsub || 0) - (t.refundUnsub || 0),
    );
    finalSubByKey[t.key] = paidSubLocked;
    finalUnsubByKey[t.key] = paidUnsubLocked;

    const targetSub = newSnap.termSub[i];
    const targetUnsub = newSnap.termUnsub[i];
    const adjSub = targetSub - paidSubLocked;
    const adjUnsub = targetUnsub - paidUnsubLocked;

    let appliedTo: TermKey | null = null;
    for (let j = i + 1; j < ordered.length; j++) {
      if (!ordered[j].disbursed) {
        appliedTo = ordered[j].key;
        finalSubByKey[appliedTo] = newSnap.termSub[j] + adjSub;
        finalUnsubByKey[appliedTo] = newSnap.termUnsub[j] + adjUnsub;
        adjustmentSubByKey[appliedTo] += adjSub;
        adjustmentUnsubByKey[appliedTo] += adjUnsub;
        for (let k = j + 1; k < ordered.length; k++) {
          if (!ordered[k].disbursed) {
            finalSubByKey[ordered[k].key] = newSnap.termSub[k];
            finalUnsubByKey[ordered[k].key] = newSnap.termUnsub[k];
          }
        }
        break;
      }
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
    subNeed,
    unsubNeed,
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
    finalSnap: prevSnap,
  });
}

function assemble(args: {
  inp: SORInputs;
  ordered: TermInput[];
  ayFtUsed: number;
  subNeed: number;
  unsubNeed: number;
  subBaseline: number;
  unsubBaseline: number;
  additionalUnsubBase: number;
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
    subNeed,
    unsubNeed,
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
    finalSnap,
  } = args;

  const pct = finalSnap.ayPctRounded;

  const subStatBaseline = inp.subStatutory;
  const unsubStatBaseline = inp.unsubStatutory;
  const subNeedAdjusted = inp.applyDoubleReduction
    ? Math.min(subNeed, Math.round(subNeed * pct))
    : subNeed;
  const unsubNeedAdjusted = inp.applyDoubleReduction
    ? Math.min(unsubNeed, Math.round(unsubNeed * pct))
    : unsubNeed;
  const doubleReductionApplied =
    inp.applyDoubleReduction &&
    (subNeedAdjusted !== subNeed || unsubNeedAdjusted !== unsubNeed);

  const reducedSubRaw = round(subBaseline * pct);
  const reducedUnsubRaw = round((unsubBaseline + additionalUnsubBase) * pct);
  const additionalUnsubReduced = round(additionalUnsubBase * pct);
  let reducedSub = reducedSubRaw;
  let reducedUnsub = reducedUnsubRaw;
  let shiftedToUnsub = 0;
  if (inp.applySubUnsubShift) {
    const subStatCeiling = round(inp.subStatutory * pct);
    const unsubStatCeiling = round((inp.unsubStatutory + additionalUnsubBase) * pct);
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
    sorPctRounded: pct,
    noReduction: pct >= 1,
    subNeed,
    unsubNeed,
    subBaseline,
    unsubBaseline,
    subStatBaseline,
    unsubStatBaseline,
    subNeedAdjusted,
    unsubNeedAdjusted,
    doubleReductionApplied,
    additionalUnsubBase,
    additionalUnsubReduced,
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
