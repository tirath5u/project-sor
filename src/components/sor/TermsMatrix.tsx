/**
 * Per-term calculation matrix: rows = calculation lines, columns = each
 * enabled term + AY Total. Sticky first column for scroll.
 */
import { fmtCurrency, type SORResults, type TermResult } from "@/lib/sor";
import { cn } from "@/lib/utils";
import type { Scenario } from "@/lib/scenarios";
import { InfoTip } from "./InfoTip";

interface RowDef {
  label: string;
  hint?: string;
  tip?: string;
  format: "int" | "pct" | "money";
  get: (t: TermResult) => number | null;
  total?: (visible: TermResult[]) => number | null;
  emphasize?: boolean;
  divider?: boolean;
  /** Static value shown in every term column (used by per-term cap rows). */
  staticValue?: (results: SORResults) => number;
  /** When true, applies red exceedance shading per cell. */
  redIf?: (t: TermResult) => boolean;
}

const ROWS: RowDef[] = [
  {
    label: "FT credits",
    hint: "Term full-time credit hours",
    tip: "Full-time credit threshold for THIS term. Half-time eligibility cutoff = FT ÷ 2.",
    format: "int",
    get: (t) => t.ftCredits,
    total: (rs) => rs.reduce((s, t) => s + t.ftCredits, 0),
  },
  {
    label: "Enrolled credits",
    hint: "Student enrolled credit hours",
    tip: "Credits the student is actually enrolled in for this term (or actual credits in disbursement view).",
    format: "int",
    get: (t) => t.effectiveCredits,
    total: (rs) => rs.reduce((s, t) => s + t.effectiveCredits, 0),
  },
  {
    label: "Term %",
    hint: "Term enrollment %: enrolled ÷ FT (informational only; SOR uses the Academic Year %).",
    tip: "Term enrollment % = enrolled credits ÷ term full-time credits. Informational - the engine drives reductions from the Academic Year enrollment %.",
    format: "pct",
    get: (t) => t.termPct,
    total: () => null,
  },
  {
    label: "Enrollment Intensity (EI) %",
    hint: "Per-term EI: (enrolled + carried below-half-time credits) ÷ FT",
    tip: "Per-term Enrollment Intensity = (Enrolled + lapsed below-half-time credits) ÷ FT. May exceed 100% (balloon). REPORTED TO COD on disbursement records. Not used in the SOR reduction itself - that uses the annual SOR % shown in the Results panel.",
    format: "pct",
    get: (t) => t.intensityPct,
    total: () => null,
    divider: true,
  },
  {
    label: "Step-3 Share Sub",
    hint: "Annual Sub ÷ eligible terms (or proportional)",
    tip: "This term's slice of the running annual Sub pool, after subtracting any locked/paid amounts from earlier terms.",
    format: "money",
    get: (t) => t.shareSub,
    total: (rs) => rs.reduce((s, t) => s + t.shareSub, 0),
  },
  {
    label: "Step-3 Share Unsub",
    tip: "This term's slice of the running annual Unsub pool, after subtracting any locked/paid amounts from earlier terms.",
    format: "money",
    get: (t) => t.shareUnsub,
    total: (rs) => rs.reduce((s, t) => s + t.shareUnsub, 0),
    divider: true,
  },
  {
    label: "Calc Sub (Step 5)",
    hint: "Share × min(term %, 100%) + balance-forward",
    tip: "Step 5 output: Share x min(term %, 100%), plus carried-forward unspent share from prior eligible terms.",
    format: "money",
    get: (t) => t.calcSub,
    total: (rs) => rs.reduce((s, t) => s + t.calcSub, 0),
  },
  {
    label: "Calc Unsub (Step 5)",
    tip: "Step 5 output for Unsub. Same formula as Calc Sub but against the Unsub pool.",
    format: "money",
    get: (t) => t.calcUnsub,
    total: (rs) => rs.reduce((s, t) => s + t.calcUnsub, 0),
    divider: true,
  },
  {
    label: "Net Paid Sub",
    hint: "Already paid − refund (locks in disbursement mode)",
    tip: "Paid Sub minus Refunded Sub. In Disbursement view this anchors the term - the engine cannot retroactively change it.",
    format: "money",
    get: (t) => t.netPaidSub,
    total: (rs) => rs.reduce((s, t) => s + t.netPaidSub, 0),
  },
  {
    label: "Net Paid Unsub",
    tip: "Paid Unsub minus Refunded Unsub. In Disbursement view this anchors the term.",
    format: "money",
    get: (t) => t.netPaidUnsub,
    total: (rs) => rs.reduce((s, t) => s + t.netPaidUnsub, 0),
    divider: true,
  },
  {
    label: "Final Sub",
    hint: "Disbursement after COA cap & adjustments",
    tip: "MIN(Calc Sub, COA cap). Mirrors the Step 5 engine output exactly - no averaging.",
    format: "money",
    get: (t) => t.finalSub,
    total: (rs) => rs.reduce((s, t) => s + t.finalSub, 0),
    emphasize: true,
    redIf: (t) => t.exceedsPerTermCapSub,
  },
  {
    label: "Final Unsub",
    tip: "MIN(Calc Unsub, COA cap). Mirrors the Step 5 engine output exactly.",
    format: "money",
    get: (t) => t.finalUnsub,
    total: (rs) => rs.reduce((s, t) => s + t.finalUnsub, 0),
    emphasize: true,
    redIf: (t) => t.exceedsPerTermCapUnsub,
  },
];

