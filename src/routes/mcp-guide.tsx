import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ExternalLink, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

const CHATGPT_LISTING =
  "https://chatgpt.com/plugins/plugin_asdk_app_6ac5658b32908191b846907bb1ef577d";

export const Route = createFileRoute("/mcp-guide")({
  head: () => ({
    meta: [
      { title: "Use SOR in ChatGPT or an MCP client - Project SOR" },
      {
        name: "description",
        content:
          "Use the Schedule of Reductions calculator in ChatGPT, or connect another MCP client to the public calculation engine.",
      },
    ],
  }),
  component: McpGuidePage,
});

function McpGuidePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6">
        <section id="chatgpt" aria-labelledby="chatgpt-heading" className="space-y-8">
          <div className="max-w-3xl space-y-4">
            <p className="text-sm font-medium text-primary">ChatGPT plugin</p>
            <h1 id="chatgpt-heading" className="text-3xl font-semibold sm:text-4xl">
              Use Schedule of Reductions (SOR) in ChatGPT
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Use Schedule of Reductions (SOR) in ChatGPT to explore supported Direct Loan reduction
              scenarios, see the calculation steps, and learn which facts are still needed.
              Estimates are not awards. Your school must verify final eligibility.
            </p>
            <Button asChild>
              <a href={CHATGPT_LISTING} target="_blank" rel="noreferrer">
                Install in ChatGPT <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-start">
            <div>
              <h2 className="text-lg font-semibold">Get started</h2>
              <ol className="mt-4 space-y-5">
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    1
                  </span>
                  <p className="text-sm leading-6">
                    <strong>Open the listing.</strong> Select Install in ChatGPT above, then select
                    Install plugin on the ChatGPT page. You may need to sign in.
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    2
                  </span>
                  <p className="text-sm leading-6">
                    <strong>Ask about a scenario.</strong> Start a new chat and describe the loan
                    period, grade level, and credits per term. For example: "Use Schedule of
                    Reductions (SOR) to estimate my Direct Loan limits. I am a dependent first-year
                    student taking 6 credits in fall and 9 in spring."
                  </p>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    3
                  </span>
                  <p className="text-sm leading-6">
                    <strong>Review the answer.</strong> Check the calculation steps, answer any
                    follow-up questions, and confirm the result with your financial aid office.
                  </p>
                </li>
              </ol>
              <p className="mt-6 text-sm leading-6 text-muted-foreground">
                Independently developed. Not endorsed by the U.S. Department of Education. The
                plugin uses the same public calculation engine as this site and does not change
                school records. Availability depends on your ChatGPT account.
              </p>
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link to="/methodology" className="text-primary underline-offset-2 hover:underline">
                  Methodology
                </Link>
                <Link to="/privacy" className="text-primary underline-offset-2 hover:underline">
                  Privacy
                </Link>
                <Link to="/support" className="text-primary underline-offset-2 hover:underline">
                  Support
                </Link>
              </p>
            </div>
            <figure className="min-w-0">
              <a
                href="/chatgpt-plugin-listing.png"
                target="_blank"
                rel="noreferrer"
                aria-label="Open a larger image of the Schedule of Reductions ChatGPT listing"
              >
                <img
                  src="/chatgpt-plugin-listing.png"
                  alt="ChatGPT listing for Schedule of Reductions (SOR), with an Install plugin button and example questions about estimates, sources, and missing information."
                  width={780}
                  height={486}
                  loading="lazy"
                  className="w-full rounded-lg border border-border"
                />
              </a>
              <figcaption className="mt-2 text-xs leading-5 text-muted-foreground">
                The public ChatGPT listing, captured October 24, 2026. Select the image to enlarge
                it.
              </figcaption>
            </figure>
          </div>
        </section>

        <section aria-labelledby="demo-heading" className="space-y-6 border-t border-border pt-10">
          <div className="max-w-3xl space-y-2">
            <h2 id="demo-heading" className="text-2xl font-semibold">See it in use</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              Short, silent recordings using public example scenarios. Results are estimates, not
              financial aid awards.
            </p>
          </div>
          <div className="grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,240px)]">
            <div className="min-w-0 space-y-2">
              <h3 className="text-base font-semibold">ChatGPT walkthrough</h3>
              <video
                controls
                preload="none"
                playsInline
                poster="/sor-chatgpt-desktop-poster.jpg"
                aria-label="Schedule of Reductions ChatGPT calculation, comparison, and review walkthrough"
                className="w-full rounded-md border border-border bg-black"
              >
                <source src="/sor-chatgpt-desktop-demo.mp4" type="video/mp4" />
                Your browser does not support this video.
              </video>
              <p className="text-xs leading-5 text-muted-foreground">
                Calculation, scenario comparison, and a case that needs more information.
              </p>
            </div>
            <div className="min-w-0 space-y-2">
              <h3 className="text-base font-semibold">Mobile guide preview</h3>
              <video
                controls
                preload="none"
                playsInline
                poster="/sor-chatgpt-mobile-poster.jpg"
                aria-label="Mobile view of the Schedule of Reductions ChatGPT guide"
                className="mx-auto w-full max-w-60 rounded-md border border-border bg-black"
              >
                <source src="/sor-chatgpt-mobile-guide-preview.mp4" type="video/mp4" />
                Your browser does not support this video.
              </video>
              <p className="text-xs leading-5 text-muted-foreground">
                Mobile website navigation and install guide, not a ChatGPT app recording.
              </p>
            </div>
          </div>
        </section>

        <section className="max-w-3xl space-y-4 border-t border-border pt-10">
          <p className="text-sm font-medium text-primary">Remote MCP</p>
          <h2 className="text-2xl font-semibold sm:text-3xl">Other MCP clients</h2>
          <p className="text-base leading-7 text-muted-foreground">
            Project SOR is a source-backed Schedule of Reductions calculation engine available
            through Excel, the web, a REST API, and a remote MCP server. The same tested engine
            supports detailed staff workflows, student-friendly estimates, AI-assisted scenario
            intake and scenario comparison. Historical V55 versus V56 migration review remains
            available on the website, not as a public MCP tool.
          </p>
          <Button asChild variant="outline">
            <a href="https://github.com/tirath5u/project-sor" target="_blank" rel="noreferrer">
              View source <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
          <p className="text-sm leading-6 text-muted-foreground">
            Connect to <code>https://sor.myproduct.life/mcp</code>. Availability and connection
            steps depend on the client and account.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {["Connect the endpoint", "Describe the scenario", "Review the result"].map(
            (title, index) => (
              <div key={title} className="rounded-lg border border-border bg-card p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {index + 1}
                  </span>
                  {title}
                </div>
                <p className="text-sm leading-6 text-muted-foreground">
                  {index === 0
                    ? "Add https://sor.myproduct.life/mcp as a remote MCP server in a client that supports custom MCP connections."
                    : index === 1
                      ? "Include award year, program level, grade level, dependency, loan-period scope, academic-year structure, credits, need, COA, other aid, and paid history when relevant."
                      : "The server returns gross eligibility, net display amounts, calculation stages, warnings, modeled checks, external checks, release metadata, and public citations. It also supports compare_sor for two complete cases and advanced_student_estimate for institution-specific projections."}
                </p>
              </div>
            ),
          )}
        </section>
        <section className="rounded-lg border border-border bg-muted/30 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Server className="h-4 w-4 text-primary" /> Incomplete requests are handled explicitly
          </div>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The calculator does not invent required facts or silently use demonstration defaults. An
            incomplete request returns the exact missing inputs and a short list of follow-up
            questions. The AI client can ask for those facts and call the tool again. Streamable
            HTTP clients should send <code>Accept: application/json, text/event-stream</code> and
            retain the session identifier returned during initialization. Parent PLUS aggregate
            usage and remaining eligibility remain school-side checks.
          </p>
        </section>
        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Good fit</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>
                <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
                Staff scenario intake and explanation
              </li>
              <li>
                <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
                Fixture replay and implementation comparison
              </li>
              <li>
                <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
                Plain-language walkthroughs of modeled results
              </li>
              <li>
                <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
                Compare two complete scenarios with <code>compare_sor</code>
              </li>
              <li>
                <CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />
                Run an institution-specific projection with <code>advanced_student_estimate</code>
              </li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-semibold">Still requires school review</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              <li>NSLDS aggregate and lifetime eligibility</li>
              <li>COD origination and disbursement processing</li>
              <li>R2T4, traditional proration, and institution-specific policy</li>
              <li>Final award, posting, refund, and compliance decisions</li>
            </ul>
          </div>
        </section>
        <p className="text-sm leading-6 text-muted-foreground">
          Project SOR is independent decision support. It is not an official Department of Education
          publication, Department endorsement, or a substitute for current federal guidance and
          school review.
        </p>
        <Link
          to="/student"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
        >
          Student estimate <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
