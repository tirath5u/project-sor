import { ChevronDown, FunctionSquare } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { money, num, type StudentForm, type StudentEstimate } from "./shared";

/**
 * Six-step walkthrough using the student's own numbers. Collapsed by default so
 * the page stays calm; students who want the arithmetic can open it.
 */
export function HowItWorks({
  form,
  estimate,
  normalTotal,
}: {
  form: StudentForm;
  estimate: StudentEstimate;
  normalTotal: number;
}) {
  const ft = num(form.fullTimeCreditsPerTerm);
  const fall = num(form.fallCredits);
  const spring = num(form.springCredits);
  const taken = fall + spring;
  const fullYear = ft * 2;
  const raw = fullYear > 0 ? (taken / fullYear) * 100 : 0;
  const percent = Math.round(estimate.sorPercent * 100);

  const steps = [
    {
      label: "Add up the credits you are taking this year",
      math: `${fall} fall + ${spring} spring = ${taken} credits`,
      why: "The reduction looks at your whole academic year, not one term at a time.",
    },
    {
      label: "Work out what a full-time year looks like",
      math: `${ft} × 2 terms = ${fullYear} credits`,
      why: "Your school publishes the full-time credit load; two standard terms make the year.",
    },
    {
      label: "Divide your credits by the full-time year",
      math: `${taken} ÷ ${fullYear} = ${raw.toFixed(2)}%`,
      why: "This is the share of a full-time year you are actually enrolled for.",
    },
    {
      label: "Round to a whole percent",
      math: `${raw.toFixed(2)}% → ${percent}%`,
      why: "The rule uses whole percents, so the raw figure is rounded once here.",
    },
    {
      label: "Find the normal limit for your year in school",
      math: money(normalTotal),
      why: "Federal law sets a yearly maximum by year in school and dependency status.",
    },
    {
      label: "Apply your percentage, then split across terms",
      math: `${money(normalTotal)} × ${percent}% = ${money(estimate.estimatedAnnualTotal)}`,
      why: `Your school then divides it between terms, about ${money(estimate.estimatedAnnualTotal / 2)} each.`,
    },
  ];

  return (
    <Collapsible className="rounded-2xl border border-border bg-card shadow-sm">
      <CollapsibleTrigger className="group flex w-full items-center justify-between gap-4 p-5 text-left sm:p-6">
        <span className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <FunctionSquare className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-display text-lg font-semibold">
              Where this number came from
            </span>
            <span className="block text-sm text-muted-foreground">
              Six steps, using the credits you entered.
            </span>
          </span>
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
          aria-hidden="true"
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ol className="space-y-3 border-t border-border p-5 sm:p-6">
          {steps.map((step, index) => (
            <li key={step.label} className="flex gap-3.5 rounded-xl bg-muted/40 p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="font-medium">{step.label}</p>
                <p className="mt-2 inline-block rounded-md border border-border bg-background px-2 py-1 font-mono text-xs tabular-nums">
                  {step.math}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.why}</p>
              </div>
            </li>
          ))}
        </ol>
      </CollapsibleContent>
    </Collapsible>
  );
}
