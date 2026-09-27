import * as React from "react";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { formatCents, type LabComparison } from "@/lib/lab/compare";
import type { LabScenarioInput } from "@/lib/lab/fixtures";
import type { LabRetrieval, LabReviewGate } from "@/lib/lab/retrieval";
import type { LabExplainResponse } from "@/lib/lab/ai-contract";
import { cn } from "@/lib/utils";

/**
 * Presentation pieces shared by the scenario explorer and the comparison
 * study, so both show the same evidence in the same way.
 */

const KIND_LABEL: Record<string, string> = {
  match: "Match",
  amount_mismatch: "Amount differs",
  status_mismatch: "Status differs",
  amount_and_status_mismatch: "Amount and status differ",
  missing_in_b: "Missing in system B",
  missing_in_a: "Missing in system A",
};

export function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5">
      <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      {caption ? <p className="mt-1 text-xs text-muted-foreground">{caption}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function VarianceTable({
  scenario,
  comparison,
}: {
  scenario: LabScenarioInput;
  comparison: LabComparison;
}) {
  return (
    <div className="min-w-0 max-w-full overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Record</th>
            <th className="py-2 pr-3 font-medium">{scenario.systemAName}</th>
            <th className="py-2 pr-3 font-medium">{scenario.systemBName}</th>
            <th className="py-2 pr-3 font-medium">Difference</th>
            <th className="py-2 font-medium">Finding</th>
          </tr>
        </thead>
        <tbody>
          {comparison.findings.map((f) => (
            <tr key={f.id} className="border-b border-border/60 align-top">
              <td className="py-2.5 pr-3">
                <span className="font-medium text-foreground">{f.id}</span>
                <span className="block text-xs text-muted-foreground">{f.label}</span>
              </td>
              <td className="py-2.5 pr-3 tabular-nums">
                {formatCents(f.amountACents)}
                <span className="block text-xs text-muted-foreground">{f.statusA ?? "-"}</span>
              </td>
              <td className="py-2.5 pr-3 tabular-nums">
                {formatCents(f.amountBCents)}
                <span className="block text-xs text-muted-foreground">{f.statusB ?? "-"}</span>
              </td>
              <td className="py-2.5 pr-3 tabular-nums">{formatCents(f.deltaCents)}</td>
              <td className="py-2.5">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                    f.kind === "match"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  {KIND_LABEL[f.kind] ?? f.kind}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-xs text-muted-foreground">
        Compared {comparison.summary.compared} record(s). Matched {comparison.summary.matched}.
        Paired-record absolute difference {formatCents(comparison.summary.absoluteDeltaCents)}.
        Unmatched amount (unconfirmed, not a paired difference):{" "}
        {formatCents(comparison.summary.unmatchedAmountCents)}. Every figure on this table is
        computed in code from integer cents, with no model involved.
      </p>
      {comparison.inputErrors.length ? (
        <ul className="mt-3 space-y-1 text-xs text-destructive">
          {comparison.inputErrors.map((e, i) => (
            <li key={i}>
              Input rejected ({e.code}, system {e.system}): {e.detail}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/** Retrieved passages plus the escalation decided by code. No AI involved. */
export function ProcedureEvidence({
  retrieval,
  gate,
}: {
  retrieval: LabRetrieval;
  gate: LabReviewGate;
}) {
  return (
    <>
      {retrieval.passages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
          Retrieval returned no applicable procedure for this question. That is the honest result,
          not an error, and it is why the next step below is human review.
        </p>
      ) : (
        <ul className="space-y-3">
          {retrieval.passages.map((p) => (
            <li key={p.id} className="rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">
                <span className="font-mono text-xs text-primary">{p.id}</span> {p.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{p.text}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Matched tags: {p.matchedTags.join(", ") || "none"}. Score {p.score}.
                {p.conflictsWith.length ? ` Contradicts ${p.conflictsWith.join(", ")}.` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <div
        className={cn(
          "mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm",
          gate.requireHumanReview
            ? "border-destructive/30 bg-destructive/5"
            : "border-border bg-muted/40",
        )}
      >
        {gate.requireHumanReview ? (
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        ) : (
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        )}
        <span className="text-muted-foreground">
          Escalation decided by code before any model call: {gate.reason}
          {" Only source-supported investigation steps are shown. Record corrections are excluded."}
        </span>
      </div>
    </>
  );
}

/** The endpoint's answer: an AI explanation, a rule-based escalation, or why neither is shown. */
export function ExplanationResult({ result }: { result: LabExplainResponse | null }) {
  return (
    <>
      {result?.status === "unavailable" ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-foreground">
            No AI explanation is shown ({result.reason}).
          </p>
          <p className="mt-1 text-muted-foreground">{result.message}</p>
          {result.retryAfterSeconds ? (
            <p className="mt-1 text-xs text-muted-foreground">
              You can try again in about {result.retryAfterSeconds} seconds.
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            The comparison table and the retrieved passages above are unaffected: they never needed
            a model.
          </p>
        </div>
      ) : null}

      {result?.status === "ok" ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
          <p className="font-semibold">
            {result.resultKind === "rule_based"
              ? "Rule-based result (no AI call)"
              : "AI explanation"}
          </p>
          <p className="text-foreground">{result.explanation.summary}</p>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Observations
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">
              {result.explanation.observations.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Source-supported investigation step
            </p>
            <p className="mt-1 text-muted-foreground">{result.explanation.proposedNextStep}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {result.resultKind === "rule_based" ? "Evidence gap" : "Model-reported uncertainty"}
            </p>
            <p className="mt-1 text-muted-foreground">{result.explanation.uncertainty}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              The snapshots do not establish which source is correct. Verify source history before
              resolving a discrepancy, even if the model reports no uncertainty.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Cited fictional sources: {result.explanation.citedSourceIds.join(", ") || "none cited"}.
            Citations were checked on the server against the exact passages retrieved above; an
            answer that cites anything else is rejected and not shown.
          </p>
          {result.explanation.requiresHumanReview ? (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-foreground">
              Human review required. This case may not be closed on the strength of a generated
              explanation.
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
