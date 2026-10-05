import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/site/PageHeader";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy | Project SOR" },
      { name: "description", content: "How Project SOR processes calculator, API, and MCP requests." },
    ],
    links: [{ rel: "canonical", href: "https://sor.myproduct.life/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <main id="main">
      <PageHeader
        eyebrow="Project SOR"
        title="Privacy"
        summary="Project SOR needs scenario facts to calculate an estimate. It does not need a student's identity."
        crumbs={[{ label: "Home", to: "/" }, { label: "Privacy" }]}
      />
      <div className="mx-auto max-w-3xl space-y-9 px-4 py-10 text-sm leading-7 sm:px-6">
        <p className="text-muted-foreground">Effective October 6, 2026. Publisher: Tirath Chhatriwala, <a className="text-primary underline-offset-2 hover:underline" href="mailto:tirath@outlook.com">tirath@outlook.com</a>.</p>
        <section>
          <h2 className="text-lg font-semibold text-foreground">What you provide</h2>
          <p className="mt-3 text-muted-foreground">
            Calculator, REST API, and MCP requests may contain award year, grade level, enrollment credits,
            cost of attendance, other aid, paid history, and other scenario facts. The calculation endpoints
            process these facts to return a result or a request for more information. They are not designed to
            collect names, student IDs, Social Security numbers, birth dates, or account credentials. Do not enter them.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Storage and retention</h2>
          <p className="mt-3 text-muted-foreground">
            The SOR calculation code does not intentionally write calculation request bodies to an application
            database. API rate limiting keeps a daily-salted hash derived from the connection address in worker
            memory; it is not a durable student record. The Compare page can save its form and result in your
            browser's local storage until you clear them or your browser data. Other local settings remember
            dismissed notices and lifecycle selections until you clear browser data.
          </p>
          <p className="mt-3 text-muted-foreground">
            A separate public lab uses a hashed visitor value for usage limits in a Supabase database. Its
            cleanup runs when new reservations are made and removes records older than roughly two days at
            that point; there is no guaranteed deletion time if the lab receives no later requests.
          </p>
          <p className="mt-3 text-muted-foreground">
            The hosting and security providers may process connection metadata, including IP address, request
            time, URL, and browser details. The active production logging settings and their retention period
            are being verified. This page will be updated with that period before a public plugin submission.
            Do not use Project SOR for identifiable student records in the meantime.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Cookies and service providers</h2>
          <p className="mt-3 text-muted-foreground">
            The staff-site access gate uses an encrypted, HTTP-only session cookie. Cloudflare may set a
            security cookie such as <code>__cf_bm</code> to protect the site; Cloudflare states that this cookie
            expires after 30 minutes of inactivity. Cloudflare hosts and protects the site, Lovable manages
            publishing, and Supabase supports the separate lab quota. If you use the MCP server through
            ChatGPT or another AI client, that client also processes the scenario under its own privacy terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">Your choices</h2>
          <p className="mt-3 text-muted-foreground">
            Use fictional or de-identified scenario facts. You can clear this site's local storage and cookies
            in your browser. For a privacy question or a request about information you sent to support, email
            <a className="ml-1 text-primary underline-offset-2 hover:underline" href="mailto:tirath@outlook.com">tirath@outlook.com</a>.
            I can address information in systems I control, but cannot erase records held independently by an AI
            client or infrastructure provider. See <Link to="/support" className="text-primary underline-offset-2 hover:underline">Support</Link> for contact details.
          </p>
        </section>
      </div>
    </main>
  );
}
