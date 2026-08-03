import { TriangleAlert } from "lucide-react";

export type StudentEstimate = {
  sorPercent: number;
  estimatedAnnualSub: number;
  estimatedAnnualUnsub: number;
  estimatedAnnualTotal: number;
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

export function EstimateResult({
  estimate,
  disclaimer,
  warnings,
}: {
  estimate: StudentEstimate;
  disclaimer?: string;
  warnings?: string[];
}) {
  const pct = Math.round(estimate.sorPercent * 100);
  const full = estimate.sorPercent > 0 ? estimate.estimatedAnnualTotal / estimate.sorPercent : 0;

  return (
    <section
      aria-live="polite"
      className="overflow-hidden rounded-2xl border border-brand/25 bg-card shadow-[var(--shadow-elegant)]"
    >
      <div className="border-b border-brand/20 bg-brand-soft px-5 py-6 sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Your estimate</p>
        <p className="mt-3 font-display text-5xl font-bold leading-none tracking-tight text-brand sm:text-6xl">
          {pct}%
        </p>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-foreground/80">
          Based on your credits, about <span className="font-semibold">{pct}%</span> of the full
          annual Direct Loan maximum applies — roughly{" "}
          <span className="font-semibold">{money(estimate.estimatedAnnualTotal)}</span> for the year.
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-7">
        {full > 0 ? (
          <div className="space-y-2">
            <div className="flex items-baseline justify-between text-xs text-muted-foreground">
              <span>Reduced maximum</span>
              <span>Full-time maximum {money(full)}</span>
            </div>
            <div
              className="h-3 w-full overflow-hidden rounded-full bg-muted"
              role="img"
              aria-label={`Reduced maximum is ${pct} percent of the full-time maximum`}
            >
              <div
                className="h-full rounded-full bg-brand transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
              />
            </div>
          </div>
        ) : null}

        <dl className="grid gap-3 sm:grid-cols-3">
          <Stat label="Estimated total" value={money(estimate.estimatedAnnualTotal)} emphasis />
          <Stat label="Subsidized" value={money(estimate.estimatedAnnualSub)} />
          <Stat label="Unsubsidized" value={money(estimate.estimatedAnnualUnsub)} />
        </dl>

        {warnings?.length ? (
          <div className="rounded-xl border border-border bg-muted/50 p-4">
            <p className="flex items-center gap-1.5 font-display text-sm font-semibold">
              <TriangleAlert className="h-4 w-4 shrink-0 text-brand" aria-hidden />
              Things to check
            </p>
            <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-muted-foreground">
              {warnings.map((warning) => (
                <li key={warning}>• {warning}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {disclaimer ? (
          <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
            {disclaimer}
          </p>
        ) : null}
      </div>
    </section>
  );
}

function Stat({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={
          emphasis
            ? "mt-1 font-display text-2xl font-bold tracking-tight text-brand"
            : "mt-1 font-display text-2xl font-semibold tracking-tight"
        }
      >
        {value}
      </dd>
    </div>
  );
}