import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
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

const UNKNOWN = "unknown";

/**
 * Student-readable choices. The raw engine codes never reach the screen.
 */
const GRADE_LEVELS: { value: string; label: string }[] = [
  { value: "g0", label: "Undergraduate, first year, no credits completed yet" },
  { value: "g1", label: "Undergraduate, first year" },
  { value: "g2", label: "Undergraduate, second year" },
  { value: "g3", label: "Undergraduate, third year" },
  { value: "g4", label: "Undergraduate, fourth year" },
  { value: "g5", label: "Undergraduate, fifth year or beyond" },
  { value: "g8", label: "Graduate, never in a professional program" },
  { value: "g9", label: "Graduate, previously in a professional program" },
  { value: "g10", label: "Professional, never in a graduate program" },
  { value: "g11", label: "Professional, previously in a graduate program" },
  { value: "g12", label: "In both, mostly graduate coursework" },
  { value: "g13", label: "In both, mostly professional coursework" },
];

const AY_TYPES = [
  { value: "SAY", label: "Standard fall and spring academic year" },
  { value: "BBAY1", label: "Academic year that starts when I start (BBAY 1)" },
  { value: "BBAY2", label: "Academic year that starts when I start (BBAY 2)" },
];

const SCOPES = [
  { value: "annualMultiTerm", label: "A full academic year, more than one term" },
  { value: "singleTerm", label: "A single term only" },
];

const METHODS = [
  { value: "equal", label: "Split evenly across my terms" },
  { value: "proportional", label: "Split in proportion to my credits each term" },
];

const GRAD_LEVELS = new Set(["g8", "g9", "g10", "g11", "g12", "g13"]);

function buildAdvanced(form: Record<string, string | boolean>) {
  const base = defaultInputs();
  const summer = Boolean(form.summer);
  const scope = form.scope as SORInputs["loanPeriodScope"];
  const input = {
    ...base,
    awardYear: form.awardYear as SORInputs["awardYear"],
    programLevel: GRAD_LEVELS.has(String(form.gradeLevel))
      ? ("graduate" as const)
      : ("undergraduate" as const),
    gradeLevel: form.gradeLevel as SORInputs["gradeLevel"],
    dependency: form.dependency as SORInputs["dependency"],
    loanPeriodScope: scope,
    ayType: form.ayType as SORInputs["ayType"],
    numStandardTerms: 2 as const,
    ayFtCredits: Number(form.ayFtCredits),
    annualNeed: Number(form.annualNeed),
    coa: Number(form.coa),
    otherAid: Number(form.otherAid),
    distributionModel: form.method as SORInputs["distributionModel"],
    includeSummer1: summer,
    summerPosition: (summer ? "trailer" : "none") as SORInputs["summerPosition"],
    terms: { ...base.terms },
    studentDisclosureAcknowledged: true,
  } as SORInputs & Record<string, unknown>;

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
    enrolledCredits: summer ? Number(form.summerCredits) : 0,
  };
  for (const key of ["term3", "term4", "summer2", "winter1", "winter2"] as const)
    input.terms[key] = { ...base.terms[key], enabled: false, enrolledCredits: 0 };

  // "I do not know" leaves the derived denominator in place and lets the shared
  // engine attach its institutional-verification external check. It is never
  // silently replaced with a guess.
  if (form.denominatorOverride !== "" && form.denominatorOverride !== UNKNOWN) {
    input.ayFtCredits = Number(form.denominatorOverride);
    input.ayDenominatorVerified = true;
  }
  if (scope === "singleTerm") input.coaScope = "singleTerm";
  return input;
}

