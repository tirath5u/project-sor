/**
 * Step-by-step walkthrough panel — narrates the official SOR three-step process
 * using the user's current inputs. Built so a PM can demo to devs/QA and they
 * can read the math live.
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

export function StepWalkthrough({ inputs, results }: { inputs: SORInputs; results: SORResults }) {
  const eligibleTerms = results.termResults.filter((t) => t.eligible);
  const enrolledExpr = eligibleTerms.map((t) => t.enrolledCredits).join(" + ") || "0";
  const ftExpr = inputs.ayFtCredits > 0 ? String(inputs.ayFtCredits) : "—";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">Logic Walkthrough</h2>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          FSA SOR · 3 Steps
        </span>
      </div>

      {/* Step 1 */}
      <section className="border-b border-border pb-4">
        <StepHeader n={1} title="Initial Maximum Annual Loan Limit" />
        <p className="mb-2 text-xs text-muted-foreground">
          Lower of statutory limit and student need, by loan type.
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Eq>
            <div className="text-muted-foreground">Sub:</div>
            min({fmtCurrency(inputs.subStatutory)}, {fmtCurrency(inputs.subNeed)}) ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.subBaseline)}</span>
          </Eq>
          <Eq>
            <div className="text-muted-foreground">Unsub:</div>
            min({fmtCurrency(inputs.unsubStatutory)}, {fmtCurrency(inputs.unsubNeed)}) ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.unsubBaseline)}</span>
          </Eq>
        </div>
      </section>

      {/* Step 2 */}
      <section className="border-b border-border py-4">
        <StepHeader n={2} title="SOR Percentage" />
        <p className="mb-2 text-xs text-muted-foreground">
          Round to nearest whole percentage point. If ≥ 100% → no reduction applies.
        </p>
        <Eq>
          SOR % = ({enrolledExpr}) ÷ {ftExpr} × 100
          <br />
          = {results.enrolledSumAll} ÷ {results.ftSumAll}
          <br />={" "}
          <span className="font-semibold text-primary">
            {(results.enrollmentFractionRaw * 100).toFixed(2)}%
          </span>{" "}
          → rounded ={" "}
          <span className="font-semibold text-primary">
            {Math.round(results.enrollmentFractionRaw * 100)}%
          </span>
        </Eq>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Eq>
            <div className="text-muted-foreground">SOR Sub limit:</div>
            {fmtCurrency(results.subBaseline)} × {Math.round(results.sorPctRounded * 100)}% ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedSub)}</span>
          </Eq>
          <Eq>
            <div className="text-muted-foreground">SOR Unsub limit:</div>
            {fmtCurrency(results.unsubBaseline)} × {Math.round(results.sorPctRounded * 100)}% ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.reducedUnsub)}</span>
          </Eq>
        </div>
        {results.noReduction ? (
          <p className="mt-2 rounded-md bg-success/10 px-3 py-2 text-xs text-success">
            ✓ Student is enrolled full-time for the AY — no SOR reduction is required.
          </p>
        ) : null}
      </section>

      {/* Step 3 */}
      <section className="pt-4">
        <StepHeader n={3} title="Disbursement Method" />
        <p className="mb-2 text-xs text-muted-foreground">
          Method:{" "}
          <span className="font-medium text-foreground">
            {inputs.distribution === "equal"
              ? "Equal — annual ÷ N terms"
              : "Proportional — (term ÷ total enrolled) × annual"}
          </span>
          . Round to nearest whole dollar; sum must equal annual exactly.
        </p>
        {results.paidSubTotal + results.paidUnsubTotal > 0 ? (
          <Eq>
            <div className="text-muted-foreground">After already-disbursed subtraction:</div>
            Remaining Sub = {fmtCurrency(results.reducedSub)} −{" "}
            {fmtCurrency(results.paidSubTotal)} ={" "}
            <span className="font-semibold text-primary">{fmtCurrency(results.remainingSub)}</span>
            <br />
            Remaining Unsub = {fmtCurrency(results.reducedUnsub)} −{" "}
            {fmtCurrency(results.paidUnsubTotal)} ={" "}
            <span className="font-semibold text-primary">
              {fmtCurrency(results.remainingUnsub)}
            </span>
          </Eq>
        ) : null}
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[360px] text-[11px] tabular-nums">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="px-2 py-1.5 font-medium">Term</th>
                <th className="px-2 py-1.5 font-medium">Share</th>
                <th className="px-2 py-1.5 text-right font-medium">Sub</th>
                <th className="px-2 py-1.5 text-right font-medium">Unsub</th>
              </tr>
            </thead>
            <tbody>
              {results.termResults
                .filter((t) => t.enabled)
                .map((t) => {
                  const isRemaining = t.eligible && t.paidSub === 0 && t.paidUnsub === 0;
                  const share =
                    inputs.distribution === "equal"
                      ? isRemaining
                        ? `1 / ${results.remainingTermsCount}`
                        : "—"
                      : t.proportion !== undefined
                      ? `${t.enrolledCredits} / ${results.termResults
                          .filter(
                            (r) =>
                              r.eligible && r.paidSub === 0 && r.paidUnsub === 0,
                          )
                          .reduce((s, r) => s + r.enrolledCredits, 0)}`
                      : "—";
                  return (
                    <tr key={t.key} className="border-b border-border/40">
                      <td className="px-2 py-1.5 font-medium text-foreground">{t.label}</td>
                      <td className="px-2 py-1.5 text-muted-foreground">{share}</td>
                      <td className="px-2 py-1.5 text-right">
                        {t.paidSub > 0 ? (
                          <span className="text-muted-foreground">
                            {fmtCurrency(t.paidSub)} paid
                          </span>
                        ) : (
                          fmtCurrency(t.calcSub)
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {t.paidUnsub > 0 ? (
                          <span className="text-muted-foreground">
                            {fmtCurrency(t.paidUnsub)} paid
                          </span>
                        ) : (
                          fmtCurrency(t.calcUnsub)
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
