import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";
import { ENGINE_VERSION, POLICY_SNAPSHOT_DATE, POLICY_YEAR, DEPLOYMENT_MARKER } from "@/lib/sor.version";

export const Route = createFileRoute("/methodology")({
  component: MethodologyPage,
  head: () => ({
    meta: [
      { title: "Methodology and sources - SOR engine" },
      {
        name: "description",
        content:
          "How the Schedule of Reductions engine works: inputs, the SOR percentage, rounding policy, distribution of disbursements, cited sources, and documented caveats.",
      },
      { property: "og:title", content: "Methodology and sources - SOR engine" },
      {
        property: "og:description",
        content:
          "Inputs, SOR percentage, rounding policy, disbursement distribution, cited sources, and caveats for the Schedule of Reductions engine.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://sor.myproduct.life/methodology" },
    ],
    links: [{ rel: "canonical", href: "https://sor.myproduct.life/methodology" }],
  }),
});

const STEPS = [
  {
    title: "1. Establish baselines",
    body: "Resolve the Subsidized and Unsubsidized annual anchors for the student's grade level and dependency status, per the 34 CFR 685.203 schedule. For 2026-27 without a loan limit exception, the OBBBA table applies.",
  },
  {
    title: "2. Resolve the combined limit",
    body: "Compute the effective combined limit, accounting for additional unsubsidized eligibility where it applies.",
  },
  {
    title: "3. Compute the SOR percentage",
    body: "Weight enrolled credits against the academic-year full-time denominator and round to the policy-specified precision. The result is reported as the SOR percentage.",
  },
  {
    title: "4. Apply the reduction",
    body: "Multiply the annual pools by the SOR percentage to produce reduced Subsidized, Unsubsidized, and (where modelled) Grad PLUS annual amounts.",
  },
  {
    title: "5. Distribute across the loan period",
    body: "Split reduced pools across terms either equally or proportionally. Proportional distribution uses effective enrolled-credit weighting.",
  },
  {
    title: "6. Surface caveats",
    body: "Warnings are produced by the engine itself, not the interface, so the API and every screen report the same limitations. Less-than-half-time (LT-HT) enrollment, NSLDS aggregate and lifetime checks, and pending federal guidance are all flagged explicitly.",
  },
];

const CAVEATS = [
  "This tool produces estimates. It is not an award, approval, or guarantee, and it does not perform COD origination or read NSLDS records.",
  "Where 2026-27 behaviour depends on rulemaking implementing OBBBA, items are flagged as pending federal guidance in the public source register.",
  "Department proportional-distribution evidence is marked as caveated because the source workbook labels and formulas conflict.",
  "Grad PLUS for non-grandfathered 2026-27 borrowers requires NSLDS aggregate and lifetime-limit checks performed outside this calculator.",
  "Aggregate and lifetime limits are only modelled for undergraduate dependent and undergraduate independent tiers.",
];

function MethodologyPage() {
  return (
    <main id="main">
      <PageHeader
        eyebrow="How it works"
        title="Methodology and sources"
        summary="A plain-language walkthrough of the calculation engine. The authoritative rules live in 34 CFR 685.203 and the annual Federal Student Aid COD Technical Reference; this page does not replace them."
        crumbs={[{ label: "Home", to: "/" }, { label: "Methodology" }]}
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Engine version", value: ENGINE_VERSION },
            { label: "Policy year", value: POLICY_YEAR },
            { label: "Sources reviewed", value: POLICY_SNAPSHOT_DATE },
            { label: "Release", value: DEPLOYMENT_MARKER },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border bg-background px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{item.label}</dt>
              <dd className="num mt-1 text-sm font-semibold break-words">{item.value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="mx-auto max-w-[1100px] space-y-8 px-4 py-10 sm:px-6">
        <section>
          <h2 className="font-display text-xl font-semibold">The calculation, step by step</h2>
          <ol className="mt-4 grid gap-4 sm:grid-cols-2">
            {STEPS.map((step) => (
              <li key={step.title} className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-display text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="rounded-2xl border border-warning/40 bg-warning/10 p-6">
          <h2 className="font-display text-xl font-semibold">Documented caveats</h2>
          <ul className="mt-3 space-y-2.5">
            {CAVEATS.map((caveat) => (
              <li key={caveat} className="flex gap-2.5 text-sm leading-6">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warning-foreground/60" />
                {caveat}
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl font-semibold">Verify it yourself</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Every published scenario can be replayed against the live engine, and the full input
            contract is documented in the public API.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium">
            <Link to="/compare" className="rounded-lg border border-border px-4 py-2 transition-colors hover:bg-muted">
              Replay published scenarios
            </Link>
            <Link to="/api-docs" className="rounded-lg border border-border px-4 py-2 transition-colors hover:bg-muted">
              API and schemas
            </Link>
            <Link to="/releases" className="rounded-lg border border-border px-4 py-2 transition-colors hover:bg-muted">
              Version history
            </Link>
            <a
              href="https://github.com/tirathc/project-sor/issues/new?template=scenario-challenge.yml"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-border px-4 py-2 transition-colors hover:bg-muted"
            >
              Challenge a scenario
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}