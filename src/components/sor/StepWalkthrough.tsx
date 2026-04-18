/**
 * Step-by-step walkthrough panel — narrates the official 5-step ED process.
 */
import { fmtCurrency, type SORInputs, type SORResults } from "@/lib/sor";

function StepHeader({ n, title }: { n: number; title: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        {n}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    </div>
  );
}

function Eq({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-muted/60 px-3 py-2 font-mono text-[12px] leading-relaxed text-foreground">
      {children}
    </div>
  );
}

export function StepWalkthrough({
  inputs,
  results,
}: {
  inputs: SORInputs;
  results: SORResults;
}) {
  const eligible = results.termResults.filter((t) => t.eligible);
  const enrolledExpr = eligible.map((t) => t.effectiveCredits).join(" + ") || "0";
  const ftExpr = inputs.ayFtCredits > 0 ? String(inputs.ayFtCredits) : "—";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Logic Walkthrough</h2>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          ED 5-Step Process
        </span>
      </div>

      {/* Step 1 */}
      <section className="border-b border-border pb-4">
        <StepHeader n={1} title="Initial Maximum Annual Loan Limit" />
        <p className="mb-2 text-xs text-muted-foreground">
          Annual Need {fmtCurrency(inputs.annualNeed)} is split: Sub takes the lesser of need
          and the Sub statutory cap; Unsub gets the remainder up to the Unsub cap.
          {results.additionalUnsubBase > 0
            ? " Additional Unsub headroom (PLUS denial) is added to the Unsub ceiling."
            : ""}
          {results.doubleReductionApplied
            ? " Double-reduction: Need is reduced by SOR % FIRST (per 4/15 VFG)."
            : ""}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Eq>
            <div className="text-muted-foreground">Sub:</div>
            min({fmtCurrency(inputs.subStatutory)},{" "}
            {fmtCurrency(
              results.doubleReductionApplied ? results.subNeedAdjusted : results.subNeed,
            )}
            ) ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.subBaseline)}</span>
          </Eq>
          <Eq>
            <div className="text-muted-foreground">
              Unsub{results.additionalUnsubBase > 0 ? " (+ Addl Unsub)" : ""}:
            </div>
            min({fmtCurrency(inputs.unsubStatutory)},{" "}
            {fmtCurrency(
              results.doubleReductionApplied ? results.unsubNeedAdjusted : results.unsubNeed,
            )}
            )
            {results.additionalUnsubBase > 0
              ? ` + ${fmtCurrency(results.additionalUnsubBase)}`
              : ""}{" "}
            ={" "}
            <span className="font-semibold text-primary">
              {fmtCurrency(results.unsubBaseline + results.additionalUnsubBase)}
            </span>
          </Eq>
        </div>
      </section>

      {/* Step 2 */}
      <section className="border-b border-border py-4">
        <StepHeader n={2} title="AY Enrollment % → Annual Loan Limit" />
        <Eq>
          AY % = ({enrolledExpr}) ÷ {ftExpr}
          <br />={" "}
          <span className="font-semibold text-primary">
            {(results.enrollmentFractionRaw * 100).toFixed(2)}%
          </span>{" "}
          → rounded ={" "}
          <span className="font-semibold text-primary">
            {Math.round(results.sorPctRounded * 100)}%
          </span>
        </Eq>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Eq>
            <div className="text-muted-foreground">Annual Sub limit:</div>
            {fmtCurrency(results.subBaseline)} × {Math.round(results.sorPctRounded * 100)}% ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedSub)}</span>
          </Eq>
          <Eq>
            <div className="text-muted-foreground">Annual Unsub limit:</div>
            {fmtCurrency(results.unsubBaseline)} × {Math.round(results.sorPctRounded * 100)}%
            {results.shiftedToUnsub > 0
              ? ` + ${fmtCurrency(results.shiftedToUnsub)} shift`
              : ""}{" "}
            ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedUnsub)}</span>
          </Eq>
        </div>
        {results.noReduction ? (
          <p className="mt-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            ✓ Student is full-time for the AY — no SOR reduction is required.
          </p>
        ) : null}
      </section>

      {/* Step 3 */}
      <section className="border-b border-border py-4">
        <StepHeader n={3} title="Per-term Share of the Annual Limit" />
        <p className="mb-2 text-xs text-muted-foreground">
          {inputs.distributionModel === "equal"
            ? "Equal model — annual ÷ N eligible terms (whole-dollar; last term absorbs remainder)."
            : "Proportional model — annual × (term FT credits ÷ Σ term FT credits)."}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-[11px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Term</th>
                <th className="px-2 py-1.5 text-right font-medium">Share Sub</th>
                <th className="px-2 py-1.5 text-right font-medium">Share Unsub</th>
              </tr>
            </thead>
            <tbody>
              {results.termResults
                .filter((t) => t.enabled)
                .map((t) => (
                  <tr key={t.key} className="border-b border-border/40">
                    <td className="px-2 py-1.5 font-medium text-foreground">{t.label}</td>
                    <td className="px-2 py-1.5 text-right">
                      {t.eligible ? fmtCurrency(t.shareSub) : "—"}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {t.eligible ? fmtCurrency(t.shareUnsub) : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Step 4 + 5 */}
      <section className="pt-4">
        <StepHeader n={4} title="Per-term % × Share = Disbursement" />
        <p className="mb-2 text-xs text-muted-foreground">
          Term % = enrolled ÷ term FT (can exceed 100%). Disbursement = share × min(%, 100%);
          overflow + lapsed shares forward to remaining eligible terms with headroom (v18 § H).
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[11px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Term</th>
                <th className="px-2 py-1.5 text-right font-medium">Term %</th>
                <th className="px-2 py-1.5 text-right font-medium">Calc Sub</th>
                <th className="px-2 py-1.5 text-right font-medium">Calc Unsub</th>
              </tr>
            </thead>
            <tbody>
              {results.termResults
                .filter((t) => t.enabled)
                .map((t) => {
                  const overload = t.termPct > 1;
                  return (
                    <tr key={t.key} className="border-b border-border/40">
                      <td className="px-2 py-1.5 font-medium text-foreground">{t.label}</td>
                      <td
                        className={`px-2 py-1.5 text-right ${
                          overload ? "font-semibold text-primary" : ""
                        }`}
                      >
                        {(t.termPct * 100).toFixed(0)}%{overload ? " ↑" : ""}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {t.eligible ? fmtCurrency(t.calcSub) : "$0"}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {t.eligible ? fmtCurrency(t.calcUnsub) : "$0"}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {results.termResults.some((t) => t.enabled && t.termPct > 1) ? (
          <p className="mt-2 rounded-md bg-primary/5 px-3 py-2 text-[11px] text-foreground">
            ↪ One or more terms overload (&gt; 100%). Excess dollars forward to terms with
            remaining share headroom (Step 5 redistribution).
          </p>
        ) : null}
      </section>
    </div>
  );
}
