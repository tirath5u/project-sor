import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import {
  RotateCcw,
  Calculator,
  BookOpen,
  FileSpreadsheet,
  LayoutGrid,
  Table as TableIcon,
  GraduationCap,
} from "lucide-react";
import {
  calculateSOR,
  defaultInputs,
  fmtCurrency,
  splitNeed,
  TERM_LABELS,
  TERM_ORDER,
  type SORInputs,
  type TermKey,
  type CalType,
  type ViewMode,
  type DistributionModel,
} from "@/lib/sor";
import {
  GRADE_GROUPS,
  GRADE_LABELS,
  lookupLimits,
  isGradOrProf,
  type GradeLevel,
  type Dependency,
} from "@/lib/loanLimits";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { Section } from "@/components/sor/Section";
import { NumberField } from "@/components/sor/NumberField";
import { ResultsPanel } from "@/components/sor/ResultsPanel";
import { StepWalkthrough } from "@/components/sor/StepWalkthrough";
import { TermsMatrix } from "@/components/sor/TermsMatrix";
import { TermsCards } from "@/components/sor/TermsCards";
import { QuickTermCalc } from "@/components/sor/QuickTermCalc";
import { InfoTip } from "@/components/sor/InfoTip";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  { key: "winter1", toggle: "includeWinter1" },
  { key: "winter2", toggle: "includeWinter2" },
  { key: "summer1", toggle: "includeSummer1" },
  { key: "summer2", toggle: "includeSummer2" },
];

