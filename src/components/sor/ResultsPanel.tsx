import { CheckCircle2, AlertTriangle, History, FileDown } from "lucide-react";
import { fmtCurrency, fmtCurrencyCents, type SORResults, type SORInputs } from "@/lib/sor";
import { cn } from "@/lib/utils";
import { InfoTip } from "./InfoTip";
import { exportSORCaseFile } from "@/lib/pdfExport";
import { Button } from "@/components/ui/button";

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
          : "border-warning/40 bg-warning/10 text-warning-foreground",
      )}
    >
      {ok ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
      <span className="font-medium">{label}:</span>
      <span>{ok ? "Balanced" : `${diff > 0 ? "Under by" : "Over by"} ${fmtCurrency(Math.abs(diff))}`}</span>
    </div>
  );
}

export function ResultsPanel({
  results,
  inputs,
  scenarioTitle,
  scenarioId,
}: {
  results: SORResults;
  inputs?: SORInputs;
  scenarioTitle?: string;
  scenarioId?: string;
}) {
  const visibleTerms = results.termResults.filter((t) => t.enabled);
  return (
    <div
      id="results-region"
      role="region"
      aria-label="Calculated results"
      aria-live="polite"
      className="space-y-5 xl:border-l-2 xl:border-primary/30 xl:pl-4"
    >
      {inputs ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportSORCaseFile({ inputs, results, scenarioTitle, scenarioId })}
          className="w-full justify-center gap-2 rounded-lg"
        >
          <FileDown className="h-4 w-4" /> Export PDF case file
        </Button>
      ) : null}

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
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide opacity-80">
              Academic Year %
              <InfoTip>Sum of enrolled credits across eligible terms ÷ AY full-time credits, rounded.</InfoTip>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {Math.round(results.sorPctRounded * 100)}%
            </div>
            <div className="text-[11px] opacity-80">
              {results.enrolledSumAll} / {results.ftSumAll} credits
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide opacity-80">
              Raw fraction
              <InfoTip>The unrounded enrollment fraction before SOR rounding rules are applied.</InfoTip>
            </div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {(results.enrollmentFractionRaw * 100).toFixed(2)}%
            </div>
            <div className="text-[11px] opacity-80">Pre-rounding</div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide opacity-80">
              Annual Sub limit
              <InfoTip>Sub baseline × AY %. The reduced annual Sub pool that gets sliced across terms.</InfoTip>
            </div>
            <div className="mt-1 text-xl font-semibold tabular-nums">
              {fmtCurrency(results.reducedSub)}
            </div>
            <div className="text-[11px] opacity-80">
              of {fmtCurrency(results.subBaseline)} initial
            </div>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide opacity-80">
              Annual Unsub limit
              <InfoTip>Unsub baseline × AY %, plus any Sub→Unsub shift if enabled.</InfoTip>
            </div>
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
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          Per-term Disbursements
          <InfoTip label="About per-term disbursements">
            How the reduced annual Sub/Unsub pools are sliced across each eligible term using the chosen distribution rule (Equal or Proportional). Disbursed/paid terms are anchored — the engine never retroactively changes them; the remaining pool is redistributed to future eligible terms. Final values are clamped to per-term COA caps.
          </InfoTip>
        </h3>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-2 font-medium">Term</th>
                <th className="px-2 py-2 text-right font-medium">Term %</th>
                <th className="px-2 py-2 text-right font-medium">Final Sub</th>
                <th className="px-2 py-2 text-right font-medium">Final Unsub</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {visibleTerms.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-muted-foreground">
                    Enable terms to see disbursements.
                  </td>
                </tr>
              ) : (
                visibleTerms.map((t) => {
                  const subCapped = t.coaCapSub > 0 && t.calcSub > t.coaCapSub;
                  const unsubCapped = t.coaCapUnsub > 0 && t.calcUnsub > t.coaCapUnsub;
                  const hasAdj = t.adjustmentSub !== 0 || t.adjustmentUnsub !== 0;
                  return (
                    <tr key={t.key} className="border-b border-border/50">
                      <td className="px-2 py-2 font-medium text-foreground">
                        {t.label}
                        {t.disbursed ? (
                          <span className="ml-1 rounded bg-primary/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-primary">
                            paid
                          </span>
                        ) : null}
                        {hasAdj ? (
                          <span className="ml-1 rounded bg-warning/30 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-warning-foreground">
                            adj
                          </span>
                        ) : null}
                      </td>
                      <td className="px-2 py-2 text-right">
                        {(t.termPct * 100).toFixed(0)}%
                      </td>
                      <td
                        className={cn(
                          "px-2 py-2 text-right font-medium",
                          subCapped && "text-warning-foreground",
                        )}
                      >
                        {fmtCurrency(t.finalSub)}
                      </td>
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
                <td className="px-2 py-2" colSpan={2}>
                  AY Total
                </td>
                <td className="px-2 py-2 text-right">
                  {fmtCurrency(visibleTerms.reduce((s, t) => s + t.finalSub, 0))}
                </td>
                <td className="px-2 py-2 text-right">
                  {fmtCurrency(visibleTerms.reduce((s, t) => s + t.finalUnsub, 0))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {results.recalcHistory.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <History className="h-4 w-4 text-primary" /> Recalculation History
          </h3>
          <ol className="space-y-2 text-[11px]">
            {results.recalcHistory.map((e, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/60 bg-background/60 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    #{i + 1} · {e.triggerLabel} disbursed
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                    {Math.round(e.beforeAyPct * 100)}% → {Math.round(e.afterAyPct * 100)}%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 font-mono text-[10px] text-muted-foreground">
                  <span>
                    Annual Sub: {fmtCurrency(e.beforeAnnualSub)} →{" "}
                    {fmtCurrency(e.afterAnnualSub)}
                  </span>
                  <span>
                    Annual Unsub: {fmtCurrency(e.beforeAnnualUnsub)} →{" "}
                    {fmtCurrency(e.afterAnnualUnsub)}
                  </span>
                </div>
                <p className="mt-1 text-foreground">{e.note}</p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          Verification
          <InfoTip label="About verification">
            Sanity check: sums all per-term Final Sub/Unsub and compares against the reduced annual limits. "Balanced" (ideal) means the engine fully distributed the pool with no rounding loss. "Under by" indicates leftover headroom (e.g. COA caps or ineligible terms truncated the pool); "Over by" would signal a calculation bug.
          </InfoTip>
        </h3>
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

      {results.initialGradPlus > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            Grad PLUS (DLGP)
            <InfoTip label="About Grad PLUS">
              Third parallel bucket for graduate/professional borrowers. Capped at COA minus all other aid (Pell, grants, scholarships, Sub, Unsub). Subject to SOR for 2026-27+. Grade level is the only access gate — LLE/grandfathering does NOT affect Grad PLUS.
            </InfoTip>
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Stat
              label="Initial Max DLGP"
              value={fmtCurrencyCents(results.initialGradPlus)}
              sub={`COA ${fmtCurrency(results.coa)} − aid ${fmtCurrency(results.otherAid)}`}
            />
            <Stat
              label="Reduced Annual DLGP"
              value={fmtCurrencyCents(results.reducedGradPlus)}
              sub={results.sorApplicable ? `× ${Math.round(results.sorPctRounded * 100)}% SOR` : "no SOR (pre-2026-27)"}
            />
          </div>
          <div className="mt-3 -mx-2 overflow-x-auto">
            <table className="w-full min-w-[360px] text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Term</th>
                  <th className="px-2 py-2 text-right font-medium">Final Grad PLUS</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {visibleTerms.map((t) => (
                  <tr key={t.key} className="border-b border-border/50">
                    <td className="px-2 py-2 font-medium text-foreground">{t.label}</td>
                    <td className="px-2 py-2 text-right">{fmtCurrencyCents(t.finalGradPlus)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold text-foreground">
                  <td className="px-2 py-2">AY Total</td>
                  <td className="px-2 py-2 text-right">
                    {fmtCurrencyCents(results.totalFinalGradPlus)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-2">
            <VerifyBadge label="Grad PLUS" diff={results.verifyGradPlus} />
          </div>
        </div>
      ) : null}

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
