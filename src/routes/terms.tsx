import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms | Project SOR" },
      { name: "description", content: "Terms for using the Project SOR website, API, and MCP server." },
    ],
    links: [{ rel: "canonical", href: "https://sor.myproduct.life/terms" }],
  }),
});

function TermsPage() {
  return (
    <main id="main">
      <PageHeader
        eyebrow="Project SOR"
        title="Terms of use"
        summary="Project SOR provides calculation support, not a final financial aid determination."
        crumbs={[{ label: "Home", to: "/" }, { label: "Terms" }]}
      />
      <div className="mx-auto max-w-3xl space-y-9 px-4 py-10 text-sm leading-7 sm:px-6">
        <p className="text-muted-foreground">Effective October 6, 2026. Publisher: Tirath Chhatriwala.</p>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Purpose and limits</h2>
          <p className="mt-3 text-muted-foreground">
            The website, REST API, and MCP tools provide source-backed estimates for supported Schedule of
            Reductions scenarios. An AI assistant may help gather facts, but the Project SOR calculation engine
            performs the arithmetic. A review response means the tool cannot responsibly supply a dollar result
            for that scenario. Neither an estimate nor a review response is an award, approval, or guarantee.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Institutional review</h2>
          <p className="mt-3 text-muted-foreground">
            The institution must verify the student's records, remaining annual and aggregate eligibility,
            cost of attendance, other assistance, COD status, program rules, and final disbursement before
            awarding funds. Project SOR is independent and is not published, approved, or endorsed by the
            U.S. Department of Education, Federal Student Aid, Anthology, or Ellucian.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Responsible use</h2>
          <p className="mt-3 text-muted-foreground">
            Do not submit names, student IDs, Social Security numbers, passwords, or identifiable student
            records. Do not use the public service to make an automated final eligibility decision. Access is
            subject to reasonable rate limits and may change while federal guidance and the product evolve.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Code and contact</h2>
          <p className="mt-3 text-muted-foreground">
            The published source code has its own MIT license; these website terms do not replace that license.
            For a source question or service concern, see <Link to="/support" className="text-primary underline-offset-2 hover:underline">Support</Link> or
            email <a className="text-primary underline-offset-2 hover:underline" href="mailto:tirath@outlook.com">tirath@outlook.com</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