const PER_TERM_CAP_ROWS: RowDef[] = [
  {
    label: "Per-term Cap (Sub)",
    hint: "Reduced Annual Sub ÷ eligible terms (static)",
    tip: "Reduced Annual Sub divided by the number of eligible terms. Informational only - proportional front-loading is permitted under 34 CFR 685.301(b)(8). Final Sub turns red above when it exceeds this cap so you can flag it for audit review.",
    format: "money",
    get: () => null,
    staticValue: (r) => r.perTermCapSub,
    total: (_rs) => null,
  },
  {
    label: "Per-term Cap (Unsub)",
    tip: "Reduced Annual Unsub divided by the number of eligible terms. Informational only - proportional front-loading is permitted under 34 CFR 685.301(b)(8).",
    format: "money",
    get: () => null,
    staticValue: (r) => r.perTermCapUnsub,
    total: (_rs) => null,
  },
];

const GRAD_PLUS_ROWS: RowDef[] = [
  {
    label: "Step-3 Share Grad PLUS",
    tip: "This term's slice of the running annual Grad PLUS pool.",
    format: "money",
    get: (t) => t.shareGradPlus,
    total: (rs) => rs.reduce((s, t) => s + t.shareGradPlus, 0),
  },
  {
    label: "Calc Grad PLUS (Step 5)",
    tip: "Step 5 output for Grad PLUS. Same formula as Calc Sub/Unsub but against the Grad PLUS pool.",
    format: "money",
    get: (t) => t.calcGradPlus,
    total: (rs) => rs.reduce((s, t) => s + t.calcGradPlus, 0),
  },
  {
    label: "Final Grad PLUS",
    tip: "MIN(Calc Grad PLUS, COA cap). Mirrors the engine output exactly.",
    format: "money",
    get: (t) => t.finalGradPlus,
    total: (rs) => rs.reduce((s, t) => s + t.finalGradPlus, 0),
    emphasize: true,
    redIf: (t) => t.exceedsPerTermCapGradPlus,
  },
  {
    label: "Per-term Cap (Grad PLUS)",
    tip: "Reduced Annual Grad PLUS divided by the number of eligible terms. Informational only.",
    format: "money",
    get: () => null,
    staticValue: (r) => r.perTermCapGradPlus,
    total: () => null,
  },
];

