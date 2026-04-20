/**
 * Card view — same data as TermsMatrix, one card per term, side-by-side.
 * Better for narrow viewports.
 */
import { fmtCurrency, type SORResults } from "@/lib/sor";
import { StatusChip } from "./StatusChip";
import { cn } from "@/lib/utils";

export function TermsCards({ results }: { results: SORResults }) {
  const visible = results.termResults.filter((t) => t.enabled);
  if (visible.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
        Enable at least one term to see disbursements.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {visible.map((t) => {
        const subCapped = t.coaCapSub > 0 && t.calcSub > t.coaCapSub;
        const unsubCapped = t.coaCapUnsub > 0 && t.calcUnsub > t.coaCapUnsub;
        const hasAdj = t.adjustmentSub !== 0 || t.adjustmentUnsub !== 0;
        return (
          <div
            key={t.key}
            className="rounded-xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold text-foreground">{t.label}</div>
              <div className="flex items-center gap-1">
                {t.disbursed ? (
                  <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                    paid
                  </span>
                ) : null}
                <StatusChip status={t.status} />
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <dt className="text-muted-foreground">FT / Enrolled</dt>
              <dd className="text-right tabular-nums text-foreground">
                {t.ftCredits} / {t.effectiveCredits}
              </dd>
              <dt className="text-muted-foreground">Term %</dt>
              <dd
                className={cn(
                  "text-right tabular-nums text-foreground",
                  t.termPct > 1 && "font-semibold text-primary",
                )}
              >
                {Math.round(t.termPct * 100)}%
              </dd>
              <dt className="text-muted-foreground">Intensity %</dt>
              <dd
                className={cn(
                  "text-right tabular-nums text-foreground",
                  t.intensityPct > 1 && "font-semibold text-primary",
                )}
              >
                {Math.round(t.intensityPct * 100)}%
              </dd>
              <dt className="text-muted-foreground">Share Sub</dt>
              <dd className="text-right tabular-nums text-foreground">
                {fmtCurrency(t.shareSub)}
              </dd>
              <dt className="text-muted-foreground">Share Unsub</dt>
              <dd className="text-right tabular-nums text-foreground">
                {fmtCurrency(t.shareUnsub)}
              </dd>
              <dt className="text-muted-foreground">Net Paid Sub</dt>
              <dd className="text-right tabular-nums text-foreground">
                {fmtCurrency(t.netPaidSub)}
              </dd>
              <dt className="text-muted-foreground">Net Paid Unsub</dt>
              <dd className="text-right tabular-nums text-foreground">
                {fmtCurrency(t.netPaidUnsub)}
              </dd>
            </dl>
            <div className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2">
              <div
                className={cn(
                  "rounded-md bg-primary/5 px-2 py-1.5",
                  subCapped && "bg-warning/15",
                )}
              >
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Final Sub
                </div>
                <div className="text-sm font-bold tabular-nums text-foreground">
                  {fmtCurrency(t.finalSub)}
                </div>
              </div>
              <div
                className={cn(
                  "rounded-md bg-primary/5 px-2 py-1.5",
                  unsubCapped && "bg-warning/15",
                )}
              >
                <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Final Unsub
                </div>
                <div className="text-sm font-bold tabular-nums text-foreground">
                  {fmtCurrency(t.finalUnsub)}
                </div>
              </div>
            </div>
            {hasAdj ? (
              <div className="mt-2 rounded-md bg-accent/20 px-2 py-1 text-[10px] text-accent-foreground">
                Adj: {fmtCurrency(t.adjustmentSub)} Sub /{" "}
                {fmtCurrency(t.adjustmentUnsub)} Unsub
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
