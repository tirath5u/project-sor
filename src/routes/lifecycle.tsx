/**
 * /lifecycle — 4-year academic-career tracker. Each row = an AY; columns =
 * up to 5 terms. Tracks cumulative Sub/Unsub against OBBBA aggregate caps.
 * Persisted in localStorage (browser-only — SSR-safe via lazy load).
 */
import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Trash2, Plus, GraduationCap, ArrowLeft } from "lucide-react";
import { fmtCurrency } from "@/lib/sor";
import { aggregateCap } from "@/lib/loanLimits";
import { Button } from "@/components/ui/button";
import { NumberField } from "@/components/sor/NumberField";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/lifecycle")({
  head: () => ({
    meta: [
      { title: "Aid Lifecycle Tracker - SOR" },
      {
        name: "description",
        content:
          "Track Title IV Sub/Unsub disbursements across a student's 4-year academic career against OBBBA aggregate caps.",
      },
      { property: "og:title", content: "Aid Lifecycle Tracker - SOR" },
      {
        property: "og:description",
        content:
          "4-year cumulative aid tracker with OBBBA aggregate cap monitoring.",
      },
    ],
  }),
  component: LifecyclePage,
});

type Level = "undergrad_dependent" | "undergrad_independent" | "graduate";

interface AYRow {
  id: string;
  label: string;
  sub: number;
  unsub: number;
}

const STORAGE_KEY = "sor-lifecycle-v1";

function loadRows(): AYRow[] {
  if (typeof window === "undefined") return defaultRows();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultRows();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((r) => r && typeof r === "object")) {
      return parsed as AYRow[];
    }
  } catch {
    // ignore
  }
  return defaultRows();
}

function defaultRows(): AYRow[] {
  return [
    { id: "ay1", label: "Year 1 (2026-27)", sub: 0, unsub: 0 },
    { id: "ay2", label: "Year 2 (2027-28)", sub: 0, unsub: 0 },
    { id: "ay3", label: "Year 3 (2028-29)", sub: 0, unsub: 0 },
    { id: "ay4", label: "Year 4 (2029-30)", sub: 0, unsub: 0 },
  ];
}

function LifecyclePage() {
  const [level, setLevel] = React.useState<Level>("undergrad_dependent");
  const [rows, setRows] = React.useState<AYRow[]>(() => defaultRows());

  // Hydrate from localStorage on mount (avoid SSR mismatch)
  React.useEffect(() => {
    setRows(loadRows());
    try {
      const lvl = window.localStorage.getItem(STORAGE_KEY + ":level");
      if (lvl === "undergrad_dependent" || lvl === "undergrad_independent" || lvl === "graduate") {
        setLevel(lvl);
      }
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
      window.localStorage.setItem(STORAGE_KEY + ":level", level);
    } catch {
      // ignore
    }
  }, [rows, level]);

  const cap = aggregateCap(level);
  const totalSub = rows.reduce((s, r) => s + (r.sub || 0), 0);
  const totalUnsub = rows.reduce((s, r) => s + (r.unsub || 0), 0);
  const totalAll = totalSub + totalUnsub;
  const subPct = cap.sub > 0 ? Math.min(1, totalSub / cap.sub) : 0;
  const totalPct = cap.total > 0 ? Math.min(1, totalAll / cap.total) : 0;

  const update = (id: string, patch: Partial<AYRow>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const add = () =>
    setRows((rs) => [
      ...rs,
      {
        id: "ay" + (rs.length + 1) + "_" + Date.now(),
        label: `Year ${rs.length + 1}`,
        sub: 0,
        unsub: 0,
      },
    ]);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }}>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition hover:text-foreground"
              aria-label="Back to calculator"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <h1 className="text-base font-semibold text-foreground sm:text-lg">
                Aid Lifecycle Tracker
              </h1>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Cumulative Sub/Unsub vs OBBBA aggregate caps · saved locally.
              </p>
              <p className="text-[10px] italic text-muted-foreground/80 sm:text-[11px]">
                Built by{" "}
                <a
                  href="https://www.linkedin.com/in/tirath-c-7228b814/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium not-italic text-credit-maroon underline-offset-2 hover:underline"
                >
                  Tirath Chhatriwala
                </a>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="hidden text-xs sm:block">Career level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger className="h-9 w-[230px] rounded-lg">
                <GraduationCap className="h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="undergrad_dependent">Undergraduate · Dependent</SelectItem>
                <SelectItem value="undergrad_independent">Undergraduate · Independent</SelectItem>
                <SelectItem value="graduate">Graduate / Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <CapBar
            label="Subsidized cumulative"
            used={totalSub}
            cap={cap.sub}
            pct={subPct}
          />
          <CapBar
            label="Total (Sub + Unsub) cumulative"
            used={totalAll}
            cap={cap.total}
            pct={totalPct}
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">Academic Years</h2>
            <Button onClick={add} size="sm" className="rounded-lg">
              <Plus className="h-4 w-4" /> Add year
            </Button>
          </div>
          <div className="divide-y divide-border">
            {rows.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-[1fr_140px_140px_auto] sm:items-end"
              >
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Label</Label>
                  <input
                    value={r.label}
                    onChange={(e) => update(r.id, { label: e.target.value })}
                    className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <NumberField
                  label="Sub disbursed"
                  prefix="$"
                  value={r.sub}
                  onChange={(v) => update(r.id, { sub: v })}
                />
                <NumberField
                  label="Unsub disbursed"
                  prefix="$"
                  value={r.unsub}
                  onChange={(v) => update(r.id, { unsub: v })}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove(r.id)}
                  aria-label="Remove year"
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-border bg-primary/5 px-4 py-3 text-sm font-semibold tabular-nums">
            <div>
              Total Sub:{" "}
              <span className="text-primary">{fmtCurrency(totalSub)}</span>
            </div>
            <div>
              Total Unsub:{" "}
              <span className="text-primary">{fmtCurrency(totalUnsub)}</span>
            </div>
          </div>
        </div>

        <p className="rounded-xl border border-border bg-card px-4 py-3 text-[11px] text-muted-foreground">
          Aggregate caps per OBBBA: Undergraduate dependent ${cap.sub.toLocaleString()} Sub /{" "}
          ${cap.total.toLocaleString()} total. Tracker is informational only;
          confirm against COD before disbursing.
        </p>
      </main>
    </div>
  );
}

function CapBar({
  label,
  used,
  cap,
  pct,
}: {
  label: string;
  used: number;
  cap: number;
  pct: number;
}) {
  const danger = pct >= 1;
  const warn = pct >= 0.85 && !danger;
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span
          className={`font-semibold tabular-nums ${
            danger ? "text-destructive" : warn ? "text-warning-foreground" : "text-primary"
          }`}
        >
          {fmtCurrency(used)} / {fmtCurrency(cap)}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full transition-all ${
            danger ? "bg-destructive" : warn ? "bg-accent" : "bg-primary"
          }`}
          style={{ width: `${Math.round(pct * 100)}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">
        {Math.round(pct * 100)}% of cap
      </div>
    </div>
  );
}