function fmtVal(v: number | null, fmt: RowDef["format"]) {
  if (v === null) return "-";
  if (fmt === "money") return fmtCurrency(v);
  if (fmt === "pct") return `${Math.round(v * 100)}%`;
  return String(Math.round(v * 100) / 100);
}

interface TermsMatrixProps {
  results: SORResults;
  scenario?: Scenario;
}

export function TermsMatrix({ results, scenario }: TermsMatrixProps) {
  const visible = results.termResults.filter((t) => t.enabled);
  const showGradPlus = results.initialGradPlus > 0;
  const allRows: RowDef[] = [
    ...ROWS,
    ...PER_TERM_CAP_ROWS,
    ...(showGradPlus ? GRAD_PLUS_ROWS : []),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-primary/5 to-transparent px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Per-term Calculation Matrix</h3>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-primary">
            Academic Year {Math.round(results.sorPctRounded * 100)}%
          </span>
          <span className="rounded-full bg-accent/30 px-2 py-0.5 font-semibold uppercase tracking-wide text-accent-foreground">
            {results.eligibleTermsCount} eligible
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-[12px] tabular-nums">
          <thead className="sticky top-0 z-10 bg-card">
            <tr className="border-b border-border text-left">
              <th className="sticky left-0 z-10 min-w-[180px] bg-card px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Calculation
              </th>
              {visible.map((t) => (
                <th
                  key={t.key}
                  className="min-w-[110px] border-l border-border/60 px-3 py-2 text-right text-[11px] font-semibold text-foreground"
                >
                  <div>{t.label}</div>
                  <div className="mt-0.5 text-[9px] font-normal uppercase tracking-wide text-muted-foreground">
                    {t.status === "eligible"
                      ? t.disbursed
                        ? "paid"
                        : "eligible"
                      : t.status === "below_half_time"
                        ? "below ½"
                        : "off"}
                    {t.adjustmentSub !== 0 || t.adjustmentUnsub !== 0 ? " · adj" : ""}
                  </div>
                </th>
              ))}
              <th className="min-w-[110px] border-l-2 border-primary/30 bg-primary/5 px-3 py-2 text-right text-[11px] font-semibold text-primary">
                AY Total
              </th>
            </tr>
          </thead>
          <tbody>
            {allRows.map((row, ri) => {
              const total = row.total ? row.total(visible) : null;
              return (
                <tr
                  key={ri}
                  className={cn(
                    "border-b border-border/40",
                    !row.emphasize && ri % 2 === 1 && "bg-muted/30",
                    row.emphasize && "bg-primary/5",
                    row.divider && "border-b-2 border-border",
                  )}
                >
                  <td className="sticky left-0 z-10 bg-card px-3 py-1.5">
                    <div
                      className={cn(
                        "flex items-center gap-1 text-[12px]",
                        row.emphasize ? "font-semibold text-foreground" : "text-foreground/85",
                      )}
                    >
                      <span>{row.label}</span>
                      {row.tip ? <InfoTip>{row.tip}</InfoTip> : null}
                    </div>
                    {row.hint ? (
                      <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                        {row.hint}
                      </div>
                    ) : null}
                  </td>
                  {visible.map((t) => {
                    const v = row.staticValue ? row.staticValue(results) : row.get(t);
                    const overload =
                      (row.label === "Term %" && t.termPct > 1) ||
                      (row.label === "Enrollment Intensity (EI) %" && t.intensityPct > 1);
                    const subCapped =
                      row.label === "Final Sub" && t.coaCapSub > 0 && t.calcSub > t.coaCapSub;
                    const unsubCapped =
                      row.label === "Final Unsub" &&
                      t.coaCapUnsub > 0 &&
                      t.calcUnsub > t.coaCapUnsub;
                    const gradPlusCapped =
                      row.label === "Final Grad PLUS" &&
                      (t.coaCapGradPlus ?? 0) > 0 &&
                      t.calcGradPlus > (t.coaCapGradPlus ?? 0);
                    const overCap = row.redIf ? row.redIf(t) : false;
                    const adj =
                      (row.label === "Final Sub" && t.adjustmentSub !== 0) ||
                      (row.label === "Final Unsub" && t.adjustmentUnsub !== 0);
                    return (
                      <td
                        key={t.key}
                        className={cn(
                          "border-l border-border/60 px-3 py-1.5 text-right",
                          row.emphasize && "font-semibold text-foreground",
                          overload && "font-semibold text-primary",
                          (subCapped || unsubCapped || gradPlusCapped) &&
                            "bg-warning/15 text-warning-foreground",
                          overCap && "bg-destructive/15 text-destructive font-semibold",
                          row.staticValue && "text-muted-foreground italic",
                          adj && "underline decoration-dotted decoration-accent",
                        )}
                        title={
                          overCap
                            ? `Exceeds Per-term Cap (${fmtCurrency(
                                row.label === "Final Sub"
                                  ? results.perTermCapSub
                                  : row.label === "Final Unsub"
                                  ? results.perTermCapUnsub
                                  : results.perTermCapGradPlus,
                              )})`
                            : adj
                            ? row.label === "Final Sub"
                              ? `Adjustment: ${fmtCurrency(t.adjustmentSub)}`
                              : `Adjustment: ${fmtCurrency(t.adjustmentUnsub)}`
                            : undefined
                        }
                      >
                        {fmtVal(v, row.format)}
                      </td>
                    );
                  })}
                  <td
                    className={cn(
                      "border-l-2 border-primary/30 bg-primary/5 px-3 py-1.5 text-right text-primary",
                      row.emphasize && "font-bold",
                    )}
                  >
                    {fmtVal(total, row.format)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {scenario?.expectedTerms ? (
        <RegressionStrip results={results} scenario={scenario} />
      ) : null}
    </div>
  );
}

function RegressionStrip({
  results,
  scenario,
}: {
  results: SORResults;
  scenario: Scenario;
}) {
  const checks = Object.entries(scenario.expectedTerms ?? {}).map(([key, exp]) => {
    const r = results.termResults.find((x) => x.key === key);
    const subOk = exp?.sub === undefined || (r && Math.abs(r.finalSub - exp.sub) <= 1);
    const unsubOk =
      exp?.unsub === undefined || (r && Math.abs(r.finalUnsub - exp.unsub) <= 1);
    return { key, label: r?.label ?? key, exp, subOk, unsubOk, r };
  });
  const allOk = checks.every((c) => c.subOk && c.unsubOk);
  return (
    <div
      className={cn(
        "border-t px-4 py-2 text-[11px]",
        allOk
          ? "border-success/30 bg-success/10 text-success"
          : "border-warning/40 bg-warning/10 text-warning-foreground",
      )}
    >
      <span className="font-semibold">
        {allOk ? "✓ Matches expected scenario values" : "⚠ Scenario regression diff"}:
      </span>{" "}
      {checks.map((c, i) => {
        const sub = c.exp?.sub;
        const unsub = c.exp?.unsub;
        return (
          <span key={c.key} className="ml-2">
            {c.label}{" "}
            {sub !== undefined ? (
              <>
                Sub {fmtCurrency(c.r?.finalSub ?? 0)}
                {!c.subOk ? `≠${fmtCurrency(sub)}` : ""}
              </>
            ) : null}
            {unsub !== undefined ? (
              <>
                {" · "}Unsub {fmtCurrency(c.r?.finalUnsub ?? 0)}
                {!c.unsubOk ? `≠${fmtCurrency(unsub)}` : ""}
              </>
            ) : null}
            {i < checks.length - 1 ? " ·" : ""}
          </span>
        );
      })}
    </div>
  );
}
