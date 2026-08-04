import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { CASE_STUDIES, POSITIONING } from "@/content/work";

export const Route = createFileRoute("/work/")({
  component: WorkIndexPage,
  head: () => ({
    meta: [
      { title: "Work - Product case studies in federal student aid" },
      {
        name: "description",
        content:
          "Case studies from shipped student-aid products: the SOR calculator, COD annual updates, and an agent-callable policy engine. Problem, constraints, what shipped, evidence.",
      },
      { property: "og:title", content: "Work - Product case studies in federal student aid" },
      {
        property: "og:description",
        content:
          "Shipped student-aid product work with the problem, constraints, evidence, and what I would do next.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://sor.myproduct.life/work" },
    ],
    links: [{ rel: "canonical", href: "https://sor.myproduct.life/work" }],
  }),
});

function WorkIndexPage() {
  return (
    <main id="main">
      <PageHeader
        eyebrow="Proof of work"
        title="Things I have shipped, and what they cost to get right"
        summary={POSITIONING}
        crumbs={[{ label: "Home", to: "/" }, { label: "Work" }]}
      />
      <div className="mx-auto max-w-[1400px] px-4 py-10 sm:px-6">
        <ul className="grid gap-5 lg:grid-cols-3">
          {CASE_STUDIES.map((study) => (
            <li key={study.slug} className="flex">
              <Link
                to="/work/$slug"
                params={{ slug: study.slug }}
                className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {study.period} · {study.role}
                </p>
                <h2 className="mt-3 font-display text-lg font-semibold leading-snug">
                  {study.title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">
                  {study.tagline}
                </p>
                <dl className="mt-5 grid grid-cols-2 gap-3">
                  {study.metrics.slice(0, 4).map((metric) => (
                    <div key={metric.label} className="rounded-lg bg-muted/60 px-3 py-2">
                      <dt className="text-[11px] leading-4 text-muted-foreground">
                        {metric.label}
                      </dt>
                      <dd className="num text-sm font-semibold">{metric.value}</dd>
                    </div>
                  ))}
                </dl>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Read the case study
                  <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <section className="mt-12 rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">Work with me</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            I am most useful where the requirements are still regulation, the stakes are compliance,
            and someone has to decide what the software will actually claim. Product strategy,
            policy interpretation, API contracts, and shipping.
          </p>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium">
            <a
              href="https://www.linkedin.com/in/tirath-c-7228b814/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Connect on LinkedIn <ArrowUpRight className="h-4 w-4" />
            </a>
            <Link
              to="/about"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 transition-colors hover:bg-muted"
            >
              How I work
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
