import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Calculator, Info, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/student")({ component: StudentEstimatePage });

type Result = {
  status: string;
  estimate?: { sorPercent: number; estimatedAnnualSub: number; estimatedAnnualUnsub: number; estimatedAnnualTotal: number };
  warnings?: string[];
  disclaimer?: string;
};

function StudentEstimatePage() {
  const [form, setForm] = React.useState({ awardYear: "2026-27", programLevel: "undergraduate", gradeLevel: "g1", dependency: "dependent", fallCredits: "12", springCredits: "9", fullTimeCreditsPerTerm: "12" });
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError(null); setResult(null);
    try {
      const response = await fetch("/api/public/v2/student-estimate", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ ...form, fallCredits: Number(form.fallCredits), springCredits: Number(form.springCredits), fullTimeCreditsPerTerm: Number(form.fullTimeCreditsPerTerm) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "The estimate could not be completed.");
      setResult(body);
    } catch (err) { setError(err instanceof Error ? err.message : "The estimate could not be completed."); }
    finally { setLoading(false); }
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border/70 bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 text-sm font-semibold"><Calculator className="h-4 w-4 text-primary" /> Project SOR</Link>
        <div className="flex items-center gap-2"><Link to="/student/advanced" className="text-sm text-muted-foreground hover:text-foreground">Advanced estimate</Link><Link to="/" className="text-sm text-muted-foreground hover:text-foreground">Staff calculator</Link></div>
      </div>
    </header>
    <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-8 space-y-3"><p className="text-sm font-medium text-primary">Student estimate</p><h1 className="text-3xl font-semibold tracking-normal">Estimate your Direct Loan reduction</h1><p className="max-w-2xl text-base leading-7 text-muted-foreground">Use this estimate for a standard Fall and Spring academic year. Your school makes the final eligibility and disbursement decision.</p></div>
        <form onSubmit={submit} className="space-y-6 rounded-lg border border-border bg-card p-5 shadow-sm">
          <p className="text-sm leading-6 text-muted-foreground"><span className="font-semibold text-foreground">*</span> Required. Program level identifies the undergraduate or graduate category; grade level selects the applicable loan-limit tier.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Award Year <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">Required</span></Label><Select value={form.awardYear} onValueChange={(value) => set("awardYear", value)}><SelectTrigger aria-required="true"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="2026-27">2026-27</SelectItem><SelectItem value="2025-26">2025-26</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Program level <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">Required</span></Label><Select value={form.programLevel} onValueChange={(value) => set("programLevel", value)}><SelectTrigger aria-required="true"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="undergraduate">Undergraduate</SelectItem><SelectItem value="graduate">Graduate</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Grade level <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">Required</span></Label><Select value={form.gradeLevel} onValueChange={(value) => set("gradeLevel", value)}><SelectTrigger aria-required="true"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="g0">First year, no prior postsecondary</SelectItem><SelectItem value="g1">First year</SelectItem><SelectItem value="g2">Second year</SelectItem><SelectItem value="g3">Third year</SelectItem><SelectItem value="g4">Fourth year</SelectItem><SelectItem value="g8">Graduate</SelectItem><SelectItem value="g10">Professional</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>Dependency status <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">Required</span></Label><Select value={form.dependency} onValueChange={(value) => set("dependency", value)}><SelectTrigger aria-required="true"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dependent">Dependent undergraduate</SelectItem><SelectItem value="independent">Independent</SelectItem></SelectContent></Select></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label htmlFor="fall">Fall credits <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">Required</span></Label><Input id="fall" required type="number" min="0" step="0.5" value={form.fallCredits} onChange={(e) => set("fallCredits", e.target.value)} /></div><div className="space-y-2"><Label htmlFor="spring">Spring credits <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">Required</span></Label><Input id="spring" required type="number" min="0" step="0.5" value={form.springCredits} onChange={(e) => set("springCredits", e.target.value)} /></div><div className="space-y-2"><Label htmlFor="ft">Full-time credits per term <span aria-hidden="true" className="text-destructive">*</span><span className="sr-only">Required</span></Label><Input id="ft" required type="number" min="0.5" step="0.5" value={form.fullTimeCreditsPerTerm} onChange={(e) => set("fullTimeCreditsPerTerm", e.target.value)} /><p className="text-xs text-muted-foreground">Use your school's published value.</p></div></div>
          {error ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
          <Button type="submit" disabled={loading}>{loading ? "Calculating..." : "Calculate estimate"}<ArrowRight className="h-4 w-4" /></Button>
        </form>
        {result?.estimate ? <section className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-5"><p className="text-sm font-medium text-primary">Estimated SOR result</p><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">SOR percentage</p><p className="text-2xl font-semibold">{Math.round(result.estimate.sorPercent * 100)}%</p></div><div><p className="text-xs text-muted-foreground">Estimated annual maximum</p><p className="text-2xl font-semibold">{money(result.estimate.estimatedAnnualTotal)}</p></div><div><p className="text-xs text-muted-foreground">Sub / Unsub</p><p className="text-sm font-semibold">{money(result.estimate.estimatedAnnualSub)} / {money(result.estimate.estimatedAnnualUnsub)}</p></div></div><p className="mt-4 text-sm leading-6 text-muted-foreground">{result.disclaimer}</p>{result.warnings?.length ? <div className="mt-4 space-y-1 text-sm text-muted-foreground">{result.warnings.map((warning) => <p key={warning}>• {warning}</p>)}</div> : null}</section> : null}
      </section>
      <aside className="space-y-4"><div className="rounded-lg border border-border bg-muted/30 p-5"><div className="flex items-center gap-2 text-sm font-semibold"><Info className="h-4 w-4 text-primary" /> What this estimate does</div><p className="mt-3 text-sm leading-6 text-muted-foreground">It applies the SOR percentage to an estimated annual Direct Loan maximum for a standard Fall and Spring scenario.</p></div><div className="rounded-lg border border-border bg-card p-5"><div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" /> Important limits</div><ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground"><li>It does not determine your final award.</li><li>It does not check COA, other aid, SAP, aggregate limits, or NSLDS.</li><li>Single-term, summer, module, withdrawal, and child-term cases need school review.</li><li>No student identifiers are collected or stored.</li></ul></div></aside>
    </div>
  </main>;
}
