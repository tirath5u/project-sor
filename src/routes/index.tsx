import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { RotateCcw, Calculator, BookOpen, FileSpreadsheet } from "lucide-react";
import {
  calculateSOR,
  defaultInputs,
  TERM_LABELS,
  type SORInputs,
  type TermKey,
  type CalType,
} from "@/lib/sor";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { Section } from "@/components/sor/Section";
import { NumberField } from "@/components/sor/NumberField";
import { StatusChip } from "@/components/sor/StatusChip";
import { ResultsPanel } from "@/components/sor/ResultsPanel";
import { StepWalkthrough } from "@/components/sor/StepWalkthrough";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
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
  const [activeScenario, setActiveScenario] = React.useState<string>("");
  const results = React.useMemo(() => calculateSOR(inputs), [inputs]);

  const update = (patch: Partial<SORInputs>) => {
    setActiveScenario("");
    setInputs((p) => ({ ...p, ...patch }));
  };
  const updateTerm = (key: TermKey, patch: Partial<SORInputs["terms"][TermKey]>) => {
    setActiveScenario("");
    setInputs((p) => ({ ...p, terms: { ...p.terms, [key]: { ...p.terms[key], ...patch } } }));
  };

  const loadScenario = (s: Scenario) => {
    setInputs(s.build());
    setActiveScenario(s.id);
  };

  // Sync number-of-standard-terms → enabled flags
  React.useEffect(() => {
    setInputs((p) => {
      const next = { ...p, terms: { ...p.terms } };
      let changed = false;
      STANDARD_KEYS.forEach((k, idx) => {
        const shouldBeOn = idx < p.numStandardTerms;
        if (next.terms[k].enabled !== shouldBeOn) {
          next.terms[k] = { ...next.terms[k], enabled: shouldBeOn };
          changed = true;
        }
      });
      return changed ? next : p;
    });
  }, [inputs.numStandardTerms]);

  // Sync optional toggles → term.enabled
  React.useEffect(() => {
    setInputs((p) => {
      const next = { ...p, terms: { ...p.terms } };
      let changed = false;
      OPTIONAL_KEYS.forEach(({ key, toggle }) => {
        const want = Boolean(p[toggle]);
        if (next.terms[key].enabled !== want) {
          next.terms[key] = { ...next.terms[key], enabled: want };
          changed = true;
        }
      });
      return changed ? next : p;
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

  const scenarioGroups = Array.from(new Set(SCENARIOS.map((s) => s.group)));
  const currentScenario = SCENARIOS.find((s) => s.id === activeScenario);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }}>
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
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
                Live walkthrough of the FSA three-step calculation for product, engineering, and QA.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden md:block">
              <Select
                value={activeScenario}
                onValueChange={(id) => {
                  const s = SCENARIOS.find((x) => x.id === id);
                  if (s) loadScenario(s);
                }}
              >
                <SelectTrigger className="h-9 w-[280px] rounded-lg">
                  <FileSpreadsheet className="h-4 w-4" />
                  <SelectValue placeholder="Load a scenario…" />
                </SelectTrigger>
                <SelectContent>
                  {scenarioGroups.map((g) => (
                    <SelectGroup key={g}>
                      <SelectLabel>{g}</SelectLabel>
                      {SCENARIOS.filter((s) => s.group === g).map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.title}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setInputs(defaultInputs());
                setActiveScenario("");
              }}
              className="rounded-lg"
            >
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Reset</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero strip */}
      <section
        className="border-b border-border/60 px-4 py-6 text-primary-foreground sm:px-6"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="mx-auto max-w-7xl">
          <h2 className="text-lg font-semibold leading-tight sm:text-2xl">
            Less-than-full-time loan-limit reductions, calculated live.
          </h2>
          <p className="mt-1.5 max-w-2xl text-xs opacity-90 sm:text-sm">
            A walk-through of the Department of Education's three-step Schedule of Reductions
            (SOR) process: initial maximum → SOR % → per-term disbursement. Built so product,
            engineering, and QA can see every input, formula, and result in one place.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              SOR % rounded to nearest whole point
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              Net Paid = Paid − Refunds
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              Sub → Unsub shift (combined cap)
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              Half-time gate
            </span>
          </div>
        </div>
      </section>

      {/* Mobile scenario picker */}
      <div className="border-b border-border/60 bg-background/70 px-4 py-3 md:hidden">
        <Select
          value={activeScenario}
          onValueChange={(id) => {
            const s = SCENARIOS.find((x) => x.id === id);
            if (s) loadScenario(s);
          }}
        >
          <SelectTrigger className="h-10 w-full rounded-lg">
            <FileSpreadsheet className="h-4 w-4" />
            <SelectValue placeholder="Load a scenario…" />
          </SelectTrigger>
          <SelectContent>
            {scenarioGroups.map((g) => (
              <SelectGroup key={g}>
                <SelectLabel>{g}</SelectLabel>
                {SCENARIOS.filter((s) => s.group === g).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {currentScenario ? (
          <div className="mb-5 rounded-2xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <BookOpen className="h-3.5 w-3.5" />
              Scenario loaded · {currentScenario.group}
            </div>
            <div className="text-sm font-semibold text-foreground">{currentScenario.title}</div>
            <p className="mt-1 text-xs text-muted-foreground">{currentScenario.summary}</p>
            {currentScenario.expected ? (
              <p className="mt-2 rounded-md bg-background/70 px-3 py-2 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">Expected:</span>{" "}
                {currentScenario.expected}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
          {/* LEFT — Inputs */}
          <div className="space-y-5">
            {/* Section A */}
            <Section
              letter="A"
              title="Academic Calendar Configuration"
              description="Defines the loan period and which terms apply."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Academic Calendar</Label>
                  <Select
                    value={String(inputs.calType)}
                    onValueChange={(v) => update({ calType: Number(v) as CalType })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Academic Calendar 1 — Standard term, SAY</SelectItem>
                      <SelectItem value="2">Academic Calendar 2 — Standard term, BBAY</SelectItem>
                      <SelectItem value="3">Academic Calendar 3 — Non-standard, terms</SelectItem>
                      <SelectItem value="4">Academic Calendar 4 — Non-standard, non-terms</SelectItem>
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
                        <span className="text-sm font-medium">{n}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>

                <NumberField
                  className="sm:col-span-2"
                  label="AY Full-Time Credit Hours (Step 2 denominator)"
                  value={inputs.ayFtCredits}
                  step={0.5}
                  onChange={(v) => update({ ayFtCredits: v })}
                  hint="Must match the program's full-time AY credit definition."
                />
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
              title="Initial Maximum Annual Loan Limit"
              description="Lower of statutory limit and student need, by loan type."
            >
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {[
                  {
                    title: "Subsidized",
                    stat: inputs.subStatutory,
                    need: inputs.subNeed,
                    setStat: (v: number) => update({ subStatutory: v }),
                    setNeed: (v: number) => update({ subNeed: v }),
                  },
                  {
                    title: "Unsubsidized",
                    stat: inputs.unsubStatutory,
                    need: inputs.unsubNeed,
                    setStat: (v: number) => update({ unsubStatutory: v }),
                    setNeed: (v: number) => update({ unsubNeed: v }),
                  },
                ].map((row) => (
                  <div
                    key={row.title}
                    className="rounded-xl border border-border bg-background/60 p-4"
                  >
                    <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">
                      {row.title}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <NumberField
                        label="Statutory Limit"
                        prefix="$"
                        value={row.stat}
                        onChange={row.setStat}
                      />
                      <NumberField
                        label="Student Need"
                        prefix="$"
                        value={row.need}
                        onChange={row.setNeed}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-primary/5 px-3 py-2">
                      <span className="text-xs font-medium text-muted-foreground">
                        Initial Max
                      </span>
                      <span className="text-sm font-semibold text-primary tabular-nums">
                        ${Math.min(row.stat, row.need).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Section C */}
            <Section
              letter="C"
              title="Term-by-Term Enrollment"
              description="Half-time cliff = FT ÷ 2. Below half-time → ineligible (no disbursement)."
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
                            label="FT credits (term)"
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
                          <div className="hidden sm:block" />
                          <NumberField
                            label="Already paid (Sub)"
                            prefix="$"
                            value={t.paidSub}
                            onChange={(v) => updateTerm(key, { paidSub: v })}
                          />
                          <NumberField
                            label="Refund (Sub)"
                            prefix="$"
                            value={t.refundSub}
                            onChange={(v) => updateTerm(key, { refundSub: v })}
                            hint="Reduces net paid"
                          />
                          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Net Paid (Sub)
                            </div>
                            <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                              ${Math.max(0, (t.paidSub || 0) - (t.refundSub || 0)).toLocaleString()}
                            </div>
                          </div>
                          <NumberField
                            label="Already paid (Unsub)"
                            prefix="$"
                            value={t.paidUnsub}
                            onChange={(v) => updateTerm(key, { paidUnsub: v })}
                          />
                          <NumberField
                            label="Refund (Unsub)"
                            prefix="$"
                            value={t.refundUnsub}
                            onChange={(v) => updateTerm(key, { refundUnsub: v })}
                            hint="Reduces net paid"
                          />
                          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Net Paid (Unsub)
                            </div>
                            <div className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                              ${Math.max(0, (t.paidUnsub || 0) - (t.refundUnsub || 0)).toLocaleString()}
                            </div>
                          </div>
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

            {/* Section D — distribution method */}
            <Section
              letter="D"
              title="Disbursement Method"
              description="Equal: annual ÷ N terms · Proportional: term enrolled ÷ total enrolled × annual."
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
                    <div className="text-sm font-medium">Equal disbursements</div>
                    <div className="text-[11px] text-muted-foreground">
                      Even split; rounding remainder applied so total equals annual exactly.
                    </div>
                  </div>
                </Label>
                <Label
                  htmlFor="dist-prop"
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-background p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                >
                  <RadioGroupItem id="dist-prop" value="proportional" className="mt-0.5" />
                  <div>
                    <div className="text-sm font-medium">Proportional distribution</div>
                    <div className="text-[11px] text-muted-foreground">
                      Each term's share = enrolled credits ÷ total enrolled (proportions not
                      rounded; dollars rounded to sum exactly).
                    </div>
                  </div>
                </Label>
              </RadioGroup>
            </Section>

            {/* Logic walkthrough — placed under inputs on desktop too for completeness */}
            <StepWalkthrough inputs={inputs} results={results} />
          </div>

          {/* RIGHT — Sticky results */}
          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <ResultsPanel results={results} />
          </aside>
        </div>

        <footer className="mt-10 border-t border-border/60 pt-6 text-center text-[11px] text-muted-foreground">
          Modeling tool only · Verify against the FSA Handbook & 34 CFR 685.203 before
          disbursement.
        </footer>
      </main>
    </div>
  );
}
