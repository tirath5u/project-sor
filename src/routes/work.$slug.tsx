import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { findCaseStudy, type CaseStudy } from "@/content/work";

export const Route = createFileRoute("/work/$slug")({
  loader: ({ params }) => {
    const study = findCaseStudy(params.slug);
    if (!study) throw notFound();
    return { study };
  },
  head: ({ params, loaderData }) => {
    const study = loaderData?.study;
    if (!study) {
      return { meta: [{ title: "Case study not found" }, { name: "robots", content: "noindex" }] };
    }
    const url = `https://sor.myproduct.life/work/${params.slug}`;
    return {
      meta: [
        { title: `${study.title} - Case study` },
        { name: "description", content: study.tagline },
        { property: "og:title", content: `${study.title} - Case study` },
        { property: "og:description", content: study.tagline },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: study.title,
            description: study.tagline,
            author: { "@type": "Person", name: "Tirath Chhatriwala" },
          }),
        },
      ],
    };
  },
  component: CaseStudyPage,
});

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-6 text-muted-foreground">
            <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CaseStudyPage() {
  const { study } = Route.useLoaderData() as { study: CaseStudy };

  return (
    <main id="main">
      <PageHeader
        eyebrow={`${study.period} · ${study.role}`}
        title={study.title}
        summary={study.tagline}
        crumbs={[{ label: "Home", to: "/" }, { label: "Work", to: "/work" }, { label: study.slug }]}
      >
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {study.metrics.map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border bg-background px-4 py-3">
              <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{metric.label}</dt>
              <dd className="num mt-1 text-lg font-semibold">{metric.value}</dd>
            </div>
          ))}
        </dl>
      </PageHeader>

      <div className="mx-auto max-w-[1100px] space-y-5 px-4 py-10 sm:px-6">
        <Block title="Problem" items={study.problem} />
        <Block title="Constraints" items={study.constraints} />
        <Block title="What I shipped" items={study.shipped} />

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-lg font-semibold">Evidence</h2>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            {study.evidence.map((entry) => (
              <div key={entry.label}>
                <dt className="text-sm font-medium">{entry.label}</dt>
                <dd className="mt-1 text-sm leading-6 text-muted-foreground">{entry.detail}</dd>
              </div>
            ))}
          </dl>
        </section>

        <Block title="What I would do next" items={study.next} />

        {study.links?.length ? (
          <section className="flex flex-wrap gap-3 rounded-2xl border border-border bg-muted/40 p-6 text-sm font-medium">
            {study.links.map((link) =>
              link.to ? (
                <Link
                  key={link.label}
                  to={link.to}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 transition-colors hover:bg-muted"
                >
                  {link.label} <ArrowUpRight className="h-4 w-4" />
                </Link>
              ) : null,
            )}
          </section>
        ) : null}

        <p className="pt-2 text-sm">
          <Link to="/work" className="text-primary underline-offset-2 hover:underline">
            Back to all work
          </Link>
        </p>
      </div>
    </main>
  );
}