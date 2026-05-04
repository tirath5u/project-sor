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
  const enrolledExpr = eligible.map((t) => t.effectiveCredits).join(" + ") || "0";
  const ftExpr = inputs.ayFtCredits > 0 ? String(inputs.ayFtCredits) : "-";
  const ayPctRoundedPct = Math.round(results.sorPctRounded * 100);

  // Step 3 formula proof - for "equal" model, payout = pool ÷ N eligible terms.
  const N = results.eligibleTermsCount;
  const equalSubPer = N > 0 ? Math.floor(results.reducedSub / N) : 0;
  const equalUnsubPer = N > 0 ? Math.floor(results.reducedUnsub / N) : 0;
  // Proportional model - sum of FT credits across eligible terms is the
  // weighting denominator.
  const eligibleFtSum = eligible.reduce((s, t) => s + t.ftCredits, 0);

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
          title="SOR % (Academic Year reduction factor) → Annual Loan Limit"
          tip="SOR % = Σ AY enrolled credits ÷ AY FT credits, rounded. This is the calculation input that reduces the annual baselines. Distinct from per-term Enrollment Intensity (EI), which is the value reported to COD."
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
            <div className="text-muted-foreground">Annual Sub limit:</div>
            {fmtCurrency(results.subBaseline)} × {ayPctRoundedPct}% ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedSub)}</span>
          </Eq>
          <Eq>
            <div className="text-muted-foreground">Annual Unsub limit:</div>
            {fmtCurrency(results.unsubBaseline)} × {ayPctRoundedPct}%
            {results.shiftedToUnsub > 0 ? ` + ${fmtCurrency(results.shiftedToUnsub)} shift` : ""} ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedUnsub)}</span>
          </Eq>
        </div>
        {results.noReduction ? (
          <p className="mt-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            ✓ Student is full-time for the AY: no SOR reduction is required.
          </p>
        ) : null}
      </section>

      {/* Step 3 */}
      <section className="border-b border-border py-4">
        <StepHeader
          n={3}
          title="Per-term Share of the Annual Limit"
          tip="Equal = annual ÷ N eligible terms. Proportional = weighted by each term's effective enrolled credits (not FT credits). Equal is the regulatory default."
        />
        <p className="mb-2 text-xs text-muted-foreground">
          {inputs.distributionModel === "equal"
            ? `Equal model: pool ÷ N eligible terms. Whole dollars; the last term absorbs any remainder.`
            : `Proportional model: each term's share = pool × (term effective enrolled credits ÷ Σ remaining eligible enrolled credits). The Department workbook labels say "FT credits" but the formulas weight by enrolled credits; this engine follows the formulas.`}
        </p>
        {N > 0 ? (
          <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {inputs.distributionModel === "equal" ? (
              <>
                <Eq>
                  <div className="text-muted-foreground">Sub payout per term:</div>
                  {fmtCurrency(results.reducedSub)} ÷ {N} ={" "}
                  <span className="font-semibold text-primary">{fmtCurrency(equalSubPer)}</span>
                  {results.reducedSub % N !== 0 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      (last term absorbs +{fmtCurrency(results.reducedSub - equalSubPer * N)})
                    </span>
                  ) : null}
                </Eq>
                <Eq>
                  <div className="text-muted-foreground">Unsub payout per term:</div>
                  {fmtCurrency(results.reducedUnsub)} ÷ {N} ={" "}
                  <span className="font-semibold text-primary">{fmtCurrency(equalUnsubPer)}</span>
                  {results.reducedUnsub % N !== 0 ? (
                    <span className="text-muted-foreground">
                      {" "}
                      (last term absorbs +{fmtCurrency(results.reducedUnsub - equalUnsubPer * N)})
                    </span>
                  ) : null}
                </Eq>
              </>
            ) : (
              eligible.map((t) => (
                <Eq key={t.key}>
                  <div className="text-muted-foreground">{t.label} Sub share:</div>
                  {fmtCurrency(results.reducedSub)} × ({t.ftCredits} ÷ {eligibleFtSum}) ={" "}
                  <span className="font-semibold text-primary">{fmtCurrency(t.shareSub)}</span>
                </Eq>
              ))
            )}
          </div>
        ) : null}
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
          title="Per-term Enrollment % × Share = Disbursement"
          tip="Step 5 caps each share by min(term %, 100%). Excess + lapsed credits forward (balance-forward) to remaining eligible terms with headroom."
        />
        <p className="mb-2 text-xs text-muted-foreground">
          Term enrollment % = enrolled ÷ term full-time credits (can exceed 100%). Disbursement =
          share × min(term %, 100%); any overflow or lapsed share carries forward to remaining
          eligible terms with headroom.
        </p>
        {enabled.length > 0 ? (
          <ul className="mb-3 space-y-1 rounded-lg bg-muted/40 px-3 py-2 text-[11px] leading-snug text-foreground">
            {enabled.map((t) => {
              if (!t.eligible) {
                return (
                  <li key={t.key} className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{t.label}:</span> Below
                    half-time ({t.effectiveCredits}/{t.ftCredits}). Ineligible - share forwards to
                    next eligible term.
                  </li>
                );
              }
              const pctRaw = Math.round(t.termPct * 100);
              const pctCapped = Math.min(100, pctRaw);
              return (
                <li key={t.key}>
                  <span className="font-semibold text-foreground">{t.label}:</span>{" "}
                  {t.effectiveCredits} ÷ {t.ftCredits} = {pctRaw}% ({pctCapped}% used). Sub{" "}
                  {fmtCurrency(t.shareSub)} × {pctCapped}% ={" "}
                  <span className="font-semibold">{fmtCurrency(t.calcSub)}</span>
                  {t.coaCapSub > 0 && t.calcSub > t.coaCapSub
                    ? ` → COA-capped to ${fmtCurrency(t.finalSub)}`
                    : ""}
                  {t.shareUnsub > 0 || t.calcUnsub > 0
                    ? `; Unsub ${fmtCurrency(t.shareUnsub)} × ${pctCapped}% = ${fmtCurrency(t.calcUnsub)}${t.coaCapUnsub > 0 && t.calcUnsub > t.coaCapUnsub ? ` → ${fmtCurrency(t.finalUnsub)}` : ""}`
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
