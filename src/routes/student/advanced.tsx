import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { defaultInputs, type SORInputs } from "@/lib/sor";

export const Route = createFileRoute("/student/advanced")({ component: AdvancedStudentPage });

function buildAdvanced(
  form: Record<string, string | boolean>,
): SORInputs & { coaScope?: "academicYear" | "singleTerm" } {
  const base = defaultInputs();
  const summer = Boolean(form.summer);
  const summerCredits = Number(form.summerCredits);
  const scope = form.scope as SORInputs["loanPeriodScope"];
  const input: SORInputs & { coaScope?: "academicYear" | "singleTerm" } = {
    ...base,
    awardYear: form.awardYear as SORInputs["awardYear"],
    programLevel: form.programLevel as SORInputs["programLevel"],
    gradeLevel: form.gradeLevel as SORInputs["gradeLevel"],
    dependency: form.dependency as SORInputs["dependency"],
    loanPeriodScope: scope,
    ayType: form.ayType as SORInputs["ayType"],
    numStandardTerms: 2,
    ayFtCredits: Number(form.ayFtCredits),
    annualNeed: Number(form.annualNeed),
    coa: Number(form.coa),
    otherAid: Number(form.otherAid),
    distributionModel: form.method as SORInputs["distributionModel"],
    includeSummer1: summer,
    summerPosition: summer ? "trailer" : "none",
    terms: { ...base.terms },
  };
  input.terms.term1 = {
    ...base.terms.term1,
    enabled: true,
    ftCredits: Number(form.ftCredits),
    enrolledCredits: Number(form.fallCredits),
    paidSub: form.fallPaidSub === "" ? null : Number(form.fallPaidSub),
    paidUnsub: form.fallPaidUnsub === "" ? null : Number(form.fallPaidUnsub),
  };
  input.terms.term2 = {
    ...base.terms.term2,
    enabled: true,
    ftCredits: Number(form.ftCredits),
    enrolledCredits: Number(form.springCredits),
    paidSub: form.springPaidSub === "" ? null : Number(form.springPaidSub),
    paidUnsub: form.springPaidUnsub === "" ? null : Number(form.springPaidUnsub),
  };
  input.terms.summer1 = {
    ...base.terms.summer1,
    enabled: summer,
    ftCredits: Number(form.ftCredits),
    enrolledCredits: summer ? summerCredits : 0,
  };
  for (const key of ["term3", "term4", "summer2", "winter1", "winter2"] as const)
    input.terms[key] = { ...base.terms[key], enabled: false, enrolledCredits: 0 };
  if (form.denominatorOverride !== "") {
    input.ayFtCredits = Number(form.denominatorOverride);
    input.ayDenominatorVerified = true;
  }
  if (scope === "singleTerm") input.coaScope = "singleTerm";
  return input;
}

