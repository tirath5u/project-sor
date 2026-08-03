import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, CheckCircle2, ExternalLink, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/mcp-guide")({
  head: () => ({
    meta: [
      { title: "Project SOR MCP Guide" },
      { name: "description", content: "Connect an MCP client to the source-backed Project SOR calculation engine." },
    ],
  }),
  component: McpGuidePage,
});

function McpGuidePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2 text-sm font-semibold"><Bot className="h-4 w-4 text-primary" /> Project SOR</Link>
          <div className="flex gap-2"><Button asChild variant="ghost" size="sm"><Link to="/">Calculator</Link></Button><Button asChild variant="outline" size="sm"><Link to="/api-docs">API docs</Link></Button></div>
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <section className="max-w-3xl space-y-4">
          <p className="text-sm font-medium text-primary">Remote MCP</p>
          <h1 className="text-3xl font-semibold tracking-normal sm:text-4xl">Ask an AI client to use Project SOR</h1>
          <p className="text-base leading-7 text-muted-foreground">Project SOR is a source-backed Schedule of Reductions calculation engine available through Excel, the web, a REST API, and a remote MCP server. The same tested engine supports detailed staff workflows, student-friendly estimates, AI-assisted scenario intake, and stateless scenario comparison.</p>
          <div className="flex flex-wrap gap-3"><Button asChild><a href="https://sor.myproduct.life/mcp" target="_blank" rel="noreferrer">Open MCP endpoint <ExternalLink className="h-4 w-4" /></a></Button><Button asChild variant="outline"><a href="https://github.com/tirath5u/project-sor" target="_blank" rel="noreferrer">View source <ExternalLink className="h-4 w-4" /></a></Button></div>
        </section>
        <section className="grid gap-4 md:grid-cols-3">
          {["Connect the endpoint", "Describe the scenario", "Review the result"].map((title, index) => <div key={title} className="rounded-lg border border-border bg-card p-5"><div className="mb-3 flex items-center gap-2 text-sm font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">{index + 1}</span>{title}</div><p className="text-sm leading-6 text-muted-foreground">{index === 0 ? "Add https://sor.myproduct.life/mcp as a remote MCP server in a client that supports custom MCP connections." : index === 1 ? "Include award year, program level, grade level, dependency, loan-period scope, academic-year structure, credits, need, COA, other aid, and paid history when relevant." : "The server returns gross eligibility, net display amounts, calculation stages, warnings, modeled checks, external checks, release metadata, and public citations. Phase B also supports compare_sor for two complete cases and advanced_student_estimate for institution-specific projections."}</p></div>)}
        </section>
        <section className="rounded-lg border border-border bg-muted/30 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Server className="h-4 w-4 text-primary" /> Incomplete requests are handled explicitly</div><p className="mt-3 text-sm leading-6 text-muted-foreground">The calculator does not invent required facts or silently use demonstration defaults. An incomplete request returns the exact missing inputs and a short list of follow-up questions. The AI client can ask for those facts and call the tool again. Streamable HTTP clients should send <code>Accept: application/json, text/event-stream</code> and retain the session identifier returned during initialization. Parent PLUS aggregate usage and remaining eligibility remain school-side checks.</p></section>
        <section className="grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-border bg-card p-5"><h2 className="font-semibold">Good fit</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground"><li><CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />Staff scenario intake and explanation</li><li><CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />Fixture replay and implementation comparison</li><li><CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />Plain-language walkthroughs of modeled results</li><li><CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />Compare two complete scenarios with <code>compare_sor</code></li><li><CheckCircle2 className="mr-2 inline h-4 w-4 text-primary" />Run an institution-specific projection with <code>advanced_student_estimate</code></li></ul></div><div className="rounded-lg border border-border bg-card p-5"><h2 className="font-semibold">Still requires school review</h2><ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground"><li>NSLDS aggregate and lifetime eligibility</li><li>COD origination and disbursement processing</li><li>R2T4, traditional proration, and institution-specific policy</li><li>Final award, posting, refund, and compliance decisions</li></ul></div></section>
        <p className="text-sm leading-6 text-muted-foreground">Project SOR is independent decision support. It is not an official Department of Education publication, Department endorsement, or a substitute for current federal guidance and school review.</p>
        <Link to="/student" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">Student estimate <ArrowRight className="h-4 w-4" /></Link>
      </div>
    </main>
  );
}
