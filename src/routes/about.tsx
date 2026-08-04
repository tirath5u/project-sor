import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { POSITIONING } from "@/content/work";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "About Tirath - Product Management in Higher Ed Technology" },
      {
        name: "description",
        content:
          "Who builds these tools and how. Product management at the seam of federal student aid regulation and software: interpretation, contracts, evidence, shipping.",
      },
      {
        property: "og:title",
        content: "About - Tirath Chhatriwala, product in federal student aid",
      },
      {
        property: "og:description",
        content:
          "Product management at the seam of federal student aid regulation and software: interpretation, contracts, evidence, shipping.",
      },
      { property: "og:type", content: "profile" },
      { property: "og:url", content: "https://sor.myproduct.life/about" },
    ],
    links: [{ rel: "canonical", href: "https://sor.myproduct.life/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: "Tirath Chhatriwala",
          jobTitle: "Product Manager",
          url: "https://sor.myproduct.life/about",
          sameAs: ["https://www.linkedin.com/in/tirath-c-7228b814/"],
          knowsAbout: [
            "Federal student aid",
            "Direct Loan Schedule of Reductions",
            "Common Origination and Disbursement",
            "Product management",
          ],
        }),
      },
    ],
  }),
});

const PRINCIPLES = [
  {
    title: "Cite or don't claim",
    body: "Every number this site produces traces back to a labelled source, and where the regulation is unsettled the tool says so instead of guessing quietly.",
  },
  {
    title: "Two audiences, one engine",
    body: "Students and financial aid staff need opposite levels of detail from identical math. One tested engine, different surfaces, no forked logic.",
  },
  {
    title: "Make it checkable",
    body: "Public scenarios, an OpenAPI contract, a scenario-challenge process. If I am wrong, I want it to be cheap for someone to prove it.",
  },
  {
    title: "Ship the boring parts",
    body: "Versioning, disclaimers, release markers, and regression fixtures are the product when the domain is compliance.",
  },
];

function AboutPage() {
  return (
    <main id="main">
      <PageHeader
        eyebrow="About"
        title="Tirath Chhatriwala"
        summary={POSITIONING}
        crumbs={[{ label: "Home", to: "/" }, { label: "About" }]}
      />
      <div className="mx-auto max-w-[1100px] space-y-10 px-4 py-10 sm:px-6">
        <section className="grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((item) => (
            <div key={item.title} className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-base font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-border bg-muted/40 p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">Where to go next</h2>
          <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium">
            <Link
              to="/work"
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Case studies <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/methodology"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 transition-colors hover:bg-muted"
            >
              Methodology and sources
            </Link>
            <a
              href="https://www.linkedin.com/in/tirath-c-7228b814/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 transition-colors hover:bg-muted"
            >
              LinkedIn <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