function SORCalculatorPage() {
  const [inputs, setInputs] = React.useState<SORInputs>(() => defaultInputs());
  const [activeScenario, setActiveScenario] = React.useState<string>("");
  const [resultView, setResultView] = React.useState<"table" | "cards">("table");
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
    const built = s.build();
    // Normalize statutory caps from the lookup table whenever the scenario
    // does NOT explicitly use overrideLimits, so a stale or omitted scenario
    // value can never desync from the grade-level lookup. The engine also
    // resolves caps internally, but this keeps the displayed Sub/Unsub
    // statutory inputs honest.
    if (!built.overrideLimits) {
      const lim = lookupLimits(built.gradeLevel, built.dependency, built.parentPlusDenied);
      built.subStatutory = lim.sub;
      built.unsubStatutory = lim.unsub;
    }
    setInputs(built);
    setActiveScenario(s.id);
  };

  // Sync standard-term count → enabled flags
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
    inputs.includeWinter1,
    inputs.includeWinter2,
  ]);

  // Auto-populate Sub/Unsub statutory caps from grade lookup unless overridden
  React.useEffect(() => {
    if (inputs.overrideLimits) return;
    const lim = lookupLimits(inputs.gradeLevel, inputs.dependency, inputs.parentPlusDenied);
    setInputs((p) => {
      if (p.subStatutory === lim.sub && p.unsubStatutory === lim.unsub) return p;
      return { ...p, subStatutory: lim.sub, unsubStatutory: lim.unsub };
    });
  }, [inputs.gradeLevel, inputs.dependency, inputs.parentPlusDenied, inputs.overrideLimits]);

  const activeTermKeys: TermKey[] = TERM_ORDER.filter((k) => {
    const stdIdx = STANDARD_KEYS.indexOf(k);
    if (stdIdx >= 0 && stdIdx < inputs.numStandardTerms) return true;
    const opt = OPTIONAL_KEYS.find((o) => o.key === k);
    if (opt && Boolean(inputs[opt.toggle])) return true;
    return false;
  });

  const scenarioGroups = Array.from(new Set(SCENARIOS.map((s) => s.group)));
  const currentScenario = SCENARIOS.find((s) => s.id === activeScenario);
  const isDisbursementMode = inputs.viewMode === "disbursement";
  const gradLocked = isGradOrProf(inputs.gradeLevel);

  const splitPreview = splitNeed(
    inputs.annualNeed,
    inputs.subStatutory,
    inputs.unsubStatutory,
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-subtle)" }}>
      <a href="#results-region" className="skip-link">
        Skip to results
      </a>
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h1 className="flex items-center gap-1.5 text-base font-semibold leading-tight text-foreground sm:text-lg">
                Schedule of Reductions - One Big Beautiful Bill Less Than Full-Time Reduction
                <InfoTip label="About Schedule of Reductions" size="sm">
                  The Schedule of Reductions (SOR) calculates how Direct Loan annual limits are reduced for less-than-full-time enrollment under the One Big Beautiful Bill Act. This tool computes the AY %, the reduced Sub/Unsub annual pools, and the per-term disbursements per 34 CFR 685.203.
                </InfoTip>
              </h1>
              <p className="text-[10px] italic text-muted-foreground/70 sm:text-[11px]">
                by Tirath Chhatriwala
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Link
                to="/lifecycle"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent/10"
              >
                <GraduationCap className="h-4 w-4 text-primary" />
                Lifecycle Tracker
              </Link>
              <InfoTip label="About Lifecycle Tracker">
                Walk a single student through enrollment changes term-by-term across multiple academic years.
              </InfoTip>
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-1">
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
              <InfoTip label="About scenarios">
                Pre-built use cases for quick reference. Selecting one overwrites all current inputs.
              </InfoTip>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
              <InfoTip label="About reset">
                Clears all inputs back to defaults. Cannot be undone.
              </InfoTip>
            </div>
          </div>
        </div>
      </header>

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

      <main className="mx-auto max-w-[1400px] space-y-5 px-4 py-5 sm:px-6 lg:py-6">
        {currentScenario ? (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
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

        {/* Quick calc widget */}
        <QuickTermCalc />

        {/* Section A — compact inputs */}
        <Section
          letter="A"
          title="Student & Loan Period"
          description="Grade, dependency, and the single Annual Financial Need that drives Sub/Unsub split."
          tooltip="Inputs that determine the statutory loan ceilings and baseline Sub/Unsub split per the Combined Limit Shifting Rule (34 CFR 685.203)."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">Grade Code</Label>
                <InfoTip>Determines the statutory Sub/Unsub annual maximums per 34 CFR 685.203.</InfoTip>
              </div>
              <Select
                value={inputs.gradeLevel}
                onValueChange={(v) => update({ gradeLevel: v as GradeLevel })}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_GROUPS.map((g) => (
                    <SelectGroup key={g.label}>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.codes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {GRADE_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">
                  Dependency {gradLocked ? "· locked" : ""}
                </Label>
                <InfoTip>
                  Independent students get the additional Unsub allowance. Graduate / professional are always Independent (locked).
                </InfoTip>
              </div>
              <RadioGroup
                value={gradLocked ? "independent" : inputs.dependency}
                onValueChange={(v) => update({ dependency: v as Dependency })}
                className="grid grid-cols-2 gap-1.5"
              >
                {(["dependent", "independent"] as Dependency[]).map((d) => (
                  <Label
                    key={d}
                    htmlFor={`dep-${d}`}
                    className={`flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2 text-xs has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 ${
                      gradLocked && d === "dependent" ? "pointer-events-none opacity-40" : ""
                    }`}
                  >
                    <RadioGroupItem id={`dep-${d}`} value={d} disabled={gradLocked} />
                    <span className="font-medium capitalize">{d}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <NumberField
              label="Annual Financial Need"
              prefix="$"
              value={inputs.annualNeed}
              onChange={(v) => update({ annualNeed: v })}
              hint={`→ Sub baseline ${fmtCurrency(results.subBaseline)} · Unsub baseline ${fmtCurrency(results.unsubBaseline)}`}
              tooltip="Cost of Attendance − EFC/SAI − other aid. Drives the Sub baseline. Unsub is NOT need-based — it's calculated from the Combined Limit Shifting Rule."
            />

            <NumberField
              label="AY Full-Time Credits"
              value={inputs.ayFtCredits}
              step={0.5}
              onChange={(v) => update({ ayFtCredits: v })}
              hint="Step 2 denominator"
              tooltip="The denominator for the Academic Year %. Example: 24 FT credits per year for a typical undergrad SAY."
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">Standard terms</Label>
                <InfoTip>Number of standard terms in the academic year (Fall, Spring, optionally Summer).</InfoTip>
              </div>
              <RadioGroup
                value={String(inputs.numStandardTerms)}
                onValueChange={(v) =>
                  update({ numStandardTerms: Number(v) as 2 | 3 | 4 })
                }
                className="grid grid-cols-3 gap-1.5"
              >
                {[2, 3, 4].map((n) => (
                  <Label
                    key={n}
                    htmlFor={`nst-${n}`}
                    className="flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-xs has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                  >
                    <RadioGroupItem id={`nst-${n}`} value={String(n)} />
                    <span className="font-medium">{n}</span>
                  </Label>
                ))}
              </RadioGroup>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">Calendar</Label>
                <InfoTip>
                  AC1 = Standard term, Scheduled AY · AC2 = Standard term, Borrower-Based AY · AC3 = Non-standard, term-based · AC4 = Non-standard, non-term (clock-hour or credit-hour without terms).
                </InfoTip>
              </div>
              <Select
                value={String(inputs.calType)}
                onValueChange={(v) => update({ calType: Number(v) as CalType })}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">AC1 - Standard term, SAY</SelectItem>
                  <SelectItem value="2">AC2 - Standard term, BBAY</SelectItem>
                  <SelectItem value="3">AC3 - Non-standard, terms</SelectItem>
                  <SelectItem value="4">AC4 - Non-standard, non-terms</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">Program Level</Label>
                <InfoTip>Undergraduate vs. Graduate. Drives the grade-code lookup and aggregate caps.</InfoTip>
              </div>
              <Select
                value={inputs.programLevel}
                onValueChange={(v) =>
                  update({ programLevel: v as SORInputs["programLevel"] })
                }
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="undergraduate">Undergraduate</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs font-medium">AY Type</Label>
                <InfoTip>
                  SAY = Scheduled Academic Year (fixed calendar). BBAY = Borrower-Based Academic Year (floats with enrollment).
                </InfoTip>
              </div>
              <Select
                value={inputs.ayType}
                onValueChange={(v) => update({ ayType: v as SORInputs["ayType"] })}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAY">SAY</SelectItem>
                  <SelectItem value="BBAY1">BBAY1</SelectItem>
                  <SelectItem value="BBAY2">BBAY2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional terms + flags row */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {[
              { k: "includeWinter1" as const, label: "Winter 1" },
              { k: "includeWinter2" as const, label: "Winter 2" },
              { k: "includeSummer1" as const, label: "Summer 1" },
              { k: "includeSummer2" as const, label: "Summer 2" },
            ].map(({ k, label }) => (
              <Label
                key={k}
                className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs"
              >
                <Switch
                  checked={Boolean(inputs[k])}
                  onCheckedChange={(v) => update({ [k]: v } as Partial<SORInputs>)}
                />
                <span className="font-medium">{label}</span>
              </Label>
            ))}
            <Label
              className={`flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs ${
                gradLocked || inputs.dependency !== "dependent"
                  ? "opacity-40"
                  : ""
              }`}
            >
              <Switch
                checked={inputs.parentPlusDenied}
                disabled={gradLocked || inputs.dependency !== "dependent"}
                onCheckedChange={(v) => update({ parentPlusDenied: v })}
              />
              <span className="font-medium">Parent PLUS denied</span>
              <InfoTip>Triggers the additional Unsub allowance for dependent undergraduates whose parent was denied a PLUS loan.</InfoTip>
            </Label>
            <Label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs">
              <Switch
                checked={inputs.overrideLimits}
                onCheckedChange={(v) => update({ overrideLimits: v })}
              />
              <span className="font-medium">Override statutory limits</span>
              <InfoTip>Manually enter Sub/Unsub maximums instead of using the grade-level lookup. Use only for edge cases.</InfoTip>
            </Label>
          </div>

          {inputs.overrideLimits ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumberField
                label="Sub statutory cap"
                prefix="$"
                value={inputs.subStatutory}
                onChange={(v) => update({ subStatutory: v })}
              />
              <NumberField
                label="Unsub statutory cap"
                prefix="$"
                value={inputs.unsubStatutory}
                onChange={(v) => update({ unsubStatutory: v })}
              />
            </div>
          ) : (
            <div className="mt-3 border-t border-border/60 pt-3">
              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] leading-relaxed text-foreground">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Computed baselines:
                </span>
                <span className="font-semibold tabular-nums">
                  Sub baseline {fmtCurrency(results.subBaseline)}
                </span>
                <span className="text-muted-foreground">·</span>
                <span className="font-semibold tabular-nums">
                  Unsub baseline {fmtCurrency(results.unsubBaseline)}
                </span>
                <span className="text-muted-foreground/70">
                  · from {fmtCurrency(results.effectiveSubStatutory)} Sub +{" "}
                  {fmtCurrency(results.effectiveUnsubStatutory)} Unsub ={" "}
                  {fmtCurrency(results.effectiveCombinedLimit)} combined limit
                </span>
                {results.additionalUnsubBase > 0 ? (
                  <span className="font-semibold text-accent-foreground">
                    · + {fmtCurrency(results.additionalUnsubBase)} PLUS-denial Unsub
                  </span>
                ) : null}
                <InfoTip>
                  Step 1 of the SOR engine. Sub baseline = MIN(Sub stat cap, Annual Need). Unsub baseline = (Sub stat cap + Unsub stat cap) − Sub baseline, capped by Unsub stat cap (Combined Limit Shifting Rule).
                </InfoTip>
              </p>
            </div>
          )}
        </Section>

        {/* Section B — per-term inline grid */}
        <Section
          letter="B"
          title="Per-term Enrollment"
          description={
            isDisbursementMode
              ? "Disbursement view: tick Disbursed when funds release; enter Actual credits at that point."
              : "Half-time cliff = FT ÷ 2. Below half-time → ineligible (no disbursement)."
          }
          tooltip="Per-term FT thresholds, enrollment, paid amounts, refunds, and COA caps. Each row drives the per-term calculation in the Results matrix below."
        >
          {activeTermKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No terms enabled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Term</th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        FT
                        <InfoTip>Full-time credit threshold for THIS term. Half-time = FT ÷ 2.</InfoTip>
                      </span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        {isDisbursementMode ? "Planned" : "Enrolled"}
                        <InfoTip>
                          Plan view: what you expect the student to take. Disbursement view: planned credits at original disbursement.
                        </InfoTip>
                      </span>
                    </th>
                    {isDisbursementMode ? (
                      <>
                        <th className="px-2 py-2 font-medium">
                          <span className="inline-flex items-center gap-1">
                            Disbursed?
                            <InfoTip>Mark when funds have actually released. Disbursed terms are anchored — the engine cannot retroactively change them.</InfoTip>
                          </span>
                        </th>
                        <th className="px-2 py-2 font-medium">
                          <span className="inline-flex items-center gap-1">
                            Actual
                            <InfoTip>Credits the student is actually enrolled in at the disbursement point in time.</InfoTip>
                          </span>
                        </th>
                      </>
                    ) : null}
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        Paid Sub
                        <InfoTip>Sub amount already disbursed. Locks this term's Final value (history anchoring).</InfoTip>
                      </span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        Paid Unsub
                        <InfoTip>Unsub amount already disbursed. Locks this term's Final value (history anchoring).</InfoTip>
                      </span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        Refund S/U
                        <InfoTip>Subsidized / Unsubsidized refunded back. Reduces the locked Net amount for this term.</InfoTip>
                      </span>
                    </th>
                    <th className="px-2 py-2 font-medium">
                      <span className="inline-flex items-center gap-1">
                        COA cap S/U
                        <InfoTip>Per-term Cost of Attendance cap (Sub / Unsub). Final values are clamped to this.</InfoTip>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {activeTermKeys.map((key) => {
                    const t = inputs.terms[key];
                    return (
                      <tr key={key} className="border-b border-border/40 align-middle even:bg-muted/30">
                        <td className="px-2 py-1.5 font-semibold text-foreground">
                          {TERM_LABELS[key]}
                          <div className="text-[9px] font-normal text-muted-foreground">
                            ½ @ {(t.ftCredits / 2).toFixed(1)}
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <CompactNum
                            value={t.ftCredits}
                            step={0.5}
                            onChange={(v) => updateTerm(key, { ftCredits: v })}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CompactNum
                            value={t.enrolledCredits}
                            step={0.5}
                            onChange={(v) => updateTerm(key, { enrolledCredits: v })}
                          />
                        </td>
                        {isDisbursementMode ? (
                          <>
                            <td className="px-2 py-1.5">
                              <Checkbox
                                checked={t.disbursed}
                                onCheckedChange={(v) =>
                                  updateTerm(key, { disbursed: Boolean(v) })
                                }
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <CompactNum
                                value={t.actualCredits}
                                step={0.5}
                                onChange={(v) => updateTerm(key, { actualCredits: v })}
                              />
                            </td>
                          </>
                        ) : null}
                        <td className="px-2 py-1.5">
                          <CompactNum
                            value={t.paidSub}
                            onChange={(v) => updateTerm(key, { paidSub: v })}
                            wide
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <CompactNum
                            value={t.paidUnsub}
                            onChange={(v) => updateTerm(key, { paidUnsub: v })}
                            wide
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <CompactNum
                              value={t.refundSub}
                              onChange={(v) => updateTerm(key, { refundSub: v })}
                            />
                            <CompactNum
                              value={t.refundUnsub}
                              onChange={(v) => updateTerm(key, { refundUnsub: v })}
                            />
                          </div>
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-1">
                            <CompactNum
                              value={t.coaCapSub}
                              onChange={(v) => updateTerm(key, { coaCapSub: v })}
                              wide
                            />
                            <CompactNum
                              value={t.coaCapUnsub}
                              onChange={(v) => updateTerm(key, { coaCapUnsub: v })}
                              wide
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Distribution + view-mode toggles */}
          <div className="mt-4 border-t border-border/60 pt-3">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Calculation rules
              <InfoTip>How the engine slices the annual pool, applies enrollment intensity, and honors disbursement history.</InfoTip>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Segmented
                label="View"
                value={inputs.viewMode}
                options={[
                  { v: "plan", label: "Plan" },
                  { v: "disbursement", label: "Disbursement" },
                ]}
                onChange={(v) => update({ viewMode: v as ViewMode })}
                tip="Plan = forward-looking projection. Disbursement = honors history; locks paid terms and redistributes the remaining annual pool to future eligible terms."
              />
              <Segmented
                label="Distribution"
                value={inputs.distributionModel}
                options={[
                  { v: "equal", label: "Equal" },
                  { v: "proportional", label: "Proportional" },
                ]}
                onChange={(v) => update({ distributionModel: v as DistributionModel })}
                tip="Equal = annual pool ÷ remaining eligible terms. Proportional = weighted by each term's enrolled credits. Equal is the regulatory default."
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
              <span className="mr-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Advanced rules
              </span>
              <Label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 text-[11px]">
                <Switch
                  checked={inputs.applySubUnsubShift}
                  onCheckedChange={(v) => update({ applySubUnsubShift: v })}
                />
                <span>Sub→Unsub shift</span>
                <InfoTip>When the student's Sub need drops below the calculated Sub amount, shift the unused Sub allowance into Unsub (up to the Combined Limit). Off = excess Sub is forfeited.</InfoTip>
              </Label>
              <Label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 text-[11px]">
                <Switch
                  checked={inputs.applyDoubleReduction}
                  onCheckedChange={(v) => update({ applyDoubleReduction: v })}
                />
                <span>Double-reduction</span>
                <InfoTip>Apply both the AY% intensity reduction AND the per-term enrollment-intensity reduction. Off = single reduction only (most common interpretation).</InfoTip>
              </Label>
              <Label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-2.5 text-[11px]">
                <Switch
                  checked={inputs.countLthtInAyPct}
                  onCheckedChange={(v) => update({ countLthtInAyPct: v })}
                />
                <span>Count LTHT in AY%</span>
                <InfoTip>Less-Than-Half-Time credits: include them in the Academic Year % numerator. Lapsed credits then carry forward to boost the next eligible term's intensity (e.g. 125%).</InfoTip>
              </Label>
            </div>
          </div>
        </Section>

        {/* Results layout — Matrix or Cards + sticky summary */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-foreground">Results</h2>
                <InfoTip>
                  Table = spreadsheet-style matrix mirroring v18 (sections B–J). Cards = per-term card layout, easier on narrow viewports.
                </InfoTip>
              </div>
              <div className="inline-flex rounded-lg border border-border bg-background p-1 text-xs">
                <button
                  onClick={() => setResultView("table")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                    resultView === "table"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" /> Table
                </button>
                <button
                  onClick={() => setResultView("cards")}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition ${
                    resultView === "cards"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" /> Cards
                </button>
              </div>
            </div>

            {resultView === "table" ? (
              <TermsMatrix results={results} scenario={currentScenario} />
            ) : (
              <TermsCards results={results} />
            )}

            <StepWalkthrough inputs={inputs} results={results} />
          </div>

          <aside className="xl:sticky xl:top-[88px] xl:self-start">
            <ResultsPanel
              results={results}
              inputs={inputs}
              scenarioTitle={currentScenario?.title}
              scenarioId={currentScenario?.id}
            />
          </aside>
        </div>

        <footer className="border-t border-border/60 pt-5 text-center text-[11px] text-muted-foreground">
          Modeling tool only · Verify against the FSA Handbook & 34 CFR 685.203 before
          disbursement. R2T4 (Scenarios 6 & 7) are out of scope.
        </footer>
      </main>
    </div>
  );
}

function CompactNum({
  value,
  onChange,
  step,
  wide,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  wide?: boolean;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      step={step}
      min={0}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const v = e.target.value === "" ? 0 : Number(e.target.value);
        onChange(Number.isFinite(v) ? v : 0);
      }}
      className={`h-8 rounded-md border border-border bg-background px-1.5 text-right text-[11px] tabular-nums focus:outline-none focus:ring-2 focus:ring-ring ${
        wide ? "w-20" : "w-14"
      }`}
    />
  );
}

/**
 * Accessible segmented control: ARIA radiogroup with arrow-key navigation.
 */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  tip,
}: {
  label: string;
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
  tip?: string;
}) {
  const refs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const dir = e.key === "ArrowRight" ? 1 : -1;
    const next = (idx + dir + options.length) % options.length;
    onChange(options[next].v);
    refs.current[next]?.focus();
  };
  return (
    <div className="flex items-center gap-2">
      <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
        {label}
        {tip ? <InfoTip>{tip}</InfoTip> : null}
      </span>
      <div
        role="radiogroup"
        aria-label={label}
        className="inline-flex h-9 items-center rounded-lg border border-border bg-background p-0.5 text-xs shadow-sm"
      >
        {options.map((o, i) => {
          const checked = value === o.v;
          return (
            <button
              key={o.v}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              onClick={() => onChange(o.v)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`rounded-md px-3 py-1 font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                checked
                  ? "bg-primary text-primary-foreground shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]"
                  : "text-foreground/70 hover:bg-muted"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
