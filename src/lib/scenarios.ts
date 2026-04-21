/**
 * Pre-built scenarios for the Schedule of Reductions calculator.
 *
 * Scenarios are written in plain English so anyone can pick one and
 * understand the student, what's special about the case, and what the
 * calculator should produce. Internal `id`s are stable so the regression
 * suite (sor.test.ts) can assert against them.
 */

import { defaultInputs, TERM_LABELS, type SORInputs, type TermKey } from "./sor";

export interface Scenario {
  id: string;
  group:
    | "Common situations"
    | "What if a student changes mid-year?"
    | "Edge cases & overloads"
    | "Regression checks (advanced)";
  title: string;
  /** One short sentence: who is this student? */
  student?: string;
  /** One short sentence: what makes this case interesting? */
  whatsSpecial?: string;
  summary: string;
  expected?: string;
  /** Optional per-term expected dollars (regression badge in the matrix). */
  expectedTerms?: Partial<Record<TermKey, { sub?: number; unsub?: number }>>;
  /** Optional annual totals for the regression suite to assert against. */
  expectedTotals?: { sub?: number; unsub?: number };
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
  // -------- Common situations --------
  {
    id: "ed-3",
    group: "Common situations",
    title: "Half-time Fall, three-quarter Spring",
    student:
      "Dependent freshman with $3,500 of need, taking 6 credits in Fall and 9 in Spring at a school with 24 full-time credits per year.",
    whatsSpecial:
      "Both terms are below full-time, so the annual loan limit is reduced (AY % = 63%).",
    summary: "Sub $3,500 · Fall 6 / Spring 9 · 24 AY FT.",
    expected:
      "Sub annual cap reduces to $2,205 for the year. Paid as $551 in Fall and $827 in Spring.",
    expectedTerms: {
      term1: { sub: 551 },
      term2: { sub: 827 },
    },
    expectedTotals: { sub: 1378 },
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
    id: "fsa-1",
    group: "Common situations",
    title: "Half-time Fall, three-quarter Spring (with Unsub)",
    student:
      "Dependent freshman taking 6 credits in Fall and 9 in Spring, with both Sub ($3,500) and Unsub ($2,000) eligibility.",
    whatsSpecial:
      "Same enrollment as above, but now both loan types are reduced together by the 63% AY %.",
    summary: "Sub $3,500 / Unsub $2,000 · Fall 6 / Spring 9 · 24 AY FT.",
    expected:
      "Sub caps at $2,205 for the year. Unsub caps at $1,260. Per-term Sub share is roughly $1,102 / $1,103.",
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
    id: "ed-2",
    group: "Common situations",
    title: "Three terms, full-year enrollment",
    student:
      "Dependent freshman with $2,000 of need, taking 9 / 12 / 15 credits across Fall, Spring, and Summer (36 full-time credits per year).",
    whatsSpecial:
      "Total credits add up to a full academic year, so there's no AY-% reduction. The summer term carries an overload.",
    summary: "Sub $2,000 · Fall 9 / Spring 12 / Summer 15 · 36 AY FT.",
    expected:
      "Annual stays at $2,000. Per-term shares of about $666 / $667 / $667. Disbursements: $500 / $667 / $833.",
    expectedTotals: { sub: 2000 },
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
    id: "leg-4",
    group: "Common situations",
    title: "Spring drops below half-time",
    student:
      "Dependent freshman with $5,500 of need, taking 9 credits in Fall but only 3 in Spring (FT = 12).",
    whatsSpecial:
      "Spring drops below half-time, so the student becomes ineligible that term — only Fall pays.",
    summary: "Fall 9 / Spring 3 (FT 12/12, AY 24).",
    expected:
      "Spring is INELIGIBLE (no disbursement). Fall pays at its share × 75%.",
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

  // -------- What if a student changes mid-year? --------
  {
    id: "ed-5",
    group: "What if a student changes mid-year?",
    title: "Spring drops after Fall has been paid (clawback)",
    student:
      "Dependent freshman who got $1,313 of Sub in Fall (planned 9 credits) but drops to 6 in Spring.",
    whatsSpecial:
      "Fall is locked because it was already disbursed. The Spring share gets reduced to claw back the over-award from Fall.",
    summary: "Sub $3,500 · Fall 9 paid as planned ($1,313). Spring drops to 6.",
    expected:
      "After Spring recalc: AY % = 63 %, annual $2,205. Spring's share is reduced by Fall's over-award.",
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
    group: "What if a student changes mid-year?",
    title: "Fall full-time, Spring withdraws to zero",
    student:
      "Dependent freshman who was paid $1,750 of Sub at full-time in Fall, then withdraws completely in Spring.",
    whatsSpecial:
      "Spring is below half-time and ineligible. Only the Fall payment counts toward the annual total.",
    summary: "Sub $3,500 · Fall paid at full-time ($1,750). Spring 0 credits.",
    expected: "Spring is INELIGIBLE. Final Sub for the year = Fall's $1,750.",
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
    group: "What if a student changes mid-year?",
    title: "Fall part-time, Spring overloads (balloon)",
    student:
      "Dependent freshman who was paid $875 of Sub in Fall (6 credits) and now enrolls in 18 credits in Spring instead of the planned 12.",
    whatsSpecial:
      "Spring's overload pushes AY % back to 100 %. The leftover annual headroom balloons into the Spring disbursement.",
    summary: "Sub $3,500 · Fall 6 paid at $875. Spring planned 12 / actual 18.",
    expected:
      "After Spring recalc: AY % returns to 100 %. Spring final = annual $3,500 − Fall $875 = $2,625.",
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

  // -------- Edge cases & overloads --------
  {
    id: "ed-1",
    group: "Edge cases & overloads",
    title: "Part-time Fall, overload Spring (balloon)",
    student:
      "Dependent freshman with $3,500 of need, taking 6 credits in Fall and an overload of 18 in Spring (FT = 12).",
    whatsSpecial:
      "Total credits hit a full year, so AY % stays at 100 %. Fall pays only 50 %, leaving a big balloon for Spring.",
    summary: "Sub $3,500 · Fall 6 / Spring 18 (FT 12/12) · 24 AY FT.",
    expected:
      "AY % = 100 %, annual $3,500. Fall pays $875. Spring absorbs the rest: $2,625.",
    expectedTotals: { sub: 3500 },
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
    id: "ed-8",
    group: "Edge cases & overloads",
    title: "Overload Fall, part-time Spring (forward catch-up)",
    student:
      "Dependent freshman with $3,500 of need, taking an overload of 15 in Fall and dropping to 6 in Spring.",
    whatsSpecial:
      "Fall is capped at its own share, but the unused share carries forward into Spring.",
    summary: "Sub $3,500 · Fall 15 / Spring 6 · 24 AY FT.",
    expected:
      "AY % = 88 %, annual $3,080. Fall capped at $1,540. Spring picks up its $770 plus a $385 forward = $1,155.",
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
  {
    id: "fsa-3",
    group: "Edge cases & overloads",
    title: "Three terms, near-full enrollment",
    student:
      "Dependent freshman with $2,000 of need, taking 9 / 12 / 12 across Fall, Spring, and Summer.",
    whatsSpecial:
      "Just shy of a full year — AY % comes out to 92 %, slightly reducing the annual.",
    summary: "Sub $2,000 · Fall 9 / Spring 12 / Summer 12 · 36 AY FT.",
    expected: "AY % = 92 %, annual $1,840.",
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
  {
    id: "v18-c",
    group: "Edge cases & overloads",
    title: "Proportional split across uneven terms",
    student:
      "Independent sophomore with $10,500 of need, taking 12 credits in Fall (FT = 12) and 6 in Spring (FT = 6).",
    whatsSpecial:
      "Spring is a shorter term with a lower FT count. The proportional model weights each term by its FT credits, so Fall gets ~⅔ and Spring ~⅓.",
    summary: "Independent G2 · Need $10,500 · Fall 12 (FT 12) / Spring 6 (FT 6) · 18 AY FT.",
    expected:
      "AY % = 100 %. Equal model would split 50 / 50; proportional gives roughly ⅔ / ⅓.",
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

  // -------- Regression checks (advanced) --------
  {
    id: "v18-a",
    group: "Regression checks (advanced)",
    title: "v18-A — Two-term LTFT, full Sub + Unsub need",
    student:
      "Dependent G1 with $5,500 need, taking 6 / 9 across Fall / Spring with 24 AY FT credits.",
    whatsSpecial:
      "Mirrors the v18 master spreadsheet default. Used to verify the engine matches dollar-for-dollar.",
    summary:
      "Grade 1 dep, Need $5,500 · Fall 6 / Spring 9 · 24 AY FT.",
    expected:
      "AY % 63 %. Annual Sub $2,205 / Unsub $1,260. Final Sub 551 / 827, Unsub 315 / 472.",
    expectedTerms: {
      term1: { sub: 551, unsub: 315 },
      term2: { sub: 827, unsub: 472 },
    },
    expectedTotals: { sub: 1378, unsub: 787 },
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
    group: "Regression checks (advanced)",
    title: "v18-B — Independent G3 with Winter 1 + Summer",
    student:
      "Independent grad student (G3) with $12,500 need, enrolling Fall 12 / Winter1 6 / Spring 9 / Summer 6 across 30 AY FT credits.",
    whatsSpecial:
      "Four-term mid-year structure. Verifies that Winter terms slot into the distribution correctly.",
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
];
