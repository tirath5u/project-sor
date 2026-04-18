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
    setInputs(s.build());
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
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-elegant)]"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold leading-tight text-foreground sm:text-lg">
                  Schedule of Reductions
                </h1>
                <span className="rounded-full bg-accent/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent-foreground">
                  Ellucian
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground sm:text-xs">
                v18 master parity · ED 5-step engine · OBBBA AY 2026-27
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/lifecycle"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition hover:bg-accent/10"
            >
              <GraduationCap className="h-4 w-4 text-primary" />
              Lifecycle Tracker
            </Link>
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
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Grade Code</Label>
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
              <Label className="text-xs font-medium">
                Dependency {gradLocked ? "· locked" : ""}
              </Label>
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
              hint={`→ Sub ${fmtCurrency(splitPreview.subNeed)} · Unsub ${fmtCurrency(splitPreview.unsubNeed)}`}
            />

            <NumberField
              label="AY Full-Time Credits"
              value={inputs.ayFtCredits}
              step={0.5}
              onChange={(v) => update({ ayFtCredits: v })}
              hint="Step 2 denominator"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Standard terms</Label>
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
              <Label className="text-xs font-medium">Calendar</Label>
              <Select
                value={String(inputs.calType)}
                onValueChange={(v) => update({ calType: Number(v) as CalType })}
              >
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">AC1 — Standard term, SAY</SelectItem>
                  <SelectItem value="2">AC2 — Standard term, BBAY</SelectItem>
                  <SelectItem value="3">AC3 — Non-standard, terms</SelectItem>
                  <SelectItem value="4">AC4 — Non-standard, non-terms</SelectItem>
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
              <Label className="text-xs font-medium">AY Type</Label>
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
            </Label>
            <Label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs">
              <Switch
                checked={inputs.overrideLimits}
                onCheckedChange={(v) => update({ overrideLimits: v })}
              />
              <span className="font-medium">Override statutory limits</span>
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
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Pill label="Sub stat cap" value={fmtCurrency(inputs.subStatutory)} />
              <Pill label="Unsub stat cap" value={fmtCurrency(inputs.unsubStatutory)} />
              {results.additionalUnsubBase > 0 ? (
                <Pill
                  label="+ PLUS-denial Unsub"
                  value={fmtCurrency(results.additionalUnsubBase)}
                  accent
                />
              ) : null}
              <Pill label="Sub baseline" value={fmtCurrency(results.subBaseline)} />
              <Pill label="Unsub baseline" value={fmtCurrency(results.unsubBaseline)} />
            </div>
          )}
        </Section>

        {/* Section B — per-term inline grid */}
        <Section
          letter="B"
          title="Per-term Enrollment"
          description={
            isDisbursementMode
              ? "Disbursement view — tick Disbursed when funds release; enter Actual credits at that point."
              : "Half-time cliff = FT ÷ 2. Below half-time → ineligible (no disbursement)."
          }
        >
          {activeTermKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No terms enabled yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-[11px]">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="px-2 py-2 font-medium">Term</th>
                    <th className="px-2 py-2 font-medium">FT</th>
                    <th className="px-2 py-2 font-medium">
                      {isDisbursementMode ? "Planned" : "Enrolled"}
                    </th>
                    {isDisbursementMode ? (
                      <>
                        <th className="px-2 py-2 font-medium">Disbursed?</th>
                        <th className="px-2 py-2 font-medium">Actual</th>
                      </>
                    ) : null}
                    <th className="px-2 py-2 font-medium">Paid Sub</th>
                    <th className="px-2 py-2 font-medium">Paid Unsub</th>
                    <th className="px-2 py-2 font-medium">Refund S/U</th>
                    <th className="px-2 py-2 font-medium">COA cap S/U</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums">
                  {activeTermKeys.map((key) => {
                    const t = inputs.terms[key];
                    return (
                      <tr key={key} className="border-b border-border/40 align-middle">
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <ToggleGroup
              label="View"
              value={inputs.viewMode}
              options={[
                { v: "plan", label: "Plan" },
                { v: "disbursement", label: "Disbursement" },
              ]}
              onChange={(v) => update({ viewMode: v as ViewMode })}
            />
            <ToggleGroup
              label="Step-3 distribution"
              value={inputs.distributionModel}
              options={[
                { v: "equal", label: "Equal" },
                { v: "proportional", label: "Proportional" },
              ]}
              onChange={(v) => update({ distributionModel: v as DistributionModel })}
            />
            <Label className="ml-auto flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs">
              <Switch
                checked={inputs.applySubUnsubShift}
                onCheckedChange={(v) => update({ applySubUnsubShift: v })}
              />
              <span>Sub→Unsub shift</span>
            </Label>
            <Label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs">
              <Switch
                checked={inputs.applyDoubleReduction}
                onCheckedChange={(v) => update({ applyDoubleReduction: v })}
              />
              <span>Double-reduction</span>
            </Label>
            <Label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs">
              <Switch
                checked={inputs.countLthtInAyPct}
                onCheckedChange={(v) => update({ countLthtInAyPct: v })}
              />
              <span>Count LTHT in AY%</span>
            </Label>
          </div>
        </Section>

        {/* Results layout — Matrix or Cards + sticky summary */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">Results</h2>
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
            <ResultsPanel results={results} />
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

function Pill({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 ${
        accent
          ? "border-accent/40 bg-accent/15 text-accent-foreground"
          : "border-border bg-background text-foreground"
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </span>
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

function ToggleGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex gap-0.5">
        {options.map((o) => (
          <button
            key={o.v}
            onClick={() => onChange(o.v)}
            className={`rounded-md px-2 py-0.5 font-medium transition ${
              value === o.v
                ? "bg-primary text-primary-foreground"
                : "text-foreground/70 hover:bg-muted"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
