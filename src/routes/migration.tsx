import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, Calculator, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/migration")({ component: MigrationPage });

type MigrationResponse = {
  comparison?: {
    fixture?: { id: string; description: string; sourceRefs: string[] };
    v55?: { engineVersion: string; metrics: Record<string, number> };
    v56?: { engineVersion: string; metrics: Record<string, number | null>; authoritative: boolean };
    changes?: Record<string, { v55: number; v56: number | null; delta: number | null }>;
    changedMetrics?: string[];
  };
  meta?: { releaseId?: string };
};

function money(value: number | null | undefined) {
  return value === null || value === undefined
    ? "Not available"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function MigrationPage() {
  const [fixtureId, setFixtureId] = React.useState("fixture-v19-007");
  const [result, setResult] = React.useState<MigrationResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  async function compare(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/public/v2/migration-compare", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ fixtureId }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "The migration comparison could not be completed.");
      setResult(body);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The migration comparison could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  const comparison = result?.comparison;
  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border/70 bg-background"><div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link to="/" className="flex items-center gap-2 text-sm font-semibold"><Calculator className="h-4 w-4 text-primary" /> Project SOR</Link><nav className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link to="/">Calculator</Link></Button><Button asChild variant="ghost" size="sm"><Link to="/compare">Compare scenarios</Link></Button></nav></div></header>
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <section className="max-w-3xl space-y-3"><p className="text-sm font-medium text-primary">Migration review</p><h1 className="text-3xl font-semibold tracking-normal">Compare approved V55 and V56 results</h1><p className="text-base leading-7 text-muted-foreground">Review a stored, approved V55 baseline against the current V56 engine. This is a migration aid for known fixtures, not a general historical calculator.</p></section>
      <form onSubmit={compare} className="max-w-xl space-y-4 rounded-lg border border-border bg-card p-5"><label className="block text-sm font-medium" htmlFor="fixture">Approved migration fixture</label><Select value={fixtureId} onValueChange={setFixtureId}><SelectTrigger id="fixture"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixture-v19-007">Grad PLUS SOR reduction, Spring 5 credits</SelectItem></SelectContent></Select><Button type="submit" disabled={loading}>{loading ? "Comparing..." : "Compare V55 and V56"}<ArrowLeftRight className="h-4 w-4" /></Button></form>
      {error ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
      {comparison ? <section className="space-y-5 rounded-lg border border-border bg-card p-5"><div><p className="text-sm font-medium text-primary">Approved fixture comparison</p><p className="mt-1 text-sm text-muted-foreground">{comparison.fixture?.description}</p><p className="mt-2 text-xs text-muted-foreground">Release {result?.meta?.releaseId || "current"} · V56 authoritative: {comparison.v56?.authoritative ? "Yes" : "No"}</p></div><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="px-2 py-2">Output</th><th className="px-2 py-2 text-right">V55</th><th className="px-2 py-2 text-right">V56</th><th className="px-2 py-2 text-right">Change</th></tr></thead><tbody>{Object.entries(comparison.changes || {}).map(([key, value]) => <tr key={key} className="border-b border-border/50"><td className="px-2 py-2 font-medium">{key}</td><td className="px-2 py-2 text-right">{money(value.v55)}</td><td className="px-2 py-2 text-right">{money(value.v56)}</td><td className="px-2 py-2 text-right">{money(value.delta)}</td></tr>)}</tbody></table></div><p className="text-sm text-muted-foreground">Changed outputs: {comparison.changedMetrics?.join(", ") || "None"}. Source references: {comparison.fixture?.sourceRefs.join(", ") || "Not listed"}.</p><a className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline" href="https://github.com/tirath5u/project-sor" target="_blank" rel="noreferrer">View public source <ExternalLink className="h-4 w-4" /></a></section> : null}
    </div>
  </main>;
}
