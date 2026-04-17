/**
 * Schedule of Reductions (SOR) — Calculation engine
 *
 * Mirrors the logic of the v8 SOR spreadsheet. All math runs in pure TS so the
 * UI can remain a thin presentation layer.
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
  ftCredits: number; // full-time credit threshold
  enrolledCredits: number;
  paidSub: number;
  paidUnsub: number;
  coaCapSub: number; // per-term Max Allowed (Sub)
  coaCapUnsub: number; // per-term Max Allowed (Unsub)
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
  calcSub: number;
  calcUnsub: number;
  finalSub: number;
  finalUnsub: number;
  coaCapSub: number;
  coaCapUnsub: number;
}

export interface SORResults {
  enrolledSum: number;
  ftSum: number;
  enrollmentFraction: number;
  sorPct: number;
  subBaseline: number;
  unsubBaseline: number;
  reducedSub: number;
  reducedUnsub: number;
  paidSubTotal: number;
  paidUnsubTotal: number;
  remainingSub: number;
  remainingUnsub: number;
  eligibleTermsCount: number;
  termResults: TermResult[];
  totalFinalSub: number;
  totalFinalUnsub: number;
  verifySub: number; // reducedSub - sum(finalSub + paidSub)  → 0 = balanced
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

export function defaultTerm(key: TermKey, isSummer = false): TermInput {
  return {
    key,
    label: TERM_LABELS[key],
    enabled: false,
    ftCredits: isSummer ? 12 : 12,
    enrolledCredits: 0,
    paidSub: 0,
    paidUnsub: 0,
    coaCapSub: 0,
    coaCapUnsub: 0,
  };
}

export function defaultInputs(): SORInputs {
  const terms = {} as Record<TermKey, TermInput>;
  TERM_ORDER.forEach((k) => {
    terms[k] = defaultTerm(k, k.startsWith("summer") || k.startsWith("intersession"));
  });
  // SAY / 2 terms by default, both standard terms enabled
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
    subStatutory: 5500,
    subNeed: 5500,
    unsubStatutory: 7000,
    unsubNeed: 7000,
    distribution: "equal",
    terms,
  };
}

export function exampleInputs(): SORInputs {
  const i = defaultInputs();
  i.numStandardTerms = 3;
  i.terms.term3.enabled = true;
  i.terms.term3.ftCredits = 12;
  i.terms.term1.enrolledCredits = 12;
  i.terms.term2.enrolledCredits = 9;
  i.terms.term3.enrolledCredits = 9;
  i.terms.term1.coaCapSub = 3000;
  i.terms.term2.coaCapSub = 3000;
  i.terms.term3.coaCapSub = 3000;
  i.terms.term1.coaCapUnsub = 3500;
  i.terms.term2.coaCapUnsub = 3500;
  i.terms.term3.coaCapUnsub = 3500;
  return i;
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

export function calculateSOR(inp: SORInputs): SORResults {
  const warnings: string[] = [];
  if (inp.calType === 3 || inp.calType === 4) {
    warnings.push(
      `Cal Type ${inp.calType} (clock-hour / non-standard) — verify FSA handbook rules manually.`,
    );
  }
  if (inp.ayType === "BBAY1" || inp.ayType === "BBAY2") {
    warnings.push(`${inp.ayType} selected — confirm AY boundaries align with the loan period.`);
  }

  const keys = activeKeys(inp);
  const termsActive = keys.map((k) => inp.terms[k]);

  // Half-time + eligibility
  const enrichedActive = termsActive.map((t) => {
    const halfTime = t.ftCredits / 2;
    const eligible = t.enabled && t.enrolledCredits >= halfTime && halfTime > 0;
    if (
      inp.programLevel === "undergraduate" &&
      (t.key.startsWith("summer") || t.key.startsWith("intersession")) &&
      t.ftCredits !== 12 &&
      t.enabled
    ) {
      warnings.push(`${t.label}: UG full-time is typically 12 credits.`);
    }
    return { ...t, halfTime, eligible };
  });

  const eligibleTerms = enrichedActive.filter((t) => t.eligible);
  const enrolledSum = eligibleTerms.reduce((s, t) => s + t.enrolledCredits, 0);
  const ftSum = eligibleTerms.reduce((s, t) => s + t.ftCredits, 0);
  const enrollmentFraction = ftSum > 0 ? enrolledSum / ftSum : 0;
  const sorPct = Math.min(1, enrollmentFraction);

  const subBaseline = Math.min(inp.subStatutory, inp.subNeed);
  const unsubBaseline = Math.min(inp.unsubStatutory, inp.unsubNeed);
  const reducedSub = round(subBaseline * sorPct);
  const reducedUnsub = round(unsubBaseline * sorPct);

  const paidSubTotal = enrichedActive.reduce((s, t) => s + (t.paidSub || 0), 0);
  const paidUnsubTotal = enrichedActive.reduce((s, t) => s + (t.paidUnsub || 0), 0);
  const remainingSub = Math.max(0, reducedSub - paidSubTotal);
  const remainingUnsub = Math.max(0, reducedUnsub - paidUnsubTotal);

  // Distribution: split remaining capacity across eligible terms with no prior payment.
  // Remainder applied to LAST eligible term (matches v8 1166/1166/1168 fix).
  const distributableTerms = eligibleTerms.filter(
    (t) => (t.paidSub || 0) === 0 && (t.paidUnsub || 0) === 0,
  );
  const distCount = distributableTerms.length;

  const calcMap: Record<string, { sub: number; unsub: number }> = {};
  enrichedActive.forEach((t) => (calcMap[t.key] = { sub: 0, unsub: 0 }));

  if (distCount > 0) {
    if (inp.distribution === "equal") {
      const baseSub = Math.floor(remainingSub / distCount);
      const baseUnsub = Math.floor(remainingUnsub / distCount);
      const remSub = remainingSub - baseSub * distCount;
      const remUnsub = remainingUnsub - baseUnsub * distCount;
      distributableTerms.forEach((t, idx) => {
        const isLast = idx === distCount - 1;
        calcMap[t.key].sub = baseSub + (isLast ? remSub : 0);
        calcMap[t.key].unsub = baseUnsub + (isLast ? remUnsub : 0);
      });
    } else {
      // Proportional to enrolled credits among distributable terms
      const totalCred = distributableTerms.reduce((s, t) => s + t.enrolledCredits, 0) || 1;
      let allocSub = 0;
      let allocUnsub = 0;
      distributableTerms.forEach((t, idx) => {
        const isLast = idx === distCount - 1;
        if (isLast) {
          calcMap[t.key].sub = remainingSub - allocSub;
          calcMap[t.key].unsub = remainingUnsub - allocUnsub;
        } else {
          const share = t.enrolledCredits / totalCred;
          const s = round(remainingSub * share);
          const u = round(remainingUnsub * share);
          calcMap[t.key].sub = s;
          calcMap[t.key].unsub = u;
          allocSub += s;
          allocUnsub += u;
        }
      });
    }
  }

  const termResults: TermResult[] = enrichedActive.map((t) => {
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
    enrolledSum,
    ftSum,
    enrollmentFraction,
    sorPct,
    subBaseline,
    unsubBaseline,
    reducedSub,
    reducedUnsub,
    paidSubTotal,
    paidUnsubTotal,
    remainingSub,
    remainingUnsub,
    eligibleTermsCount: eligibleTerms.length,
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
  new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 2 }).format(n);
