import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { money, num, type StudentForm, type StudentEstimate } from "./shared";

type Note = { tone: "good" | "warn" | "bad"; text: string };

const TONES = {
  good: { className: "border-success/35 bg-success/10 text-foreground", Icon: CheckCircle2 },
  warn: { className: "border-warning/45 bg-warning/10 text-foreground", Icon: AlertTriangle },
  bad: { className: "border-destructive/35 bg-destructive/5 text-foreground", Icon: XCircle },
} as const;

export function buildNotes(
  form: StudentForm,
  estimate: StudentEstimate,
  normalTotal: number,
): Note[] {
  const notes: Note[] = [];
  const ft = num(form.fullTimeCreditsPerTerm);
  const fall = num(form.fallCredits);
  const spring = num(form.springCredits);
  const halfTime = ft / 2;
  const percent = Math.round(estimate.sorPercent * 100);

  if (form.awardYear === "2025-26") {
    notes.push({
      tone: "good",
      text: "No reduction applies for 2025-26. This new limit only starts with the 2026-27 school year.",
    });
  }
  if (fall > 0 && fall < halfTime) {
    notes.push({
      tone: "bad",
      text: `Fall is below half time (${halfTime} credits). No Direct Loan can be paid for a term below half time, no matter what your percentage is.`,
    });
  }
  if (spring > 0 && spring < halfTime) {
    notes.push({
      tone: "bad",
      text: `Spring is below half time (${halfTime} credits). No Direct Loan can be paid for a term below half time, no matter what your percentage is.`,
    });
  }
  if (fall === 0 || spring === 0) {
    notes.push({
      tone: "warn",
      text: "One term has zero credits. Single-term enrollment follows different rules, so use the Advanced estimate and have your school review it.",
    });
  }
  if (percent > 0 && percent < 100) {
    const shortfall = Math.max(0, ft * 2 - fall - spring);
    const restore = Math.max(0, normalTotal - estimate.estimatedAnnualTotal);
    notes.push({
      tone: "good",
      text: `You are ${shortfall} credits short of a full-time year. Adding those credits could restore up to ${money(restore)} of borrowing.`,
    });
  }
  if (fall + spring > ft * 2) {
    notes.push({
      tone: "good",
      text: "You are above a full-time year. Extra credits do not raise your limit above the normal maximum.",
    });
  }
  if (form.programLevel === "graduate") {
    notes.push({
      tone: "warn",
      text: "Grad PLUS is being phased out separately by the same law, and it is not part of this estimate.",
    });
  }
  return notes;
}

export function EstimateResult({
  form,
  estimate,
  normalSub,
  normalUnsub,
  stale,
}: {
  form: StudentForm;
  estimate: StudentEstimate;
  normalSub: number;
  normalUnsub: number;
  stale: boolean;
}) {
  const percent = Math.round(estimate.sorPercent * 100);
  const normalTotal = normalSub + normalUnsub;
  const notes = buildNotes(form, estimate, normalTotal);
  const reduced = percent < 100;
  const perTerm = estimate.estimatedAnnualTotal / 2;

  const rows = [
    { label: "Direct Subsidized", normal: normalSub, yours: estimate.estimatedAnnualSub },
    { label: "Direct Unsubsidized", normal: normalUnsub, yours: estimate.estimatedAnnualUnsub },
  ];

  return (
    <div
      className="grid gap-4 lg:grid-cols-2"
      data-stale={stale ? "true" : undefined}
      aria-live="polite"
    >
      <section className="rounded-2xl border border-primary/25 bg-gradient-to-br from-accent/70 to-card p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Your Schedule of Reductions percentage
        </p>
        <p className="mt-3 font-display text-6xl font-semibold tabular-nums text-primary sm:text-7xl">
          {percent}
          <span className="text-4xl sm:text-5xl">%</span>
        </p>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          You can borrow {percent}% of the normal yearly limit for your year in school.
        </p>

        <div className="mt-6">
          <div
            className="flex h-3 w-full overflow-hidden rounded-full bg-muted"
            role="img"
            aria-label={`${percent}% of the normal limit kept, ${100 - percent}% reduced`}
          >
            <div className="bg-primary" style={{ width: `${Math.min(100, percent)}%` }} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> You keep {percent}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/35" /> Reduced{" "}
              {Math.max(0, 100 - percent)}%
            </span>
          </div>
        </div>

        {notes.length ? (
          <ul className="mt-6 space-y-2.5">
            {notes.map((note) => {
              const tone = TONES[note.tone];
              return (
                <li
                  key={note.text}
                  className={`flex gap-2.5 rounded-lg border p-3 text-sm leading-6 ${tone.className}`}
                >
                  <tone.Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{note.text}</span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          What you could borrow this year
        </p>
        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="pb-2 font-medium">
                Loan
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Normally
              </th>
              <th scope="col" className="pb-2 text-right font-medium">
                Your estimate
              </th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-border/70">
                <th scope="row" className="py-3 text-left font-normal">
                  {row.label}
                </th>
                <td className="py-3 text-right text-muted-foreground">
                  {reduced ? <s>{money(row.normal)}</s> : money(row.normal)}
                </td>
                <td className="py-3 text-right font-semibold">{money(row.yours)}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="pt-3 text-left font-display font-semibold">
                Total for the year
              </th>
              <td className="pt-3 text-right text-muted-foreground">
                {reduced ? <s>{money(normalTotal)}</s> : money(normalTotal)}
              </td>
              <td className="pt-3 text-right font-display text-lg font-semibold text-primary">
                {money(estimate.estimatedAnnualTotal)}
              </td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 flex gap-2 text-sm leading-6 text-muted-foreground">
          <Info className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          Split across two terms that is about {money(perTerm)} for fall and {money(perTerm)} for
          spring, before loan fees and before your school applies cost of attendance and other aid.
        </p>
      </section>
    </div>
  );
}