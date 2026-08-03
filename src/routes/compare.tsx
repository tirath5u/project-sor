import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftRight, Calculator, Clipboard, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultInputs, type SORInputs } from "@/lib/sor";

export const Route = createFileRoute("/compare")({ component: ComparePage });

type ComparisonResponse = {
  comparison?: { fields?: Record<string, { left: number | null; right: number | null; delta: number | null }>; warningIdsAdded?: string[]; warningIdsRemoved?: string[] };
  left?: { authoritative: boolean; status: string; data?: { reducedSub: number; reducedUnsub: number; reducedGradPlus: number } };
  right?: { authoritative: boolean; status: string; data?: { reducedSub: number; reducedUnsub: number; reducedGradPlus: number } };
  meta?: { releaseId?: string };
};

const STORAGE_KEY = "project-sor-phase-b-comparison";

function buildScenario(fallCredits: number, springCredits: number, method: SORInputs["distributionModel"]): SORInputs {
  const base = defaultInputs();
  return {
    ...base,
    awardYear: "2026-27",
    distributionModel: method,
    numStandardTerms: 2,
    ayFtCredits: 24,
    annualNeed: 5500,
    terms: {
      ...base.terms,
      term1: { ...base.terms.term1, enabled: true, ftCredits: 12, enrolledCredits: fallCredits },
      term2: { ...base.terms.term2, enabled: true, ftCredits: 12, enrolledCredits: springCredits },
      term3: { ...base.terms.term3, enabled: false, enrolledCredits: 0 },
      term4: { ...base.terms.term4, enabled: false, enrolledCredits: 0 },
      summer1: { ...base.terms.summer1, enabled: false, enrolledCredits: 0 },
      summer2: { ...base.terms.summer2, enabled: false, enrolledCredits: 0 },
      winter1: { ...base.terms.winter1, enabled: false, enrolledCredits: 0 },
      winter2: { ...base.terms.winter2, enabled: false, enrolledCredits: 0 },
    },
  };
}

