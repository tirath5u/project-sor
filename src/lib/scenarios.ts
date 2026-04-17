/**
 * Pre-built scenarios — official FSA examples from the SOR Q&A deck (April 10, 2026)
 * plus the legacy "Schedule of Reductions Scenarios for Direct Loans" set.
 *
 * Each scenario is named, narrated, and produces a complete SORInputs config.
 */

import { defaultInputs, TERM_LABELS, type SORInputs, type TermKey } from "./sor";

export interface Scenario {
  id: string;
  group: "FSA Examples (Apr 2026)" | "Legacy DL Scenarios";
  title: string;
  summary: string;
  expected?: string; // expected outcome narrative
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
  // -------- FSA Examples (Apr 2026) --------
  {
    id: "fsa-1",
    group: "FSA Examples (Apr 2026)",
    title: "Example #1 — Two terms, LTFT",
    summary:
      "Sub $3,500 / Unsub $2,000 · Fall 6, Spring 9 (FT 12/12) · 24 AY FT credits.",
    expected:
      "SOR % = 15/24 = 63%. SOR limits: Sub $2,205 / Unsub $1,260. Proportional: Fall 6/15 = $882 Sub / $504 Unsub; Spring 9/15 = $1,323 Sub / $756 Unsub.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          subStatutory: 3500,
          subNeed: 3500,
          unsubStatutory: 2000,
          unsubNeed: 2000,
          distribution: "proportional",
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
        },
      ),
  },
  {
    id: "fsa-2",
    group: "FSA Examples (Apr 2026)",
    title: "Example #2 — Single-term (transfer)",
    summary:
      "Sub $3,500 · One term: 9 enrolled / 12 FT. Per-term formula at 685.203(m)(1)(i).",
    expected: "SOR % = 9/12 = 75%. SOR loan limit = $2,625 Sub.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 12,
          subStatutory: 3500,
          subNeed: 3500,
          unsubStatutory: 0,
          unsubNeed: 0,
          distribution: "equal",
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term2: { enabled: false, ftCredits: 12, enrolledCredits: 0 },
        },
      ),
  },
  {
    id: "fsa-3",
    group: "FSA Examples (Apr 2026)",
    title: "Example #3 — Three terms, proportional",
    summary:
      "Sub $2,000 · Fall 9, Spring 12, Summer 12 (FT 12/12/12) · 36 AY FT credits.",
    expected:
      "SOR % = 33/36 = 92%. SOR Sub = $1,840. Proportional: 9/33, 12/33, 12/33.",
    build: () =>
      mk(
        {
          numStandardTerms: 3,
          includeSummer1: true,
          ayFtCredits: 36,
          subStatutory: 2000,
          subNeed: 2000,
          unsubStatutory: 0,
          unsubNeed: 0,
          distribution: "proportional",
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
          term3: { enabled: false, ftCredits: 12, enrolledCredits: 0 },
          summer1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
        },
      ),
  },
  {
    id: "fsa-4",
    group: "FSA Examples (Apr 2026)",
    title: "Example #4 — Fall enrollment change (recalc)",
    summary:
      "Same as Ex#3 but Fall drops from 9 to 6 after disbursement. Already paid Fall: $502 Sub.",
    expected:
      "Revised SOR % = 30/36 = 83%. Revised Sub = $1,660. Remaining $1,158 split 12/24 + 12/24 → $579 Spring + $579 Summer.",
    build: () =>
      mk(
        {
          numStandardTerms: 3,
          includeSummer1: true,
          ayFtCredits: 36,
          subStatutory: 2000,
          subNeed: 2000,
          unsubStatutory: 0,
          unsubNeed: 0,
          distribution: "proportional",
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 6, paidSub: 502 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
          term3: { enabled: false, ftCredits: 12, enrolledCredits: 0 },
          summer1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
        },
      ),
  },
  {
    id: "fsa-5",
    group: "FSA Examples (Apr 2026)",
    title: "Example #5 — BBAY three terms, proportional",
    summary: "Sub $2,000 · Summer 9, Fall 12, Spring 12 (FT 12 each) · 36 AY FT.",
    expected: "SOR % = 33/36 = 92%. Sub = $1,840. Proportional: 9/33, 12/33, 12/33.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          includeSummer1: true,
          ayType: "BBAY1",
          summerPosition: "header",
          ayFtCredits: 36,
          subStatutory: 2000,
          subNeed: 2000,
          unsubStatutory: 0,
          unsubNeed: 0,
          distribution: "proportional",
        },
        {
          summer1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
        },
      ),
  },
  {
    id: "fsa-6",
    group: "FSA Examples (Apr 2026)",
    title: "Example #6 — BBAY two terms, equal",
    summary: "Sub $2,000 · Summer 9, Fall 12 (FT 12 each) · 24 AY FT.",
    expected: "SOR % = 21/24 = 88%. Sub = $1,760. Equal: $880 each.",
    build: () =>
      mk(
        {
          numStandardTerms: 1,
          includeSummer1: true,
          ayType: "BBAY1",
          summerPosition: "header",
          ayFtCredits: 24,
          subStatutory: 2000,
          subNeed: 2000,
          unsubStatutory: 0,
          unsubNeed: 0,
          distribution: "equal",
        },
        {
          summer1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
        },
      ),
  },

  // -------- Legacy DL Scenarios --------
  {
    id: "leg-2",
    group: "Legacy DL Scenarios",
    title: "Scenario 2 — 9 Fall / 15 Spring (UG)",
    summary:
      "First-year UG. Sub $3,500 / Unsub $2,000. 9 Fall, 15 Spring; 24 AY FT.",
    expected:
      "Reduce Fall (9/12 = 75%), Spring runs full because student is FT for the year.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          subStatutory: 3500,
          subNeed: 3500,
          unsubStatutory: 2000,
          unsubNeed: 2000,
          distribution: "proportional",
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 15 },
        },
      ),
  },
  {
    id: "leg-4",
    group: "Legacy DL Scenarios",
    title: "Scenario 4 — Spring drops below half-time",
    summary: "9 Fall, 3 Spring (FT 12/12, AY 24). Spring is < half-time.",
    expected: "Spring is INELIGIBLE (below half-time). Fall pays at 75%.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          ayFtCredits: 24,
          subStatutory: 3500,
          subNeed: 3500,
          unsubStatutory: 2000,
          unsubNeed: 2000,
          distribution: "proportional",
        },
        {
          term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
          term2: { enabled: true, ftCredits: 12, enrolledCredits: 3 },
        },
      ),
  },
  {
    id: "leg-9",
    group: "Legacy DL Scenarios",
    title: "Scenario 9 — Fall/Spring/Summer trailer",
    summary:
      "8 Fall + 8 Spring + 3 Summer; FT 8/8/8; AY FT 24. Summer is < half-time.",
    expected:
      "SOR ≈ 67% (Summer excluded). Fall + Spring receive equal/proportional shares; Summer = $0.",
    build: () =>
      mk(
        {
          numStandardTerms: 2,
          includeSummer1: true,
          summerPosition: "trailer",
          ayFtCredits: 24,
          subStatutory: 3500,
          subNeed: 3500,
          unsubStatutory: 2000,
          unsubNeed: 2000,
          distribution: "equal",
        },
        {
          term1: { enabled: true, ftCredits: 8, enrolledCredits: 8 },
          term2: { enabled: true, ftCredits: 8, enrolledCredits: 8 },
          summer1: { enabled: true, ftCredits: 8, enrolledCredits: 3 },
        },
      ),
  },
];
