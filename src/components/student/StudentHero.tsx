import { CheckCircle2, Lock, Timer } from "lucide-react";

const chips = [
  { icon: Lock, label: "No login, no personal info" },
  { icon: Timer, label: "About one minute" },
  { icon: CheckCircle2, label: "Free to use" },
];

const steps = [
  { n: "1", title: "Tell us your credits", body: "Fall and spring credits, plus what your school counts as full-time." },
  { n: "2", title: "We apply the reduction", body: "The same tested engine financial aid offices use runs your numbers." },
  { n: "3", title: "See your estimate", body: "Your reduced annual Direct Loan maximum, in plain dollars." },
];

export function StudentHero() {
  return (
    <div className="space-y-8">
      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">For students</p>
        <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
          Will my student loan be <span className="text-brand">reduced</span> this year?
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          If you are taking fewer credits than full-time, new federal rules can lower how much you
          can borrow. Answer a few questions and see an estimate before your bill is due.
        </p>
      </div>

      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <li
            key={chip.label}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand"
          >
            <chip.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {chip.label}
          </li>
        ))}
      </ul>

      <ol className="space-y-4 border-t border-border pt-6">
        {steps.map((step) => (
          <li key={step.n} className="flex gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foreground font-display text-xs font-bold text-background">
              {step.n}
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold">{step.title}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}