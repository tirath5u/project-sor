import { Link } from "@tanstack/react-router";
import { ArrowUpRight, GraduationCap, Terminal } from "lucide-react";

const cards = [
  {
    to: "/student/advanced",
    icon: GraduationCap,
    tag: "Also for students",
    title: "Advanced estimate",
    body: "Add your school's cost of attendance, other aid, summer terms, and anything already paid for a closer projection.",
  },
  {
    to: "/",
    icon: Terminal,
    tag: "Financial aid staff & developers",
    title: "Staff calculator, API & MCP",
    body: "Full term matrix, child terms, comparisons, PDF export, plus the public API and agent integration.",
  },
];

export function AudienceCards() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      {cards.map((card) => (
        <Link
          key={card.title}
          to={card.to}
          className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-brand hover:shadow-[var(--shadow-elegant)] sm:p-6"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-medium text-brand">
              <card.icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
              {card.tag}
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-brand transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
          <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{card.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
        </Link>
      ))}
    </section>
  );
}