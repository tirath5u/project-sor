/**
 * Step-by-step walkthrough panel - narrates the official 5-step ED process.
 */
import { fmtCurrency, type SORInputs, type SORResults } from "@/lib/sor";
import { InfoTip } from "./InfoTip";

function StepHeader({ n, title, tip }: { n: number; title: string; tip?: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        {n}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {tip ? <InfoTip>{tip}</InfoTip> : null}
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

export function StepWalkthrough({ inputs, results }: { inputs: SORInputs; results: SORResults }) {
  const eligible = results.termResults.filter((t) => t.eligible);
  const enabled = results.termResults.filter((t) => t.enabled);
  const enrolledExpr = String(results.enrolledSumAll);
  const ftExpr = String(results.ftSumAll);
  const appliedStage = results.calculationStages?.find((stage) => stage.id === "ordinary-pre-sor-maximum")?.output;
  const appliedSub = typeof appliedStage?.appliedSubBaseline === "number" ? appliedStage.appliedSubBaseline : results.subBaseline;
  const appliedUnsub = typeof appliedStage?.appliedUnsubBaseline === "number" ? appliedStage.appliedUnsubBaseline : results.unsubBaseline;
  const ayPctRoundedPct = Math.round(results.sorPctRounded * 100);

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Logic Walkthrough</h2>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          ED 5-Step Process
        </span>
      </div>
      {results.loanPeriodScope === "singleTerm" ? (
        <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
          <span className="font-semibold">Single-term mode:</span> the engine uses one half of the
          initial maximum eligibility as the single-term starting point, then applies the term
          enrollment percentage when the student is at least half-time. Equal and Proportional
          distribution do not apply in this mode.
        </div>
      ) : null}

      {/* Step 1 */}
      <section className="border-b border-border pb-4">
        <StepHeader
          n={1}
          title="Initial Maximum Annual Loan Limit"
          tip="Combined Limit Shifting Rule (34 CFR 685.203): Sub = MIN(stat cap, need). Unsub fills the remaining Combined Limit headroom, NOT remaining need."
        />
        <p className="mb-2 text-xs text-muted-foreground">
          Annual Need {fmtCurrency(inputs.annualNeed)} is split using the effective statutory caps
          (Sub {fmtCurrency(results.effectiveSubStatutory)} + Unsub{" "}
          {fmtCurrency(results.effectiveUnsubStatutory)} = Combined{" "}
          {fmtCurrency(results.effectiveCombinedLimit)}). Sub takes the lesser of need and the Sub
          cap; Unsub fills the remaining combined-limit headroom (NOT remaining need).
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
            min({fmtCurrency(results.effectiveSubStatutory)},{" "}
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
            {fmtCurrency(results.effectiveCombinedLimit)} - {fmtCurrency(results.subBaseline)}
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
        <StepHeader
          n={2}
          title={results.loanPeriodScope === "singleTerm" ? "Selected-Term SOR % and Reduced Limit" : "SOR % (Academic Year reduction factor) and Annual Loan Limit"}
          tip={results.loanPeriodScope === "singleTerm" ? "Use the selected payment period's enrolled and full-time credits with its one-term eligibility base." : "SOR % = counted AY enrolled credits divided by AY full-time credits, rounded. This reduces the annual baselines and is distinct from COD enrollment intensity."}
        />
        <Eq>
          SOR % = ({enrolledExpr}) ÷ {ftExpr}
          <br />={" "}
          <span className="font-semibold text-primary">
            {(results.enrollmentFractionRaw * 100).toFixed(2)}%
          </span>{" "}
          → rounded = <span className="font-semibold text-primary">{ayPctRoundedPct}%</span>
        </Eq>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Eq>
            <div className="text-muted-foreground">{results.loanPeriodScope === "singleTerm" ? "Single-term Sub limit:" : "Annual Sub limit:"}</div>
            {fmtCurrency(appliedSub)} × {ayPctRoundedPct}% ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedSub)}</span>
          </Eq>
          <Eq>
            <div className="text-muted-foreground">{results.loanPeriodScope === "singleTerm" ? "Single-term Unsub limit:" : "Annual Unsub limit:"}</div>
            {fmtCurrency(appliedUnsub)} × {ayPctRoundedPct}%
            {results.shiftedToUnsub > 0 ? ` + ${fmtCurrency(results.shiftedToUnsub)} shift` : ""} ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedUnsub)}</span>
          </Eq>
        </div>
        {results.noReduction ? (
          <p className="mt-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            {results.loanPeriodScope === "singleTerm"
              ? "The selected payment period is full-time, so no SOR percentage reduction is required."
              : "Student is full-time for the AY: no SOR reduction is required."}
          </p>
        ) : null}
      </section>

      {/* Step 3 */}
      <section className="border-b border-border py-4">
        <StepHeader
          n={3}
          title={results.loanPeriodScope === "singleTerm" ? "Selected Payment-Period Payout" : "Per-term Share of the Annual Limit"}
          tip={results.loanPeriodScope === "singleTerm" ? "The selected term receives its already-reduced one-term amount. Equal and Proportional allocation do not apply." : "Equal uses active term shares with balance forward. Proportional weights eligible terms by effective enrolled credits. The displayed shares include eligibility and rounding effects."}
        />
        <p className="mb-2 text-xs text-muted-foreground">
          {results.loanPeriodScope === "singleTerm"
            ? "The selected payment period receives the reduced amount from Step 2. No second SOR percentage or distribution model is applied."
            : results.effectiveDistributionModel === "equal"
            ? "Equal model: the reduced annual amount is allocated across active terms. An ineligible term receives no disbursement, and its share can move to an eligible term."
            : "Proportional model: eligible term shares are weighted by effective enrolled credits. The shown dollar shares include rounding and any paid-history locks."}
        </p>
        {eligible.length > 0 ? (
          <p className="mb-2 text-xs text-foreground">
            Resulting split:{" "}
            <span className="font-medium">
              {eligible
                .map(
                  (t) =>
                    `${t.label} Sub ${fmtCurrency(t.shareSub)} / Unsub ${fmtCurrency(t.shareUnsub)}`,
                )
                .join(" · ")}
            </span>
            .
          </p>
        ) : null}
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
                    <td className="px-2 py-1.5 text-right">{fmtCurrency(t.shareSub)}</td>
                    <td className="px-2 py-1.5 text-right">{fmtCurrency(t.shareUnsub)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Step 4 + 5 */}
      <section className="pt-4">
        <StepHeader
          n={4}
          title={results.loanPeriodScope === "singleTerm" ? "Final Selected-Term Disbursement" : "Term Allocation and Final Disbursement"}
          tip={results.loanPeriodScope === "singleTerm" ? "The selected term's enrollment percentage was applied once in Step 2. This step shows the final payout after any applicable term cap." : "The term percentage is informational here. Allocation, paid-history locks, and term caps determine the displayed final amount."}
        />
        <p className="mb-2 text-xs text-muted-foreground">
          {results.loanPeriodScope === "singleTerm"
            ? "The selected term's enrolled credits determine the SOR percentage in Step 2. The resulting reduced amount is not multiplied by that percentage again."
            : "Term enrollment percentage is shown for context. It is not multiplied into the reduced annual amount a second time. The final amount reflects the allocated share, paid history, and any term cap."}
        </p>
        {enabled.length > 0 ? (
          <ul className="mb-3 space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[11px] leading-snug text-foreground">
            {enabled.map((t) => {
              if (!t.eligible) {
                return (
                  <li key={t.key} className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{t.label}:</span> Below
                    half-time ({t.effectiveCredits}/{t.ftCredits}). {results.loanPeriodScope === "singleTerm"
                      ? "No Direct Loan disbursement for the selected period."
                      : "Ineligible - share forwards to the next eligible term."}
                  </li>
                );
              }
              const pctRaw = Math.round(t.termPct * 100);
              if (results.loanPeriodScope === "singleTerm") {
                return (
                  <li key={t.key}>
                    <span className="font-semibold text-foreground">{t.label}:</span>{" "}
                    {t.effectiveCredits} ÷ {t.ftCredits} = {pctRaw}% (applied once in Step 2).
                    Final: <span className="font-semibold text-primary">
                      {fmtCurrency(t.finalSub)} Sub / {fmtCurrency(t.finalUnsub)} Unsub
                    </span>.
                  </li>
                );
              }
              return (
                <li key={t.key}>
                  <span className="font-semibold text-foreground">{t.label}:</span>{" "}
                  {t.effectiveCredits} ÷ {t.ftCredits} = {pctRaw}% (term status). Sub share{" "}
                  {fmtCurrency(t.shareSub)}; calculated {fmtCurrency(t.calcSub)}
                  {t.coaCapSub > 0 && t.calcSub > t.coaCapSub
                    ? ` → COA-capped to ${fmtCurrency(t.finalSub)}`
                    : ""}
                  {t.shareUnsub > 0 || t.calcUnsub > 0
                    ? `; Unsub share ${fmtCurrency(t.shareUnsub)}; calculated ${fmtCurrency(t.calcUnsub)}${t.coaCapUnsub > 0 && t.calcUnsub > t.coaCapUnsub ? ` → ${fmtCurrency(t.finalUnsub)}` : ""}`
                    : ""}
                  . Final:{" "}
                  <span className="font-semibold text-primary">
                    {fmtCurrency(t.finalSub)} Sub / {fmtCurrency(t.finalUnsub)} Unsub
                  </span>
                  .
                </li>
              );
            })}
          </ul>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-[11px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Term</th>
                <th className="px-2 py-1.5 text-right font-medium">Term enrollment %</th>
                <th className="px-2 py-1.5 text-right font-medium">Enrollment Intensity (EI) %</th>
                <th className="px-2 py-1.5 text-right font-medium">Calc Sub</th>
                <th className="px-2 py-1.5 text-right font-medium">Calc Unsub</th>
                <th className="px-2 py-1.5 text-right font-medium">Final Sub</th>
                <th className="px-2 py-1.5 text-right font-medium">Final Unsub</th>
              </tr>
            </thead>
            <tbody>
              {results.termResults
                .filter((t) => t.enabled)
                .map((t) => {
                  const overload = t.intensityPct > 1;
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
                        {(t.intensityPct * 100).toFixed(0)}%{overload ? " ↑" : ""}
                      </td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(t.calcSub)}</td>
                      <td className="px-2 py-1.5 text-right">{fmtCurrency(t.calcUnsub)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-primary">
                        {fmtCurrency(t.finalSub)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-semibold text-primary">
                        {fmtCurrency(t.finalUnsub)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {results.termResults.some((t) => t.enabled && t.intensityPct > 1) ? (
          <p className="mt-2 rounded-md bg-primary/5 px-3 py-2 text-[11px] text-foreground">
            ↪ One or more terms overload (&gt; 100%). Excess dollars forward to terms with remaining
            share headroom (Step 5 redistribution).
          </p>
        ) : null}
      </section>
    </div>
  );
}
