import { CalendarClock, Layers, Sparkles, Sigma } from "lucide-react";

const FACTS = [
  {
    icon: CalendarClock,
    lead: "Starts 2026-27",
    detail: "Nothing changes for the 2025-26 school year.",
  },
  {
    icon: Layers,
    lead: "Covers Sub, Unsub, and Grad PLUS",
    detail: "Parent PLUS is not reduced by this rule.",
  },
  {
    icon: Sigma,
    lead: "Counts your whole year",
    detail: "A light fall can be balanced by a heavier spring.",
  },
];

/**
 * Purpose-first hero. Leads with what the tool answers in plain language
 * before naming the law, then grounds it with three fact cards.
 */
export function StudentHero() {
  return (
    <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-accent/60 to-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-10 pb-8 sm:px-6 sm:py-12 sm:pb-10">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Free student loan estimator
        </span>
        <h1 className="mt-5 max-w-3xl font-display text-3xl font-semibold leading-tight sm:text-4xl lg:text-5xl">
          Taking fewer than full-time credits? Find out how much federal loan you can still
          borrow.
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
          A new federal law, the One Big Beautiful Bill Act, changes Direct Loans starting with the
          2026-27 school year. If you enroll less than full time, your yearly borrowing limit is cut
          to match the credits you actually take. That cut is called the{" "}
          <span className="font-semibold text-foreground">Schedule of Reductions</span>. Enter your
          credits below to estimate your new limit and see exactly how it was worked out.
        </p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-3">
          {FACTS.map((fact) => (
            <li
              key={fact.lead}
              className="rounded-xl border border-border bg-card/80 p-4 shadow-sm backdrop-blur"
            >
              <fact.icon className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="mt-2.5 font-display text-sm font-semibold">{fact.lead}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{fact.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}