function ComparePage() {
  const [form, setForm] = React.useState({ leftFall: "12", leftSpring: "9", leftMethod: "equal", rightFall: "12", rightSpring: "12", rightMethod: "equal" });
  const [result, setResult] = React.useState<ComparisonResponse | null>(null);
  const [saved, setSaved] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const money = (value: number | null | undefined) => value === null || value === undefined ? "Not available" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

  async function compare(event: React.FormEvent) {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const response = await fetch("/api/public/v2/compare", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ left: buildScenario(Number(form.leftFall), Number(form.leftSpring), form.leftMethod as SORInputs["distributionModel"]), right: buildScenario(Number(form.rightFall), Number(form.rightSpring), form.rightMethod as SORInputs["distributionModel"]) }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "The comparison could not be completed.");
      setResult(body);
    } catch (err) { setError(err instanceof Error ? err.message : "The comparison could not be completed."); }
    finally { setLoading(false); }
  }

  function save() { if (result) { localStorage.setItem(STORAGE_KEY, JSON.stringify({ form, result })); setSaved(true); } }
  function load() { const raw = localStorage.getItem(STORAGE_KEY); if (!raw) return; const value = JSON.parse(raw) as { form: typeof form; result: ComparisonResponse }; setForm(value.form); setResult(value.result); setSaved(true); }
  function clearSaved() { localStorage.removeItem(STORAGE_KEY); setSaved(false); }

  const total = (side: "left" | "right") => {
    const data = result?.[side]?.data;
    return data ? data.reducedSub + data.reducedUnsub + data.reducedGradPlus : null;
  };

  return <main className="min-h-screen bg-background text-foreground">
    <header className="border-b border-border/70 bg-background"><div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6"><Link to="/" className="flex items-center gap-2 text-sm font-semibold"><Calculator className="h-4 w-4 text-primary" /> Project SOR</Link><nav className="flex items-center gap-2"><Button asChild variant="ghost" size="sm"><Link to="/">Calculator</Link></Button><Button asChild variant="ghost" size="sm"><Link to="/student">Student estimate</Link></Button></nav></div></header>
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6"><div className="max-w-3xl space-y-3"><p className="text-sm font-medium text-primary">Phase B online tool</p><h1 className="text-3xl font-semibold tracking-normal">Compare two SOR scenarios</h1><p className="text-base leading-7 text-muted-foreground">Run both scenarios independently through the shared engine and see what changed. The service does not store your inputs. Saved comparison state stays only in this browser.</p></div>
      <form onSubmit={compare} className="grid gap-5 lg:grid-cols-2"><ScenarioCard title="Scenario A" prefix="left" values={form} set={set} /><ScenarioCard title="Scenario B" prefix="right" values={form} set={set} /><div className="flex flex-wrap gap-2 lg:col-span-2"><Button type="submit" disabled={loading}>{loading ? "Comparing..." : "Compare scenarios"}<ArrowLeftRight className="h-4 w-4" /></Button><Button type="button" variant="outline" onClick={save} disabled={!result}><Save className="h-4 w-4" /> Save in this browser</Button><Button type="button" variant="ghost" onClick={load}><Clipboard className="h-4 w-4" /> Load saved</Button><Button type="button" variant="ghost" onClick={clearSaved} disabled={!saved}><Trash2 className="h-4 w-4" /> Clear saved</Button></div></form>
      {error ? <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div> : null}
      {result ? <section className="rounded-lg border border-border bg-card p-5"><div className="mb-5 flex items-center justify-between gap-4"><div><p className="text-sm font-medium text-primary">Comparison result</p><p className="text-xs text-muted-foreground">Release {result.meta?.releaseId || "current"}</p></div><span className="text-xs text-muted-foreground">No payload retention</span></div><div className="grid gap-4 md:grid-cols-3"><Metric label="Scenario A total" value={money(total("left"))} /><Metric label="Scenario B total" value={money(total("right"))} /><Metric label="Total change" value={money(result.comparison?.fields?.reducedSub?.delta === null || result.comparison?.fields?.reducedSub?.delta === undefined ? null : (result.comparison.fields.reducedSub.delta + (result.comparison.fields.reducedUnsub?.delta || 0) + (result.comparison.fields.reducedGradPlus?.delta || 0)))} /></div><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[520px] text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="px-2 py-2">Output</th><th className="px-2 py-2 text-right">Scenario A</th><th className="px-2 py-2 text-right">Scenario B</th><th className="px-2 py-2 text-right">Change</th></tr></thead><tbody>{Object.entries(result.comparison?.fields || {}).map(([key, value]) => <tr key={key} className="border-b border-border/50"><td className="px-2 py-2 font-medium">{key}</td><td className="px-2 py-2 text-right">{money(value.left)}</td><td className="px-2 py-2 text-right">{money(value.right)}</td><td className="px-2 py-2 text-right">{money(value.delta)}</td></tr>)}</tbody></table></div><div className="mt-5 grid gap-3 text-sm md:grid-cols-2"><div><p className="font-medium">Warnings added</p><p className="mt-1 text-muted-foreground">{result.comparison?.warningIdsAdded?.join(", ") || "None"}</p></div><div><p className="font-medium">Warnings removed</p><p className="mt-1 text-muted-foreground">{result.comparison?.warningIdsRemoved?.join(", ") || "None"}</p></div></div></section> : null}
    </div></main>;
}

function ScenarioCard({ title, prefix, values, set }: { title: string; prefix: "left" | "right"; values: Record<string, string>; set: (key: string, value: string) => void }) {
  const fall = `${prefix}Fall` as keyof typeof values; const spring = `${prefix}Spring` as keyof typeof values; const method = `${prefix}Method` as keyof typeof values;
  return <section className="space-y-4 rounded-lg border border-border bg-card p-5"><h2 className="text-lg font-semibold">{title}</h2><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor={String(fall)}>Fall credits</Label><Input id={String(fall)} type="number" min="0" max="60" step="0.5" value={values[String(fall)]} onChange={(event) => set(fall, event.target.value)} /></div><div className="space-y-2"><Label htmlFor={String(spring)}>Spring credits</Label><Input id={String(spring)} type="number" min="0" max="60" step="0.5" value={values[String(spring)]} onChange={(event) => set(spring, event.target.value)} /></div></div><div className="space-y-2"><Label>Distribution method</Label><Select value={values[String(method)]} onValueChange={(value) => set(method, value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="equal">Equal</SelectItem><SelectItem value="proportional">Proportional</SelectItem></SelectContent></Select></div></section>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border/70 bg-muted/20 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>; }