function AdvancedStudentPage() {
  const [form, setForm] = React.useState<Record<string, string | boolean>>({
    awardYear: "2026-27",
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
  const [acknowledged, setAcknowledged] = React.useState(false);
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

  const isGradOrProf = GRAD_LEVELS.has(String(form.gradeLevel));

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
  const externalChecks =
    ((result?.contract as Record<string, unknown> | undefined)?.externalChecks as
      | string[]
      | undefined) ?? [];

  return (
    <main id="main">
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <header className="max-w-3xl space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Advanced estimate for students
          </p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Add your school's own numbers
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            If your school has given you a cost of attendance and an aid offer, you can use those
            figures here for a closer estimate. The same tested calculation runs behind this form.
            It does not create an award and it does not decide your eligibility.
          </p>
        </header>

        <form onSubmit={submit} className="space-y-6">
          <Section
            title="About you"
            note="Your school sets these. If you are not certain, ask before relying on the result."
          >
            <ChoiceField
              name="awardYear"
              label="Award year"
              required
              help="The 2026-27 limits changed for many graduate and professional borrowers."
              value={String(form.awardYear)}
              set={set}
              options={[
                { value: "2026-27", label: "2026-27" },
                { value: "2025-26", label: "2025-26" },
              ]}
            />
            <ChoiceField
              name="gradeLevel"
              label="Where you are in your program"
              required
              help="Choose the description that matches your current year and program type. Your school assigns this."
              value={String(form.gradeLevel)}
              set={set}
              options={GRADE_LEVELS}
            />
            <ChoiceField
              name="dependency"
              label="Dependency status on your FAFSA"
              required
              help="Your FAFSA result shows this. It affects undergraduate loan limits."
              value={String(form.dependency)}
              set={set}
              options={[
                { value: "dependent", label: "Dependent" },
                { value: "independent", label: "Independent" },
              ]}
            />
          </Section>

          <Section
            title="Your academic year"
            note="The school defines full-time and defines the academic year. These are not standard across schools."
          >
            <ChoiceField
              name="scope"
              label="What this loan covers"
              required
              help="A single-term loan is calculated differently from a full-year loan."
              value={String(form.scope)}
              set={set}
              options={SCOPES}
            />
            <ChoiceField
              name="ayType"
              label="How your academic year is set up"
              required
              help="Most students are on a standard fall and spring year. If you are not sure, ask your school."
              value={String(form.ayType)}
              set={set}
              options={AY_TYPES}
            />
            <NumberField
              name="ftCredits"
              label="Credits your school calls full-time in one term"
              required
              help="Often 12 for undergraduates and 9 for graduate students, but your school decides."
              value={String(form.ftCredits)}
              set={set}
            />
            <ChoiceOrNumberField
              name="denominatorOverride"
              label="Credits in your school's full academic year"
              help="If you do not know, choose that option. The estimate will still run and will tell you this needs confirming."
              value={String(form.denominatorOverride)}
              set={set}
            />
          </Section>

          <Section
            title="Your costs and aid"
            note="Use the figures from your school's offer letter, not your bill or your account balance."
          >
            <NumberField
              name="coa"
              label="Cost of attendance for this period"
              required
              help="The school's published cost of attendance for the same period this loan covers."
              value={String(form.coa)}
              set={set}
            />
            <NumberField
              name="otherAid"
              label="Other financial assistance"
              required
              help="Grants, scholarships, and other aid counted against your cost of attendance."
              value={String(form.otherAid)}
              set={set}
            />
            <NumberField
              name="annualNeed"
              label="Financial need"
              required
              help="From your school. Need is cost of attendance minus your Student Aid Index and other aid."
              value={String(form.annualNeed)}
              set={set}
            />
            <ChoiceField
              name="method"
              label="How your school splits the loan across terms"
              required
              help="Ask your school which method it uses. It changes the amount per term, not the annual total."
              value={String(form.method)}
              set={set}
              options={METHODS}
            />
          </Section>

          <Section
            title="Your enrolled credits"
            note="Enter the credits you are actually enrolled in for each term."
          >
            <NumberField
              name="fallCredits"
              label="Fall credits"
              required
              value={String(form.fallCredits)}
              set={set}
            />
            <NumberField
              name="springCredits"
              label="Spring credits"
              required
              value={String(form.springCredits)}
              set={set}
            />
            <div className="flex items-center gap-3 rounded-md border border-border/70 px-3 py-2">
              <Checkbox
                id="summer"
                checked={Boolean(form.summer)}
                onCheckedChange={(checked) => set("summer", Boolean(checked))}
              />
              <Label htmlFor="summer" className="text-sm font-normal">
                My loan also covers a summer term
              </Label>
            </div>
            {form.summer ? (
              <NumberField
                name="summerCredits"
                label="Summer credits"
                required
                value={String(form.summerCredits)}
                set={set}
              />
            ) : null}
          </Section>

          <Section
            title="Money already paid out"
            note="Optional. These are gross loan amounts already disbursed for this same academic year, before fees were deducted. They are not your account balance and not a refund you received."
          >
            <NumberField
              name="fallPaidSub"
              label="Fall subsidized already disbursed"
              optional
              value={String(form.fallPaidSub)}
              set={set}
            />
            <NumberField
              name="fallPaidUnsub"
              label="Fall unsubsidized already disbursed"
              optional
              value={String(form.fallPaidUnsub)}
              set={set}
            />
            <NumberField
              name="springPaidSub"
              label="Spring subsidized already disbursed"
              optional
              value={String(form.springPaidSub)}
              set={set}
            />
            <NumberField
              name="springPaidUnsub"
              label="Spring unsubsidized already disbursed"
              optional
              value={String(form.springPaidUnsub)}
              set={set}
            />
          </Section>

          {isGradOrProf ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm leading-6">
              <p className="font-semibold">Looking for a Grad PLUS estimate?</p>
              <p className="mt-1 text-muted-foreground">
                Choosing a graduate or professional level here does not produce a Grad PLUS figure
                on its own. For 2026-27 that depends on whether the loan limit exception applies to
                you, which only your school and the COD System can confirm.{" "}
                <Link
                  to="/student/loan-limit-exception"
                  className="font-medium text-primary underline underline-offset-4"
                >
                  Start with the loan limit exception check
                </Link>
                .
              </p>
            </div>
          ) : null}

          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm leading-6">
            <p className="font-semibold">Parent PLUS</p>
            <p className="mt-1 text-muted-foreground">
              Parent PLUS is not estimated here. A parent's borrowing history and credit decision
              are reviewed by your school and the Department, so we do not ask you to estimate them.
            </p>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <Checkbox
              id="acknowledge-advanced"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(Boolean(checked))}
            />
            <Label htmlFor="acknowledge-advanced" className="text-sm font-normal leading-6">
              I understand this is an estimate based on figures I entered. It is not an award, an
              approval, or a guarantee that I will receive money.
            </Label>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading || !acknowledged}>
            {loading ? "Calculating..." : "Calculate advanced estimate"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </form>

        {result && estimate ? (
          <section
            aria-live="polite"
            className="rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Info className="h-4 w-4" /> Advanced estimate
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Reduction percentage"
                value={
                  typeof estimate.sorPercent === "number"
                    ? `${Math.round(estimate.sorPercent * 100)}%`
                    : "Not available"
                }
              />
              <Metric label="Estimated subsidized" value={money(estimate.estimatedAnnualSub)} />
              <Metric label="Estimated unsubsidized" value={money(estimate.estimatedAnnualUnsub)} />
              <Metric label="Estimated total" value={money(estimate.estimatedAnnualTotal)} />
            </div>
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              {String(
                result.disclaimer || "This is an estimate, not an award, approval, or guarantee.",
              )}
            </p>
            {externalChecks.length ? (
              <div className="mt-4 rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold">What your school still needs to confirm</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                  {externalChecks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <legend className="px-1 text-sm font-semibold">{title}</legend>
      {note ? <p className="text-xs leading-5 text-muted-foreground">{note}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

function FieldShell({
  name,
  label,
  help,
  required,
  optional,
  children,
}: {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name} className="text-sm leading-6">
        {label}
        {required ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">Required</span>
        ) : null}
        {optional ? (
          <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
        ) : null}
      </Label>
      {help ? (
        <p id={`${name}-help`} className="text-xs leading-5 text-muted-foreground">
          {help}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function ChoiceField({
  name,
  label,
  help,
  required,
  value,
  set,
  options,
}: {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  value: string;
  set: (key: string, value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <FieldShell name={name} label={label} help={help} required={required}>
      <Select value={value} onValueChange={(next) => set(name, next)}>
        <SelectTrigger id={name} aria-describedby={help ? `${name}-help` : undefined}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FieldShell>
  );
}

function NumberField({
  name,
  label,
  help,
  required,
  optional,
  value,
  set,
}: {
  name: string;
  label: string;
  help?: string;
  required?: boolean;
  optional?: boolean;
  value: string;
  set: (key: string, value: string) => void;
}) {
  return (
    <FieldShell name={name} label={label} help={help} required={required} optional={optional}>
      <Input
        id={name}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={value}
        placeholder={optional ? "Leave blank if none" : undefined}
        aria-describedby={help ? `${name}-help` : undefined}
        onChange={(event) => set(name, event.target.value)}
      />
    </FieldShell>
  );
}

/** A number field that also offers an explicit "I do not know" answer. */
function ChoiceOrNumberField({
  name,
  label,
  help,
  value,
  set,
}: {
  name: string;
  label: string;
  help?: string;
  value: string;
  set: (key: string, value: string) => void;
}) {
  const unknown = value === UNKNOWN;
  return (
    <FieldShell name={name} label={label} help={help} optional>
      <Input
        id={name}
        type="number"
        inputMode="decimal"
        min="0"
        step="0.5"
        value={unknown ? "" : value}
        disabled={unknown}
        placeholder="For example, 24"
        aria-describedby={help ? `${name}-help` : undefined}
        onChange={(event) => set(name, event.target.value)}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id={`${name}-unknown`}
          checked={unknown}
          onCheckedChange={(checked) => set(name, checked ? UNKNOWN : "")}
        />
        <Label htmlFor={`${name}-unknown`} className="text-xs font-normal text-muted-foreground">
          I do not know
        </Label>
      </div>
    </FieldShell>
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
