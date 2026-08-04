export type CaseStudy = {
  slug: string;
  title: string;
  tagline: string;
  role: string;
  period: string;
  metrics: { label: string; value: string }[];
  problem: string[];
  constraints: string[];
  shipped: string[];
  evidence: { label: string; detail: string }[];
  next: string[];
  links?: { label: string; to?: string; href?: string }[];
};

export const POSITIONING =
  "Product manager working at the seam of federal student aid policy and software. I turn ambiguous regulation into shipped, testable, publicly verifiable tools.";

export const CASE_STUDIES: CaseStudy[] = [
  {
    slug: "project-sor",
    title: "Project SOR — Schedule of Reductions calculator",
    tagline:
      "An open calculator for the OBBBA less-than-full-time Direct Loan reduction, built for financial aid offices and the students they serve.",
    role: "Product, policy interpretation, engineering",
    period: "2026",
    metrics: [
      { label: "Audiences served", value: "4" },
      { label: "Regression tests", value: "89 passing" },
      { label: "Public endpoints", value: "V1 + V2" },
      { label: "Source-labelled fixtures", value: "psr-001…008" },
    ],
    problem: [
      "The One Big Beautiful Bill Act changed annual Direct Loan limits and forced schools to apply a Schedule of Reductions for less-than-full-time enrollment for 2026-27.",
      "Every institution was rebuilding the same spreadsheet privately, with no shared reference, no citations, and no way to compare answers.",
    ],
    constraints: [
      "Parts of 2026-27 depend on rulemaking still in flight, so the tool has to be explicit about what is confirmed versus preliminary.",
      "It can never look like an award: no COD origination, no NSLDS records, no institutional approval.",
      "Staff and students need the same engine but opposite levels of detail.",
    ],
    shipped: [
      "A staff calculator covering SAY/BBAY academic years, standard and optional terms, child terms, paid history, distribution models, and per-term disbursements.",
      "A student estimator with a plain-language step-by-step of exactly how the number was produced.",
      "A public REST API plus an MCP server so other systems and AI agents can run the same engine.",
      "A published source register, methodology document, and scenario-challenge process so anyone can dispute the math with citations.",
    ],
    evidence: [
      {
        label: "Parity fixtures",
        value: "",
        detail:
          "Department-derived scenarios encoded as fixtures with source IDs, including rounding edge cases.",
      },
      {
        label: "Version discipline",
        value: "",
        detail:
          "Engine version, policy year, snapshot date, and release marker returned on every API response.",
      },
      {
        label: "Public contract",
        value: "",
        detail: "OpenAPI 3.1 spec with a CI contract check to keep docs and behaviour aligned.",
      },
    ].map((entry) => ({ label: entry.label, detail: entry.detail })),
    next: [
      "Add a full NSLDS aggregate and lifetime-limit model so Grad PLUS and graduate aggregates can be reasoned about safely.",
      "Shareable estimate URLs so an advisor can send a student their exact scenario.",
    ],
    links: [
      { label: "Open the staff calculator", to: "/" },
      { label: "Student estimate", to: "/student" },
      { label: "Methodology", to: "/methodology" },
    ],
  },
  {
    slug: "cod-annual-update",
    title: "COD annual update, productised",
    tagline:
      "Turning the yearly Common Origination and Disbursement technical update into readable, gated, brand-owned segments.",
    role: "Product, content architecture",
    period: "2026-27 cycle",
    metrics: [
      { label: "Award year", value: "2026-27" },
      { label: "Format", value: "Segmented briefs" },
      { label: "Access", value: "Gated" },
    ],
    problem: [
      "Annual COD technical updates arrive as long, dense documents that each institution re-reads and re-summarises on its own.",
      "The useful part — what actually changed and what it means operationally — is buried.",
    ],
    constraints: [
      "Proprietary detail such as message classes and internal specifics must be redacted or gated.",
      "The logic and interpretation still has to be complete enough to act on.",
    ],
    shipped: [
      "Segmented updates by award year, each with a change summary, operational impact, and open questions.",
      "A gated access model so sensitive detail is not published openly.",
    ],
    evidence: [
      {
        label: "Structure",
        detail: "One segment per award-year update, consistently formatted for scanning.",
      },
      { label: "Governance", detail: "Redaction and gating applied before publication." },
    ],
    next: ["Cross-link COD segments to the SOR engine behaviour they affect."],
  },
  {
    slug: "sor-agent-contract",
    title: "Making a policy engine agent-callable",
    tagline:
      "An MCP server and versioned public contract so AI agents can answer Schedule of Reductions questions with the real engine instead of guessing.",
    role: "Product, API design",
    period: "2026",
    metrics: [
      { label: "MCP tools", value: "5" },
      { label: "Contract versions", value: "V1 + V2" },
      { label: "Auth", value: "Public, read-only" },
    ],
    problem: [
      "People ask assistants about loan limits and get confidently wrong answers, because the assistant has no access to a real, versioned engine.",
    ],
    constraints: [
      "A public, unauthenticated surface must stay stateless and store nothing about a caller.",
      "Every answer needs its engine version, policy year, and disclaimer attached so it cannot be laundered into advice.",
    ],
    shipped: [
      "An MCP server exposing calculate, list-scenarios, compare, version-compare, and advanced-estimate tools.",
      "A V2 contract with explicit calculation status, policy decisions, external checks, and warnings on every response.",
      "A migration and compare surface so consumers can see exactly what changed between versions.",
    ],
    evidence: [
      {
        label: "Transparency",
        detail: "Responses carry engine version, release marker, and an explicit unsupported list.",
      },
      {
        label: "Parity tooling",
        detail: "Public scenario catalogue lets any consumer replay and verify results.",
      },
    ],
    next: ["Publish typed client SDKs generated from the OpenAPI spec."],
    links: [
      { label: "API docs", to: "/api-docs" },
      { label: "Agent guide", to: "/mcp-guide" },
    ],
  },
];

export function findCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((entry) => entry.slug === slug);
}
