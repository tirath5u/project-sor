/**
 * Pre-built scenarios — official ED "Schedule of Reductions Scenarios for
 * Direct Loans" set, plus the FSA Q&A April 2026 examples and three v18
 * master-spreadsheet regression checks.
 *
 * Each scenario produces a complete SORInputs config and includes the
 * expected outcome so QA can verify dollar-for-dollar.
 */

import { defaultInputs, TERM_LABELS, type SORInputs, type TermKey } from "./sor";

export interface Scenario {
  id: string;
  group:
    | "ED Scenarios (5-step)"
    | "FSA Examples (Apr 2026)"
    | "Disbursement-mode (recalc)"
    | "v18 Spreadsheet (regression)"
    | "Legacy DL Scenarios";
  title: string;
  summary: string;
  expected?: string;
  /** Optional per-term expected dollars for the regression badge in the matrix. */
  expectedTerms?: Partial<Record<TermKey, { sub?: number; unsub?: number }>>;
  build: () => SORInputs;
}

function mk(
  patch: Partial<SORInputs>,
  termPatches: Partial<Record<TermKey, Partial<SORInputs["terms"][TermKey]>>>,
): SORInputs {
  const inp = defaultInputs();
  Object.assign(inp, patch);
  Object.entries(termPatches).forEach(([k, p]) => {
    inp.terms[k as TermKey] = {
      ...inp.terms[k as TermKey],
      ...p,
      label: TERM_LABELS[k as TermKey],
    };
  });
  return inp;
}

