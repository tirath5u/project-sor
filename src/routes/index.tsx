import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { RotateCcw, Calculator, BookOpen, FileSpreadsheet, ListChecks } from "lucide-react";
import {
  calculateSOR,
  defaultInputs,
  TERM_LABELS,
  type SORInputs,
  type TermKey,
  type CalType,
  type ViewMode,
} from "@/lib/sor";
import {
  GRADE_LABELS,
  lookupLimits,
  isGradOrProf,
  type GradeLevel,
  type Dependency,
} from "@/lib/loanLimits";
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
import { Checkbox } from "@/components/ui/checkbox";

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

  // Auto-populate limits from grade/dependency/PLUS-denial unless overridden
  React.useEffect(() => {
    if (inputs.overrideLimits) return;
    const lim = lookupLimits(inputs.gradeLevel, inputs.dependency, inputs.parentPlusDenied);
    setInputs((p) => {
      if (
        p.subStatutory === lim.sub &&
        p.subNeed === lim.sub &&
        p.unsubStatutory === lim.unsub &&
        p.unsubNeed === lim.unsub
      ) {
        return p;
      }
      return {
        ...p,
        subStatutory: lim.sub,
        subNeed: lim.sub,
        unsubStatutory: lim.unsub,
        unsubNeed: lim.unsub,
      };
    });
  }, [inputs.gradeLevel, inputs.dependency, inputs.parentPlusDenied, inputs.overrideLimits]);

  const activeTermKeys: TermKey[] = [
    ...STANDARD_KEYS.slice(0, inputs.numStandardTerms),
    ...OPTIONAL_KEYS.filter(({ toggle }) => Boolean(inputs[toggle])).map((o) => o.key),
  ];

  const scenarioGroups = Array.from(new Set(SCENARIOS.map((s) => s.group)));
  const currentScenario = SCENARIOS.find((s) => s.id === activeScenario);
  const isDisbursementMode = inputs.viewMode === "disbursement";
  const gradLocked = isGradOrProf(inputs.gradeLevel);

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
                ED 5-step model · per-term recalculation · for product, engineering, QA.
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
                <SelectTrigger className="h-9 w-[300px] rounded-lg">
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
            The Department of Education's 5-step Schedule of Reductions process — initial max,
            AY %, per-term share, term %, and per-term disbursement — with full per-term
            recalculation when actual enrollment differs from plan.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              5-step ED process
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              Plan vs. Disbursement view
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              Balloon · clawback · overflow
            </span>
            <span className="rounded-full bg-white/15 px-2.5 py-1 font-medium">
              Half-time gate
            </span>
          </div>

          {/* Mode toggle */}
          <div className="mt-4 inline-flex rounded-xl border border-white/30 bg-white/10 p-1 text-xs">
            {([
              { v: "plan", label: "Plan view", desc: "intent-to-enroll" },
              { v: "disbursement", label: "Disbursement view", desc: "recalc per term" },
            ] as { v: ViewMode; label: string; desc: string }[]).map((m) => (
              <button
                key={m.v}
                onClick={() => update({ viewMode: m.v })}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  inputs.viewMode === m.v
                    ? "bg-white text-primary"
                    : "text-white/85 hover:bg-white/10"
                }`}
              >
                {m.label}
                <span className="ml-1.5 text-[10px] opacity-70">· {m.desc}</span>
              </button>
            ))}
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

            {/* Section A1 — Grade Level & Dependency */}
            <Section
              letter="A1"
              title="Grade Level & Dependency"
              description="Auto-populates the OBBBA 2026-27 Sub/Unsub annual statutory caps."
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Grade Level</Label>
                  <Select
                    value={inputs.gradeLevel}
                    onValueChange={(v) => update({ gradeLevel: v as GradeLevel })}
                  >
                    <SelectTrigger className="h-10 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(GRADE_LABELS) as GradeLevel[]).map((g) => (
                        <SelectItem key={g} value={g}>
                          {GRADE_LABELS[g]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Dependency {gradLocked ? "(Independent — grad/prof)" : ""}
                  </Label>
                  <RadioGroup
                    value={gradLocked ? "independent" : inputs.dependency}
                    onValueChange={(v) => update({ dependency: v as Dependency })}
                    className="grid grid-cols-2 gap-2"
                  >
                    {(["dependent", "independent"] as Dependency[]).map((d) => (
                      <Label
                        key={d}
                        htmlFor={`dep-${d}`}
                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background p-2.5 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 ${
                          gradLocked && d === "dependent" ? "pointer-events-none opacity-40" : ""
                        }`}
                      >
                        <RadioGroupItem
                          id={`dep-${d}`}
                          value={d}
                          disabled={gradLocked}
                        />
                        <span className="text-sm font-medium capitalize">{d}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
              <Label
                className={`mt-3 flex items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5 ${
                  gradLocked || inputs.dependency !== "dependent"
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                }`}
              >
                <div>
                  <div className="text-sm font-medium">Parent PLUS denied</div>
                  <div className="text-[11px] text-muted-foreground">
                    Dependent undergrad whose parents were denied PLUS gets the Independent
                    Unsub cap. The Additional Unsub uplift is itself subject to SOR.
                  </div>
                </div>
                <Switch
                  checked={inputs.parentPlusDenied}
                  disabled={gradLocked || inputs.dependency !== "dependent"}
                  onCheckedChange={(v) => update({ parentPlusDenied: v })}
                />
              </Label>
              <Label className="mt-3 flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">Override statutory limits manually</div>
                  <div className="text-[11px] text-muted-foreground">
                    Off: Sub/Unsub caps come from the OBBBA lookup. On: edit caps directly in
                    Section B.
                  </div>
                </div>
                <Switch
                  checked={inputs.overrideLimits}
                  onCheckedChange={(v) => update({ overrideLimits: v })}
                />
              </Label>
            </Section>

            {/* Section B — Initial Max */}
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
              {results.additionalUnsubBase > 0 ? (
                <div className="mt-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs">
                  <div className="font-semibold text-primary">
                    Additional Unsubsidized (PLUS denial)
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    +${results.additionalUnsubBase.toLocaleString()} added to the Unsub
                    statutory ceiling. After SOR % reduction it contributes{" "}
                    <span className="font-semibold text-foreground">
                      ${results.additionalUnsubReduced.toLocaleString()}
                    </span>{" "}
                    to the annual Unsub limit.
                  </div>
                </div>
              ) : null}
              <Label className="mt-4 flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">Apply Sub → Unsub shift</div>
                  <div className="text-[11px] text-muted-foreground">
                    Unused Sub SOR ceiling shifts to Unsub up to the Unsub SOR ceiling
                    (OBBBA combined-cap behavior).
                  </div>
                </div>
                <Switch
                  checked={inputs.applySubUnsubShift}
                  onCheckedChange={(v) => update({ applySubUnsubShift: v })}
                />
              </Label>
              <Label className="mt-3 flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">Apply Double-Reduction (4/15 VFG)</div>
                  <div className="text-[11px] text-muted-foreground">
                    When Need &lt; Statutory: reduce Need to (Need × SOR %) FIRST, then
                    re-apply SOR % on Step 2. Confirmed in the April 15 vendor focus group.
                  </div>
                </div>
                <Switch
                  checked={inputs.applyDoubleReduction}
                  onCheckedChange={(v) => update({ applyDoubleReduction: v })}
                />
              </Label>
              {results.doubleReductionApplied ? (
                <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs">
                  <div className="font-semibold text-amber-700 dark:text-amber-400">
                    Adjusted Need (post first reduction)
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-2 text-muted-foreground">
                    <div>
                      Sub Need:{" "}
                      <span className="font-semibold text-foreground">
                        ${results.subNeedAdjusted.toLocaleString()}
                      </span>{" "}
                      <span className="text-[10px]">(was ${inputs.subNeed.toLocaleString()})</span>
                    </div>
                    <div>
                      Unsub Need:{" "}
                      <span className="font-semibold text-foreground">
                        ${results.unsubNeedAdjusted.toLocaleString()}
                      </span>{" "}
                      <span className="text-[10px]">
                        (was ${inputs.unsubNeed.toLocaleString()})
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}
              <Label className="mt-3 flex cursor-pointer items-start justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2.5">
                <div>
                  <div className="text-sm font-medium">
                    Count LTHT credits in AY % numerator
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Below-half-time term credits count toward the AY enrollment %, but the
                    LTHT term itself still pays $0 (per 4/15 VFG).
                  </div>
                </div>
                <Switch
                  checked={inputs.countLthtInAyPct}
                  onCheckedChange={(v) => update({ countLthtInAyPct: v })}
                />
              </Label>
            </Section>

            {/* Section C — Term-by-Term */}
            <Section
              letter="C"
              title="Term-by-Term Enrollment"
              description={
                isDisbursementMode
                  ? "Disbursement view: tick Disbursed when funds release; enter Actual credits for that point in time."
                  : "Half-time cliff = FT ÷ 2. Below half-time → ineligible (no disbursement)."
              }
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
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {TERM_LABELS[key]}
                            </span>
                            {tr ? <StatusChip status={tr.status} /> : null}
                            {isDisbursementMode && t.disbursed ? (
                              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                Disbursed
                              </span>
                            ) : null}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            Half-time @ {(t.ftCredits / 2).toFixed(1)} cr
                          </span>
                        </div>

                        {isDisbursementMode ? (
                          <Label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                            <Checkbox
                              checked={t.disbursed}
                              onCheckedChange={(v) =>
                                updateTerm(key, { disbursed: Boolean(v) })
                              }
                            />
                            <span className="text-xs font-medium">
                              Disbursed (lock paid amount, recalc plan)
                            </span>
                          </Label>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          <NumberField
                            label="FT credits (term)"
                            value={t.ftCredits}
                            step={0.5}
                            onChange={(v) => updateTerm(key, { ftCredits: v })}
                          />
                          <NumberField
                            label={isDisbursementMode ? "Planned credits" : "Enrolled"}
                            value={t.enrolledCredits}
                            step={0.5}
                            onChange={(v) => updateTerm(key, { enrolledCredits: v })}
                          />
                          {isDisbursementMode ? (
                            <NumberField
                              label="Actual credits at disbursement"
                              value={t.actualCredits}
                              step={0.5}
                              onChange={(v) => updateTerm(key, { actualCredits: v })}
                              hint={t.disbursed ? "Used for recalc" : "(not yet disbursed)"}
                            />
                          ) : (
                            <div className="hidden sm:block" />
                          )}

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

            {/* Section D — Per-term Shares (Step 3) */}
            <Section
              letter="D"
              title="Per-term Shares (Step 3)"
              description="Annual loan limit ÷ N eligible terms. Whole dollars; last term absorbs the rounding remainder. The model is fixed by regulation."
            >
              <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground">
                <ListChecks className="h-4 w-4 text-primary" />
                <span>
                  Each eligible term receives an equal share of the annual SOR limit; in
                  Step 4 each share is multiplied by that term's enrollment %, with overflow
                  forwarded to remaining terms.
                </span>
              </div>
            </Section>

            {/* Logic walkthrough */}
            <StepWalkthrough inputs={inputs} results={results} />
          </div>

          {/* RIGHT — Sticky results */}
          <aside className="lg:sticky lg:top-[88px] lg:self-start">
            <ResultsPanel results={results} />
          </aside>
        </div>

        <footer className="mt-10 border-t border-border/60 pt-6 text-center text-[11px] text-muted-foreground">
          Modeling tool only · Verify against the FSA Handbook & 34 CFR 685.203 before
          disbursement. R2T4 (Scenarios 6 & 7) and aggregate lifetime caps are out of scope.
        </footer>
      </main>
    </div>
  );
}
