import { CheckCircle2, AlertTriangle } from "lucide-react";
import { fmtCurrency, type SORResults } from "@/lib/sor";
import { cn } from "@/lib/utils";

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold text-foreground tabular-nums">{value}</div>
      {sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function VerifyBadge({ label, diff }: { label: string; diff: number }) {
  const ok = Math.abs(diff) < 1;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
        ok
          ? "border-success/30 bg-success/10 text-success"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <span className="font-medium">{label}:</span>
      <span>{ok ? "Balanced" : `Off by ${fmtCurrency(Math.abs(diff))}`}</span>
    </div>
  );
}

export function ResultsPanel({ results }: { results: SORResults }) {
  const visibleTerms = results.termResults.filter((t) => t.enabled);
  return (
    <div className="space-y-5">
      <div
        className="rounded-2xl border border-primary/20 p-5 text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide opacity-90">
            Schedule of Reductions
          </h3>
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium">
            {results.eligibleTermsCount} eligible term{results.eligibleTermsCount === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide opacity-80">SOR %</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {Math.round(results.sorPctRounded * 100)}%
            </div>
            <div className="text-[11px] opacity-80">
              {results.enrolledSumAll} / {results.ftSumAll} credits
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide opacity-80">Raw fraction</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {(results.enrollmentFractionRaw * 100).toFixed(2)}%
            </div>
            <div className="text-[11px] opacity-80">Pre-rounding</div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide opacity-80">SOR Sub limit</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {fmtCurrency(results.reducedSub)}
            </div>
            <div className="text-[11px] opacity-80">
              of {fmtCurrency(results.subBaseline)} initial
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide opacity-80">SOR Unsub limit</div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {fmtCurrency(results.reducedUnsub)}
            </div>
            <div className="text-[11px] opacity-80">
              of {fmtCurrency(results.unsubBaseline)} initial
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Per-term Disbursements</h3>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Term</th>
                <th className="px-2 py-2 text-right font-medium">Calc Sub</th>
                <th className="px-2 py-2 text-right font-medium">Final Sub</th>
                <th className="px-2 py-2 text-right font-medium">Calc Unsub</th>
                <th className="px-2 py-2 text-right font-medium">Final Unsub</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {visibleTerms.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                    Enable terms to see disbursements.
                  </td>
                </tr>
              ) : (
                visibleTerms.map((t) => {
                  const subCapped = t.coaCapSub > 0 && t.calcSub > t.coaCapSub;
                  const unsubCapped = t.coaCapUnsub > 0 && t.calcUnsub > t.coaCapUnsub;
                  return (
                    <tr key={t.key} className="border-b border-border/50">
                      <td className="px-2 py-2 font-medium text-foreground">{t.label}</td>
                      <td className="px-2 py-2 text-right">{fmtCurrency(t.calcSub)}</td>
                      <td
                        className={cn(
                          "px-2 py-2 text-right font-medium",
                          subCapped && "text-warning-foreground",
                        )}
                      >
                        {fmtCurrency(t.finalSub)}
                      </td>
                      <td className="px-2 py-2 text-right">{fmtCurrency(t.calcUnsub)}</td>
                      <td
                        className={cn(
                          "px-2 py-2 text-right font-medium",
                          unsubCapped && "text-warning-foreground",
                        )}
                      >
                        {fmtCurrency(t.finalUnsub)}
                      </td>
                    </tr>
                  );
                })
              )}
              <tr className="bg-muted/40 font-semibold text-foreground">
                <td className="px-2 py-2">AY Total</td>
                <td className="px-2 py-2 text-right">
                  {fmtCurrency(visibleTerms.reduce((s, t) => s + t.calcSub, 0))}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmtCurrency(visibleTerms.reduce((s, t) => s + t.finalSub, 0))}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmtCurrency(visibleTerms.reduce((s, t) => s + t.calcUnsub, 0))}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmtCurrency(visibleTerms.reduce((s, t) => s + t.finalUnsub, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Verification</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <VerifyBadge label="Sub" diff={results.verifySub} />
          <VerifyBadge label="Unsub" diff={results.verifyUnsub} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat
            label="Remaining Sub"
            value={fmtCurrency(results.remainingSub)}
            sub={`net paid ${fmtCurrency(results.netPaidSubTotal)}`}
          />
          <Stat
            label="Remaining Unsub"
            value={fmtCurrency(results.remainingUnsub)}
            sub={`net paid ${fmtCurrency(results.netPaidUnsubTotal)}`}
          />
        </div>
        {results.shiftedToUnsub > 0 ? (
          <div className="mt-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-foreground">
            <span className="font-semibold">Sub → Unsub shift:</span>{" "}
            {fmtCurrency(results.shiftedToUnsub)} moved from Sub to Unsub (combined cap).
          </div>
        ) : null}
      </div>

      {results.warnings.length > 0 ? (
        <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-warning-foreground">
            <AlertTriangle className="h-4 w-4" /> Warnings
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-warning-foreground">
            {results.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