export const SCENARIOS: Scenario[] = [
  // -------- ED Scenarios — 5-step model --------
  {
    id: "ed-1",
    group: "ED Scenarios (5-step)",
    title: "Scenario 1 — Fall LTFT, Spring overload (balloon)",
    summary:
      "Sub $3,500 · Fall 6 / Spring 18 (FT 12/12) · 24 AY FT. Spring overload pushes AY back to 100%.",
    expected:
      "Step 2 AY% = 24/24 = 100% → no SOR reduction. Per-term share $1,750 each. Step 4: Fall 50% → $875; Spring 150% → capped at $1,750 share (overflow forwards but no headroom). Result: Fall $875, Spring $2,625 (Spring absorbs $875 balloon).",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 3500,
          subStatutory: 3500,
          unsubStatutory: 0,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 18 },
        },
      ),
  },
  {
    id: "ed-2",
    group: "ED Scenarios (5-step)",
    title: "Scenario 2 — Three terms, one overload",
    summary: "Sub $2,000 · Fall 9 / Spring 12 / Summer 15 (FT 12/12/12) · 36 AY FT.",
    expected:
      "AY% = 36/36 = 100%. Annual $2,000. Per-term share ≈ $666/$667/$667. Term %s: 75%/100%/125%. Disbursements: $500/$667/$833.",
    build: () =>
      mk(
        {
          numStandardTerms: 3,
          includeSummer1: true,
          ayFtCredits: 36,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 2000,
          subStatutory: 2000,
          unsubStatutory: 0,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
          term3: { enabled: false, ftCredits: 12, enrolledCredits: 0 },
          summer1: { enabled: true, ftCredits: 12, enrolledCredits: 15 },
        },
      ),
  },
  {
    id: "ed-3",
    group: "ED Scenarios (5-step)",
    title: "Scenario 3 — Two-term LTFT (no overload)",
    summary: "Sub $3,500 · Fall 6 / Spring 9 · 24 AY FT.",
    expected:
      "AY% = 15/24 = 62.5% → 63%. Annual $2,205. Share $1,102/$1,103. Term %: 50%/75%. Disbursements: $551/$827.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 3500,
          subStatutory: 3500,
          unsubStatutory: 0,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
        },
      ),
  },
  {
    id: "ed-8",
    group: "ED Scenarios (5-step)",
    title: "Scenario 8 — Fall overload, Spring LTFT",
    summary:
      "Sub $3,500 · Fall 15 / Spring 6 · 24 AY FT. Fall pays maximum share, overflow forwards to Spring.",
    expected:
      "AY% = 21/24 = 87.5% → 88%. Annual $3,080. Share $1,540 each. Term %: 125%/50%. Fall capped at $1,540, Spring gets $770 + the $385 forwarded = $1,155.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 3500,
          subStatutory: 3500,
          unsubStatutory: 0,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 15 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
        },
      ),
  },

  // -------- v18 Spreadsheet regression scenarios --------
  {
    id: "v18-a",
    group: "v18 Spreadsheet (regression)",
    title: "v18-A — Two-term LTFT, full Sub+Unsub need",
    summary:
      "Grade 1 dep, Need $5,500 · Fall 6 / Spring 9 · 24 AY FT. Mirrors v18 default scenario.",
    expected:
      "AY% 63%. Annual Sub $2,205, Unsub $1,260. Per-term shares Sub $1,102/$1,103, Unsub $630/$630. Final Sub $551/$827, Unsub $315/$472.",
    expectedTerms: {
      term1: { sub: 551, unsub: 315 },
      term2: { sub: 827, unsub: 472 },
    },
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 5500,
          subStatutory: 3500,
          unsubStatutory: 2000,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
        },
      ),
  },
  {
    id: "v18-b",
    group: "v18 Spreadsheet (regression)",
    title: "v18-B — Independent G3 with Winter 1 + Summer",
    summary:
      "Indep g3 · Need $12,500 · Fall 12 / Winter1 6 / Spring 9 / Summer 6 · 30 AY FT.",
    expected:
      "Winter 1 enabled mid-year. Distribution shares the annual across 4 eligible terms.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          includeWinter1: true,
          includeSummer1: true,
          ayFtCredits: 30,
          gradeLevel: "g3",
          dependency: "independent",
          annualNeed: 12500,
          subStatutory: 5500,
          unsubStatutory: 7000,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
          winter1: { enabled: true, ftCredits: 6, enrolledCredits: 6 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          summer1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
        },
      ),
  },
  {
    id: "v18-c",
    group: "v18 Spreadsheet (regression)",
    title: "v18-C — Proportional distribution (uneven terms)",
    summary:
      "Indep g2 · Need $10,500 · Fall 12 (FT 12) / Spring 6 (FT 6) · 18 AY FT. Proportional model weighted by FT credits.",
    expected:
      "AY% 100%. Equal model would give 50/50; proportional gives 2/3 to Fall, 1/3 to Spring.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 18,
          gradeLevel: "g2",
          dependency: "independent",
          annualNeed: 10500,
          subStatutory: 4500,
          unsubStatutory: 6000,
          distributionModel: "proportional",
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
          term2: { enabled: true, ftCredits: 6, enrolledCredits: 6 },
        },
      ),
  },

  // -------- Disbursement-mode (recalc) --------
  {
    id: "ed-5",
    group: "Disbursement-mode (recalc)",
    title: "Scenario 5 — Spring drops after Fall paid (clawback)",
    summary:
      "Sub $3,500 · Fall 9 paid as planned ($1,313). In Spring student drops to 6.",
    expected:
      "After Spring recalc: AY% = 15/24 = 63% → annual $2,205. Spring's recalculated share gets reduced by Fall's over-award.",
    build: () =>
      mk(
        {
          viewMode: "disbursement",
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 3500,
          subStatutory: 3500,
          unsubStatutory: 0,
        },
        {
          term1: {
            enabled: true,
            ftCredits: 12,
            enrolledCredits: 9,
            disbursed: true,
            actualCredits: 9,
            paidSub: 1313,
          },
          term2: {
            enabled: true,
            ftCredits: 12,
            enrolledCredits: 6,
            disbursed: false,
            actualCredits: 6,
          },
        },
      ),
  },
  {
    id: "ed-9-1",
    group: "Disbursement-mode (recalc)",
    title: "Scenario 9.1 — Fall full-time, Spring withdraws to 0",
    summary:
      "Sub $3,500 · Fall paid at full-time ($1,750). Spring student withdraws to 0 credits.",
    expected:
      "Spring is ineligible (below half-time). Final Sub = Fall $1,750 only.",
    build: () =>
      mk(
        {
          viewMode: "disbursement",
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 3500,
          subStatutory: 3500,
          unsubStatutory: 0,
        },
        {
          term1: {
            enabled: true,
            ftCredits: 12,
            enrolledCredits: 12,
            disbursed: true,
            actualCredits: 12,
            paidSub: 1750,
          },
          term2: {
            enabled: true,
            ftCredits: 12,
            enrolledCredits: 12,
            disbursed: false,
            actualCredits: 0,
          },
        },
      ),
  },
  {
    id: "ed-10-1",
    group: "Disbursement-mode (recalc)",
    title: "Scenario 10.1 — Fall LTFT, Spring overloads (balloon)",
    summary:
      "Sub $3,500 · Fall 6 paid at $875. Spring planned 12 but enrolls 18.",
    expected:
      "After Spring disbursement triggers recalc: AY% returns to 100%. Spring final = Annual $3,500 − Fall $875 = $2,625.",
    build: () =>
      mk(
        {
          viewMode: "disbursement",
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 3500,
          subStatutory: 3500,
          unsubStatutory: 0,
        },
        {
          term1: {
            enabled: true,
            ftCredits: 12,
            enrolledCredits: 6,
            disbursed: true,
            actualCredits: 6,
            paidSub: 875,
          },
          term2: {
            enabled: true,
            ftCredits: 12,
            enrolledCredits: 12,
            disbursed: false,
            actualCredits: 18,
          },
        },
      ),
  },

  // -------- FSA Examples (Apr 2026) --------
  {
    id: "fsa-1",
    group: "FSA Examples (Apr 2026)",
    title: "FSA Ex#1 — Two-term LTFT (no overload)",
    summary: "Sub $3,500 / Unsub $2,000 · Fall 6 / Spring 9 · 24 AY FT.",
    expected:
      "AY% = 15/24 = 63%. Sub $2,205 / Unsub $1,260. Per-term share $1,102/$1,103 Sub.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 5500,
          subStatutory: 3500,
          unsubStatutory: 2000,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
        },
      ),
  },
  {
    id: "fsa-3",
    group: "FSA Examples (Apr 2026)",
    title: "FSA Ex#3 — Three-term proportional",
    summary: "Sub $2,000 · Fall 9 / Spring 12 / Summer 12 · 36 AY FT.",
    expected: "AY% = 33/36 = 92%. Annual $1,840.",
    build: () =>
      mk(
        {
          numStandardTerms: 3,
          includeSummer1: true,
          ayFtCredits: 36,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 2000,
          subStatutory: 2000,
          unsubStatutory: 0,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
          term3: { enabled: false, ftCredits: 12, enrolledCredits: 0 },
          summer1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
        },
      ),
  },

  // -------- Legacy DL Scenarios --------
  {
    id: "leg-4",
    group: "Legacy DL Scenarios",
    title: "Spring drops below half-time",
    summary: "9 Fall / 3 Spring (FT 12/12, AY 24).",
    expected: "Spring INELIGIBLE. Fall pays at its share × 75%.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          gradeLevel: "g1",
          dependency: "dependent",
          annualNeed: 5500,
          subStatutory: 3500,
          unsubStatutory: 2000,
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 3 },
        },
      ),
  },
];
