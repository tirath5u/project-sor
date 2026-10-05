import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/support")({
  component: SupportPage,
  head: () => ({
    meta: [
      { title: "Support | Project SOR" },
      { name: "description", content: "Contact Project SOR about calculations, sources, access, or privacy." },
    ],
    links: [{ rel: "canonical", href: "https://sor.myproduct.life/support" }],
  }),
});

function SupportPage() {
  return (
    <main id="main">
      <PageHeader
        eyebrow="Project SOR"
        title="Support"
        summary="Questions about a result, source, or connection can be sent directly to the project publisher."
        crumbs={[{ label: "Home", to: "/" }, { label: "Support" }]}
      />
      <div className="mx-auto max-w-3xl space-y-9 px-4 py-10 text-sm leading-7 sm:px-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Contact</h2>
          <a className="mt-3 inline-flex items-center gap-2 text-primary underline-offset-2 hover:underline" href="mailto:tirath@outlook.com">
            <Mail className="h-4 w-4" aria-hidden="true" /> tirath@outlook.com
          </a>
          <p className="mt-3 text-muted-foreground">Project SOR is published by Tirath Chhatriwala.</p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Report a calculation issue</h2>
          <p className="mt-3 text-muted-foreground">
            Include the award year, program calendar, loan-period scope, term credits, the result you expected,
            and the engine version or release ID shown with the result. A source citation or worked example helps.
            Do not send names, student IDs, birth dates, account numbers, passwords, or actual student records.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">What support can resolve</h2>
          <p className="mt-3 text-muted-foreground">
            I can review the calculator behavior and its source trail. Your school must determine official loan
            eligibility, COD status, remaining aggregate room, and final disbursement amounts.
          </p>
          <p className="mt-3 text-muted-foreground">
            You can also inspect the <Link to="/methodology" className="text-primary underline-offset-2 hover:underline">methodology</Link> and
            the <Link to="/mcp-guide" className="text-primary underline-offset-2 hover:underline">MCP connection guide</Link>.
          </p>
        </section>
      </div>
    </main>
  );
}
