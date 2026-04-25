/**
 * Canonical SOR parity fixtures — SINGLE SOURCE OF TRUTH.
 *
 * Each fixture pins a concrete input shape and the engine fields whose values
 * the maintainers commit to. The /api/public/v1/scenarios endpoint serializes
 * this file directly so the public scenario set never drifts from the test
 * harness.
 *
 * `sourceRefs` are public-source-register IDs (see docs/public-source-register.md).
 * Internal worksheet paths, client names, and private URLs are NEVER allowed
 * in this file — see the public-safety pre-launch checklist.
 */

import { defaultInputs, TERM_LABELS, type SORInputs, type TermKey } from "./sor";

export interface ParityFixture {
  id: string;
  description: string;
  /** Public-source-register IDs that justify the expected output. */
  sourceRefs: string[];
  input: SORInputs;
  /** Field-level assertions keyed by SORResults field. Subset is fine. */
  expected: {
    totalFinalSub?: number;
    totalFinalUnsub?: number;
    reducedSub?: number;
    reducedUnsub?: number;
    sorPctRounded?: number;
    sorApplicable?: boolean;
    initialGradPlus?: number;
    reducedGradPlus?: number;
    effectiveCombinedLimit?: number;
    subBaseline?: number;
    unsubBaseline?: number;
    terms?: Partial<Record<TermKey, { finalSub?: number; finalUnsub?: number; finalGradPlus?: number }>>;
  };
}

function build(
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

export const PARITY_FIXTURES: ParityFixture[] = [
  {
    id: "fixture-v19-001",
    description:
      "Dependent G1, Need $5,500, two terms 6/9 credits, 24 AY FT — canonical SOR=63% case (v18-A).",
    sourceRefs: ["psr-001", "psr-002"],
    input: build(
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
    expected: {
      totalFinalSub: 2205,
      totalFinalUnsub: 1260,
      reducedSub: 2205,
      reducedUnsub: 1260,
      sorApplicable: true,
      effectiveCombinedLimit: 5500,
      subBaseline: 3500,
      unsubBaseline: 2000,
    },
  },
  {
    id: "fixture-v19-002",
    description:
      "Dependent G1, Need $2,000 — combined-limit shifting moves the surplus to Unsub baseline.",
    sourceRefs: ["psr-001"],
    input: build(
      {
        numStandardTerms: 2,
        ayFtCredits: 24,
        gradeLevel: "g1",
        dependency: "dependent",
        annualNeed: 2000,
        subStatutory: 3500,
        unsubStatutory: 2000,
      },
      {
        term1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
        term2: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
      },
    ),
    expected: {
      subBaseline: 2000,
      unsubBaseline: 3500,
      effectiveCombinedLimit: 5500,
      sorApplicable: true,
    },
  },
  {
    id: "fixture-v19-003",
    description:
      "Three terms, near-full enrollment 9/12/12 — AY% = 92, annual Sub $1,840.",
    sourceRefs: ["psr-001"],
    input: build(
      {
        numStandardTerms: 3,
        includeSummer1: true,
        ayFtCredits: 36,
        gradeLevel: "g1",
        dependency: "dependent",
        annualNeed: 2000,
      },
      {
        term1: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
        term2: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
        term3: { enabled: false, ftCredits: 12, enrolledCredits: 0 },
        summer1: { enabled: true, ftCredits: 12, enrolledCredits: 12 },
      },
    ),
    expected: {
      reducedSub: 1840,
    },
  },
  {
    id: "fixture-v19-004",
    description:
      "Part-time Fall 6, overload Spring 18, proportional model — AY% = 100, balloon to Spring (ed-1).",
    sourceRefs: ["psr-001"],
    input: build(
      {
        numStandardTerms: 2,
        ayFtCredits: 24,
        gradeLevel: "g1",
        dependency: "dependent",
        annualNeed: 3500,
        distributionModel: "proportional",
      },
      {
        term1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
        term2: { enabled: true, ftCredits: 12, enrolledCredits: 18 },
      },
    ),
    expected: {
      totalFinalSub: 3500,
      terms: {
        term1: { finalSub: 875 },
        term2: { finalSub: 2625 },
      },
    },
  },
  {
    id: "fixture-v19-005",
    description:
      "Award Year 2025-26 — SOR is NOT applicable (gate). Reduced caps equal baselines.",
    sourceRefs: ["psr-003"],
    input: build(
      {
        awardYear: "2025-26",
        numStandardTerms: 2,
        ayFtCredits: 24,
        gradeLevel: "g1",
        dependency: "dependent",
        annualNeed: 5500,
      },
      {
        term1: { enabled: true, ftCredits: 12, enrolledCredits: 6 },
        term2: { enabled: true, ftCredits: 12, enrolledCredits: 9 },
      },
    ),
    expected: {
      sorApplicable: false,
      reducedSub: 3500,
      reducedUnsub: 2000,
    },
  },
  {
    id: "fixture-v19-006",
    description:
      "Grad PLUS basic — G8 independent, COA $40k, other aid $5k, Need $20.5k, requested PLUS $15k → initialPLUS = $14,500, SOR=100%.",
    sourceRefs: ["psr-002", "psr-004"],
    input: build(
      {
        gradeLevel: "g8",
        dependency: "independent",
        loanLimitException: true,
        numStandardTerms: 2,
        ayFtCredits: 18,
        annualNeed: 20500,
        coa: 40000,
        otherAid: 5000,
        requestedGradPlus: 15000,
      },
      {
        term1: { enabled: true, ftCredits: 9, enrolledCredits: 9 },
        term2: { enabled: true, ftCredits: 9, enrolledCredits: 9 },
      },
    ),
    expected: {
      initialGradPlus: 14500,
      reducedGradPlus: 14500,
      sorPctRounded: 1,
      subBaseline: 0,
      unsubBaseline: 20500,
    },
  },
  {
    id: "fixture-v19-007",
    description:
      "Grad PLUS with SOR reduction — same as 006 but Spring=5 credits → AY% = 78, reduced PLUS = $11,310.",
    sourceRefs: ["psr-002", "psr-004"],
    input: build(
      {
        gradeLevel: "g8",
        dependency: "independent",
        loanLimitException: true,
        numStandardTerms: 2,
        ayFtCredits: 18,
        annualNeed: 20500,
        coa: 40000,
        otherAid: 5000,
        requestedGradPlus: 15000,
      },
      {
        term1: { enabled: true, ftCredits: 9, enrolledCredits: 9 },
        term2: { enabled: true, ftCredits: 9, enrolledCredits: 5 },
      },
    ),
    expected: {
      reducedGradPlus: 11310,
    },
  },
];

/** Public-facing serialization (used by /api/public/v1/scenarios). */
export function serializeFixturesForPublic() {
  return PARITY_FIXTURES.map((f) => ({
    id: f.id,
    description: f.description,
    sourceRefs: f.sourceRefs,
    input: f.input,
    expected: f.expected,
  }));
}
