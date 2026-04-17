import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { RotateCcw, Sparkles, Calculator } from "lucide-react";
import {
  calculateSOR,
  defaultInputs,
  exampleInputs,
  TERM_LABELS,
  type SORInputs,
  type TermKey,
  type CalType,
} from "@/lib/sor";
import { Section } from "@/components/sor/Section";
import { NumberField } from "@/components/sor/NumberField";
import { StatusChip } from "@/components/sor/StatusChip";
import { ResultsPanel } from "@/components/sor/ResultsPanel";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export const Route = createFileRoute("/")({
  component: SORCalculatorPage,
});

const STANDARD_KEYS: TermKey[] = ["term1", "term2", "term3", "term4"];
const OPTIONAL_KEYS: { key: TermKey; toggle: keyof SORInputs }[] = [
  { key: "summer1", toggle: "includeSummer1" },
  { key: "summer2", toggle: "includeSummer2" },
  { key: "intersession1", toggle: "includeIntersession1" },
  { key: "intersession2", toggle: "includeIntersession2" },
];

function SORCalculatorPage() {
  const [inputs, setInputs] = React.useState<SORInputs>(() => defaultInputs());
  const results = React.useMemo(() => calculateSOR(inputs), [inputs]);

  const update = (patch: Partial<SORInputs>) => setInputs((p) => ({ ...p, ...patch }));
  const updateTerm = (key: TermKey, patch: Partial<SORInputs["terms"][TermKey]>) =>
    setInputs((p) => ({ ...p, terms: { ...p.terms, [key]: { ...p.terms[key], ...patch } } }));

  // Auto enable/disable standard terms when count changes
  React.useEffect(() => {
    setInputs((p) => {
      const next = { ...p, terms: { ...p.terms } };
      STANDARD_KEYS.forEach((k, idx) => {
        const shouldBeOn = idx < p.numStandardTerms;
        if (next.terms[k].enabled !== shouldBeOn) {
          next.terms[k] = { ...next.terms[k], enabled: shouldBeOn };
        }
      });
      return next;
    });
  }, [inputs.numStandardTerms]);

  // Sync optional toggles → term.enabled
  React.useEffect(() => {
    setInputs((p) => {
      const next = { ...p, terms: { ...p.terms } };
      OPTIONAL_KEYS.forEach(({ key, toggle }) => {
        const want = Boolean(p[toggle]);
        if (next.terms[key].enabled !== want) {
          next.terms[key] = { ...next.terms[key], enabled: want };
        }
      });
      return next;
    });
  }, [
    inputs.includeSummer1,
    inputs.includeSummer2,
    inputs.includeIntersession1,
    inputs.includeIntersession2,
  ]);

  const activeTermKeys: TermKey[] = [
    ...STANDARD_KEYS.slice(0, inputs.numStandardTerms),
    ...OPTIONAL_KEYS.filter(({ toggle }) => Boolean(inputs[toggle])).map((o) => o.key),
  ];

  return (
    <div className="min-h-screen bg-background" style={{ background: "var(--gradient-subtle)" }}>
      {/* Header */}
      <header className="border-b border-border/60 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-elegant)]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-foreground sm:text-lg">
                Schedule of Reductions Calculator
              </h1>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                Title IV loan disbursement modeling · v1
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputs(exampleInputs())}
              className="rounded-lg"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden xs:inline">Load Example</span>
              <span className="xs:hidden">Example</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setInputs(defaultInputs())}
              className="rounded-lg"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden xs:inline">Reset</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          {/* Left column — inputs */}
          <div className="space-y-5">
            {/* Section A */}
            <Section
              letter="A"
              title="Academic Calendar Configuration"
              description="Set the program's academic calendar shape."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Cal Type</Label>
                  <Select
                    value={String(inputs.calType)}
                    onValueChange={(v) => update({ calType: Number(v) as CalType })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Type 1 — Standard term, SAY</SelectItem>
                      <SelectItem value="2">Type 2 — Standard term, BBAY</SelectItem>
                      <SelectItem value="3">Type 3 — Non-standard, terms</SelectItem>
                      <SelectItem value="4">Type 4 — Non-standard, non-terms</SelectItem>
                      <SelectItem value="5">Type 5 — Clock-hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Program Level</Label>
                  <Select
                    value={inputs.programLevel}
                    onValueChange={(v) =>
                      update({ programLevel: v as SORInputs["programLevel"] })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="graduate">Graduate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Summer Term Position</Label>
                  <Select
                    value={inputs.summerPosition}
                    onValueChange={(v) =>
                      update({ summerPosition: v as SORInputs["summerPosition"] })
                    }
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">N/A</SelectItem>
                      <SelectItem value="trailer">Trailer</SelectItem>
                      <SelectItem value="header">Header</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    Trailer → use prior AY limits · Header → use next AY limits.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">AY Type</Label>
                  <Select
                    value={inputs.ayType}
                    onValueChange={(v) => update({ ayType: v as SORInputs["ayType"] })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAY">SAY — Scheduled Academic Year</SelectItem>
                      <SelectItem value="BBAY1">BBAY1 — Borrower-Based, standard</SelectItem>
                      <SelectItem value="BBAY2">BBAY2 — Borrower-Based, non-std terms</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    BBAY3 (clock-hour) is out of scope for v1.
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Number of Standard Terms</Label>
                  <RadioGroup
                    value={String(inputs.numStandardTerms)}
                    onValueChange={(v) =>
                      update({ numStandardTerms: Number(v) as 2 | 3 | 4 })
                    }
                    className="grid grid-cols-3 gap-2"
                  >
                    {[2, 3, 4].map((n) => (
                      <Label
                        key={n}
                        htmlFor={`nst-${n}`}
                        className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background p-2.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                      >
                        <RadioGroupItem id={`nst-${n}`} value={String(n)} />
                        <span className="text-sm font-medium">{n} terms</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { k: "includeSummer1" as const, label: "Summer 1" },
                  { k: "includeSummer2" as const, label: "Summer 2" },
                  { k: "includeIntersession1" as const, label: "Intersession 1" },
                  { k: "includeIntersession2" as const, label: "Intersession 2" },
                ].map(({ k, label }) => (
                  <Label
                    key={k}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border bg-background px-3 py-2"
                  >
                    <span className="text-xs font-medium">{label}</span>
                    <Switch
                      checked={Boolean(inputs[k])}
                      onCheckedChange={(v) => update({ [k]: v } as Partial<SORInputs>)}
                    />
                  </Label>
                ))}
              </div>
            </Section>

            {/* Section B */}
            <Section
              letter="B"
              title="Annual Loan Baselines"
              description="Max Baseline = lower of statutory limit and student need."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                    Subsidized
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Statutory Limit"
                      prefix="$"
                      value={inputs.subStatutory}
                      onChange={(v) => update({ subStatutory: v })}
                    />
                    <NumberField
                      label="Student Need"
                      prefix="$"
                      value={inputs.subNeed}
                      onChange={(v) => update({ subNeed: v })}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Max Baseline</span>
                    <span className="text-sm font-semibold text-primary tabular-nums">
                      ${Math.min(inputs.subStatutory, inputs.subNeed).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                    Unsubsidized
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <NumberField
                      label="Statutory Limit"
                      prefix="$"
                      value={inputs.unsubStatutory}
                      onChange={(v) => update({ unsubStatutory: v })}
                    />
                    <NumberField
                      label="Student Need"
                      prefix="$"
                      value={inputs.unsubNeed}
                      onChange={(v) => update({ unsubNeed: v })}
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                    <span className="text-xs font-medium text-muted-foreground">Max Baseline</span>
                    <span className="text-sm font-semibold text-primary tabular-nums">
                      ${Math.min(inputs.unsubStatutory, inputs.unsubNeed).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Section>

            {/* Section C */}
            <Section
              letter="C"
              title="Term-by-Term Enrollment"
              description="Half-time cliff auto-calculates as FT ÷ 2."
            >
              {activeTermKeys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No terms enabled yet.</p>
              ) : (
                <div className="space-y-4">
                  {activeTermKeys.map((key) => {
                    const t = inputs.terms[key];
                    const tr = results.termResults.find((r) => r.key === key);
                    return (
                      <div
                        key={key}
                        className="rounded-xl border border-border bg-background/60 p-4"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {TERM_LABELS[key]}
                            </span>
                            {tr ? <StatusChip status={tr.status} /> : null}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Half-time @ {(t.ftCredits / 2).toFixed(1)} cr
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <NumberField
                            label="FT credits"
                            value={t.ftCredits}
                            step={0.5}
                            onChange={(v) => updateTerm(key, { ftCredits: v })}
                          />
                          <NumberField
                            label="Enrolled"
                            value={t.enrolledCredits}
                            step={0.5}
                            onChange={(v) => updateTerm(key, { enrolledCredits: v })}
                          />
                          <NumberField
                            label="Paid (Sub)"
                            prefix="$"
                            value={t.paidSub}
                            onChange={(v) => updateTerm(key, { paidSub: v })}
                          />
                          <NumberField
                            label="Paid (Unsub)"
                            prefix="$"
                            value={t.paidUnsub}
                            onChange={(v) => updateTerm(key, { paidUnsub: v })}
                          />
                          <NumberField
                            label="COA cap (Sub)"
                            prefix="$"
                            value={t.coaCapSub}
                            onChange={(v) => updateTerm(key, { coaCapSub: v })}
                            hint="0 = no cap"
                          />
                          <NumberField
                            label="COA cap (Unsub)"
                            prefix="$"
                            value={t.coaCapUnsub}
                            onChange={(v) => updateTerm(key, { coaCapUnsub: v })}
                            hint="0 = no cap"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* Section E */}
            <Section
              letter="E"
              title="Distribution Model"
              description="How remaining capacity is split across eligible terms with no prior payment."
            >
              <RadioGroup
                value={inputs.distribution}
                onValueChange={(v) =>
                  update({ distribution: v as SORInputs["distribution"] })
                }
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                <Label
                  htmlFor="dist-equal"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem id="dist-equal" value="equal" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Equal</div>
                    <div className="text-[11px] text-muted-foreground">
                      Even split; rounding remainder applied to last eligible term.
                    </div>
                  </div>
                </Label>
                <Label
                  htmlFor="dist-prop"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem id="dist-prop" value="proportional" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Proportional to credits</div>
                    <div className="text-[11px] text-muted-foreground">
                      Each term's share = enrolled credits ÷ total enrolled.
                    </div>
                  </div>
                </Label>
              </RadioGroup>
            </Section>
          </div>

          {/* Right column — results */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <ResultsPanel results={results} />
          </aside>
        </div>

        <footer className="mt-10 border-t border-border/60 pt-6 text-center text-xs text-muted-foreground">
          For modeling purposes only. Verify against the FSA Handbook and institutional policy
          before disbursement.
        </footer>
      </main>
    </div>
  );
}