function AdvancedStudentPage() {
  const [form, setForm] = React.useState<Record<string, string | boolean>>({
    awardYear: "2026-27",
    programLevel: "undergraduate",
    gradeLevel: "g1",
    dependency: "dependent",
    scope: "annualMultiTerm",
    ayType: "SAY",
    ftCredits: "12",
    ayFtCredits: "24",
    denominatorOverride: "",
    annualNeed: "5500",
    coa: "10000",
    otherAid: "0",
    fallCredits: "12",
    springCredits: "9",
    summer: false,
    summerCredits: "6",
    method: "equal",
    fallPaidSub: "",
    fallPaidUnsub: "",
    springPaidSub: "",
    springPaidUnsub: "",
  });
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const set = (key: string, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));
  const money = (value: unknown) =>
    typeof value === "number"
      ? new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value)
      : "Not available";
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/public/v2/student-advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ input: buildAdvanced(form) }),
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error?.message || "The advanced estimate could not be completed.");
      setResult(body);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The advanced estimate could not be completed.",
      );
    } finally {
      setLoading(false);
    }
  }
  const estimate = result?.estimate as Record<string, unknown> | undefined;
  return (
    <div>
      <main id="main">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              Advanced estimate for students
            </p>
            <h1 className="font-display text-3xl font-semibold sm:text-4xl">
              Add your school's own numbers
            </h1>
            <p className="text-base leading-7 text-muted-foreground">
              Use institution-specific cost of attendance, aid, need, term, and paid-history inputs
              for a more detailed projection. The same tested engine runs behind this form. It does
              not create an award.
            </p>
          </div>
          <form
            onSubmit={submit}
            className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Award Year"
                value={String(form.awardYear)}
                set={set}
                name="awardYear"
                select
                options={["2026-27", "2025-26"]}
              />
              <Field
                label="Program level"
                value={String(form.programLevel)}
                set={set}
                name="programLevel"
                select
                options={["undergraduate", "graduate"]}
              />
              <Field
                label="Grade level"
                value={String(form.gradeLevel)}
                set={set}
                name="gradeLevel"
                select
                options={["g0", "g1", "g2", "g3", "g4", "g8", "g10", "g11", "g12", "g13"]}
              />
              <Field
                label="Dependency"
                value={String(form.dependency)}
                set={set}
                name="dependency"
                select
                options={["dependent", "independent"]}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Loan-period scope"
                value={String(form.scope)}
                set={set}
                name="scope"
                select
                options={["annualMultiTerm", "singleTerm"]}
              />
              <Field
                label="Academic-year type"
                value={String(form.ayType)}
                set={set}
                name="ayType"
                select
                options={["SAY", "BBAY1", "BBAY2"]}
              />
              <Field
                label="Full-time credits per term"
                value={String(form.ftCredits)}
                set={set}
                name="ftCredits"
              />
              <Field
                label="AY denominator override"
                value={String(form.denominatorOverride)}
                set={set}
                name="denominatorOverride"
                placeholder="Optional"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Annual need"
                value={String(form.annualNeed)}
                set={set}
                name="annualNeed"
              />
              <Field label="Cost of attendance" value={String(form.coa)} set={set} name="coa" />
              <Field label="Other aid" value={String(form.otherAid)} set={set} name="otherAid" />
              <Field
                label="Distribution method"
                value={String(form.method)}
                set={set}
                name="method"
                select
                options={["equal", "proportional"]}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="Fall credits"
                value={String(form.fallCredits)}
                set={set}
                name="fallCredits"
              />
              <Field
                label="Spring credits"
                value={String(form.springCredits)}
                set={set}
                name="springCredits"
              />
              <div className="flex items-center gap-3 rounded-md border border-border/70 px-3">
                <Checkbox
                  checked={Boolean(form.summer)}
                  onCheckedChange={(checked) => set("summer", Boolean(checked))}
                  id="summer"
                />
                <Label htmlFor="summer">Include Summer 1</Label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field
                label="Fall Sub paid gross"
                value={String(form.fallPaidSub)}
                set={set}
                name="fallPaidSub"
                placeholder="Optional"
              />
              <Field
                label="Fall Unsub paid gross"
                value={String(form.fallPaidUnsub)}
                set={set}
                name="fallPaidUnsub"
                placeholder="Optional"
              />
              <Field
                label="Spring Sub paid gross"
                value={String(form.springPaidSub)}
                set={set}
                name="springPaidSub"
                placeholder="Optional"
              />
              <Field
                label="Spring Unsub paid gross"
                value={String(form.springPaidUnsub)}
                set={set}
                name="springPaidUnsub"
                placeholder="Optional"
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              Paid-history fields are gross amounts. Leave them blank when no prior payment exists.
              A positive denominator override must be institution-verified.
            </p>
            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}
            <Button type="submit" disabled={loading}>
              {loading ? "Calculating..." : "Calculate advanced estimate"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
          {result && estimate ? (
            <section className="rounded-lg border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Info className="h-4 w-4" /> Advanced estimate
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <Metric
                  label="SOR percentage"
                  value={
                    typeof estimate.sorPercent === "number"
                      ? `${Math.round(estimate.sorPercent * 100)}%`
                      : "Not available"
                  }
                />
                <Metric label="Estimated Sub" value={money(estimate.estimatedAnnualSub)} />
                <Metric label="Estimated Unsub" value={money(estimate.estimatedAnnualUnsub)} />
                <Metric label="Estimated total" value={money(estimate.estimatedAnnualTotal)} />
              </div>
              <p className="mt-5 text-sm leading-6 text-muted-foreground">
                {String(
                  result.disclaimer || "This is an estimate, not an award, approval, or guarantee.",
                )}
              </p>
              {Array.isArray(
                (result.contract as Record<string, unknown> | undefined)?.externalChecks,
              ) &&
              ((result.contract as Record<string, unknown>).externalChecks as string[]).length ? (
                <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                  External checks:{" "}
                  {((result.contract as Record<string, unknown>).externalChecks as string[]).join(
                    "; ",
                  )}
                </div>
              ) : null}
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  set,
  select,
  options,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  set: (key: string, value: string) => void;
  select?: boolean;
  options?: string[];
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {select ? (
        <Select value={value} onValueChange={(next) => set(name, next)}>
          <SelectTrigger id={name}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options?.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={name}
          type="number"
          min="0"
          step="0.5"
          value={value}
          placeholder={placeholder}
          onChange={(event) => set(name, event.target.value)}
        />
      )}
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-background/70 p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
