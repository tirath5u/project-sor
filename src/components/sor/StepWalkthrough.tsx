/**
 * Step-by-step walkthrough panel — narrates the official 5-step ED process.
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

export function StepWalkthrough({
  inputs,
  results,
}: {
  inputs: SORInputs;
  results: SORResults;
}) {
  const eligible = results.termResults.filter((t) => t.eligible);
  const enabled = results.termResults.filter((t) => t.enabled);
  const enrolledExpr = eligible.map((t) => t.effectiveCredits).join(" + ") || "0";
  const ftExpr = inputs.ayFtCredits > 0 ? String(inputs.ayFtCredits) : "-";
  const ayPctRoundedPct = Math.round(results.sorPctRounded * 100);

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
          Annual Need {fmtCurrency(inputs.annualNeed)} is split using the effective
          statutory caps (Sub {fmtCurrency(results.effectiveSubStatutory)} + Unsub{" "}
          {fmtCurrency(results.effectiveUnsubStatutory)} = Combined{" "}
          {fmtCurrency(results.effectiveCombinedLimit)}). Sub takes the lesser of
          need and the Sub cap; Unsub fills the remaining combined-limit headroom
          (NOT remaining need).
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
            {fmtCurrency(results.effectiveCombinedLimit)} -{" "}
            {fmtCurrency(results.subBaseline)}
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
          title="AY Enrollment % → Annual Loan Limit"
          tip="Σ enrolled credits across eligible terms ÷ AY FT credits. This is the SOR % applied to baselines."
        />
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
            ✓ Student is full-time for the AY: no SOR reduction is required.
          </p>
        ) : null}
      </section>

      {/* Step 3 */}
      <section className="border-b border-border py-4">
        <StepHeader
          n={3}
          title="Per-term Share of the Annual Limit"
          tip="Equal = annual ÷ N eligible terms. Proportional = weighted by each term's FT credits. Equal is the regulatory default."
        />
        <p className="mb-2 text-xs text-muted-foreground">
          {inputs.distributionModel === "equal"
            ? "Equal model: annual ÷ N eligible terms (whole-dollar; last term absorbs remainder)."
            : "Proportional model: annual × (term FT credits ÷ Σ term FT credits)."}
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
                      {fmtCurrency(t.shareSub)}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {fmtCurrency(t.shareUnsub)}
                    </td>
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
          title="Per-term % × Share = Disbursement"
          tip="Step 5 caps each share by min(term %, 100%). Excess + lapsed credits forward (balance-forward) to remaining eligible terms with headroom."
        />
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
                 <th className="px-2 py-1.5 text-right font-medium">Intensity %</th>
                <th className="px-2 py-1.5 text-right font-medium">Calc Sub</th>
                <th className="px-2 py-1.5 text-right font-medium">Calc Unsub</th>
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
                      <td className="px-2 py-1.5 text-right">
                        {fmtCurrency(t.calcSub)}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {fmtCurrency(t.calcUnsub)}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {results.termResults.some((t) => t.enabled && t.intensityPct > 1) ? (
          <p className="mt-2 rounded-md bg-primary/5 px-3 py-2 text-[11px] text-foreground">
            ↪ One or more terms overload (&gt; 100%). Excess dollars forward to terms with
            remaining share headroom (Step 5 redistribution).
          </p>
        ) : null}
      </section>
    </div>
  );
}
