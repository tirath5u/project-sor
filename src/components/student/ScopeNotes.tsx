import { ShieldAlert } from "lucide-react";

const NOT_CHECKED = [
  "Your cost of attendance",
  "Grants, scholarships, and other aid",
  "Satisfactory academic progress (SAP)",
  "Lifetime and aggregate limits, and NSLDS history",
];

const NEEDS_SCHOOL = [
  "Single-term enrollment",
  "Modules and short sessions",
  "Mid-term withdrawal and R2T4",
  "Non-standard academic years",
];

export function ScopeNotes() {
  return (
    <section aria-labelledby="scope-heading" className="space-y-5">
      <h2 id="scope-heading" className="font-display text-xl font-semibold sm:text-2xl">
        What this estimate does not do
      </h2>
      <div className="flex gap-3 rounded-2xl border border-destructive/35 bg-destructive/5 p-4 sm:p-5">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <p className="text-sm leading-6">
          <span className="font-semibold">
            This is not an official U.S. Department of Education tool.
          </span>{" "}
          It is an independent estimator. Your school makes the final decision on what you can
          borrow, and no information you enter here is collected or stored.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[
          { title: "Not checked here", items: NOT_CHECKED },
          { title: "Needs your school to review", items: NEEDS_SCHOOL },
        ].map((column) => (
          <div key={column.title} className="rounded-2xl border border-border bg-card p-5">
            <p className="font-display text-sm font-semibold">{column.title}</p>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {column.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
