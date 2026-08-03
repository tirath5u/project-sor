import { Check, X } from "lucide-react";

const does = [
  "Estimates your reduced annual Direct Loan maximum for a Fall + Spring year",
  "Uses the same tested calculation engine as the staff calculator",
  "Shows the subsidized and unsubsidized split",
  "Works without any account or personal information",
];

const doesNot = [
  "Decide your final award — only your school can do that",
  "Check cost of attendance, other aid, SAP, or lifetime limits",
  "Cover single-term, summer, module, or withdrawal situations",
  "Include Parent PLUS or Grad PLUS eligibility",
];

export function ScopeNotes() {
  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <Panel title="What this does" items={does} tone="yes" />
      <Panel title="What it can't tell you" items={doesNot} tone="no" />
    </section>
  );
}

function Panel({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "yes" | "no";
}) {
  const Icon = tone === "yes" ? Check : X;
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
            <Icon
              className={
                tone === "yes"
                  ? "mt-0.5 h-4 w-4 shrink-0 text-brand"
                  : "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
              }
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}