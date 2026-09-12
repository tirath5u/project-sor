import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ChevronDown, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/site/PageHeader";
import { compareLabRecords, formatCents, type LabComparison } from "@/lib/lab/compare";
import { LAB_FIXTURE_VERSION, LAB_SCENARIOS, type LabScenario } from "@/lib/lab/fixtures";
import {
  decideReviewGate,
  retrieveProcedures,
  type LabRetrieval,
  type LabReviewGate,
} from "@/lib/lab/retrieval";
import type { LabExplainResponse } from "@/lib/lab/ai-contract";
import { LAB_LIMITS } from "@/lib/lab/throttle";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reconciliation")({
  head: () => ({
    meta: [
      { title: "From mismatch to next step | Reconciliation learning lab" },
      {
        name: "description",
        content:
          "A public learning lab on reconciliation: deterministic comparison in code, labelled keyword retrieval over fictional procedures, and an inspectable AI explanation with cited sources.",
      },
      { property: "og:title", content: "From mismatch to next step | Reconciliation learning lab" },
      {
        property: "og:description",
        content:
          "Six fictional scenarios showing what code should decide, what retrieval should supply, and what a language model should only ever explain.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReconciliationLab,
});

const KIND_LABEL: Record<string, string> = {
  match: "Match",
  amount_mismatch: "Amount differs",
  status_mismatch: "Status differs",
  amount_and_status_mismatch: "Amount and status differ",
  missing_in_b: "Missing in system B",
  missing_in_a: "Missing in system A",
};

function Panel({
  title,
  caption,
  children,
}: {
  title: string;
  caption?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
      {caption ? <p className="mt-1 text-xs text-muted-foreground">{caption}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Disclosure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="rounded-xl border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="font-display text-sm font-semibold text-foreground">{label}</span>
        <ChevronDown
          className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open ? <div className="border-t border-border px-5 py-4">{children}</div> : null}
    </div>
  );
}

function VarianceTable({
  scenario,
  comparison,
}: {
  scenario: LabScenario;
  comparison: LabComparison;
}) {
  return (
    <div className="overflow-x-auto">
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
        Absolute difference {formatCents(comparison.summary.absoluteDeltaCents)}. Every figure on
        this table is computed in code from integer cents, with no model involved.
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

function ReconciliationLab() {
  const [scenarioId, setScenarioId] = React.useState(LAB_SCENARIOS[0].id);
  const [result, setResult] = React.useState<LabExplainResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [feedback, setFeedback] = React.useState<"clearer" | "not-clearer" | null>(null);

  const scenario = LAB_SCENARIOS.find((s) => s.id === scenarioId)!;

  const { comparison, retrieval, gate } = React.useMemo(() => {
    const c = compareLabRecords(scenario.systemA, scenario.systemB);
    const r = retrieveProcedures(scenario, c);
    return { comparison: c, retrieval: r, gate: decideReviewGate(c, r) } as {
      comparison: LabComparison;
      retrieval: LabRetrieval;
      gate: LabReviewGate;
    };
  }, [scenario]);

  function selectScenario(id: string) {
    setScenarioId(id);
    setResult(null);
    setFeedback(null);
  }

  async function requestExplanation() {
    setLoading(true);
    setResult(null);
    try {
      // The browser sends the scenario id and nothing else.
      const response = await fetch("/api/public/lab/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioId }),
      });
      setResult((await response.json()) as LabExplainResponse);
    } catch {
      setResult({
        status: "unavailable",
        reason: "model_unavailable",
        message:
          "The request to the explanation service did not complete in this browser. Nothing was retried automatically.",
        retryAfterSeconds: null,
        meta: {},
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-[1100px] px-4 pb-16 sm:px-6">
      <PageHeader
        eyebrow="Learning lab"
        title="From mismatch to next step"
        summary="A working demonstration of how a reviewer moves from a discrepancy between two systems to a defensible next step. All records and all procedures here are fictional and built in. Nothing on this page is a federal rule, and nothing can be uploaded."
        crumbs={[{ label: "Product work", to: "/work" }, { label: "Reconciliation lab" }]}
      />

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-4">
          <Panel title="Pick a scenario" caption="Six built-in fictional cases.">
            <ul className="space-y-1.5">
              {LAB_SCENARIOS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => selectScenario(s.id)}
                    aria-pressed={s.id === scenarioId}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      s.id === scenarioId
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {s.title}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="What is fictional here" caption={`Fixture set ${LAB_FIXTURE_VERSION}.`}>
            <ul className="space-y-2 text-xs leading-5 text-muted-foreground">
              <li>The two systems, the record ids, the amounts and the statuses are invented.</li>
              <li>The procedure passages are invented and are labelled FP-xxx to make that plain.</li>
              <li>No record is ever modified by this lab, by code or by the model.</li>
              <li>
                Feedback you give below stays in this browser tab and is not saved anywhere.
              </li>
            </ul>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel
            title={scenario.title}
            caption={scenario.question}
          >
            <p className="text-sm text-muted-foreground">{scenario.notes}</p>
          </Panel>

          <Panel
            title="Step 1. Deterministic comparison (no AI)"
            caption="Records are matched by id, amounts compared as integer cents, duplicate ids rejected, one-sided records reported in both directions."
          >
            <VarianceTable scenario={scenario} comparison={comparison} />
          </Panel>

          <Panel
            title="Step 2. Retrieved fictional procedures (no AI)"
            caption={`Method actually used: ${retrieval.method}.`}
          >
            {retrieval.passages.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                Retrieval returned no applicable procedure for this question. That is the honest
                result, not an error, and it is why the next step below is human review.
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
                {gate.allowProposedCorrection
                  ? " A suggested correction may be shown for a human to confirm."
                  : " No suggested correction may be shown."}
              </span>
            </div>
          </Panel>

          <Panel
            title="Step 3. AI explanation (server side, inspectable)"
            caption="Your browser sends only the scenario id. The server loads the fixture, the comparison result and the retrieved passages, then makes one model call with no automatic retries."
          >
            <button
              type="button"
              onClick={requestExplanation}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Asking the model" : "Explain this result"}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">
              Bounded run: one call per click, one call per visitor every{" "}
              {Math.round(LAB_LIMITS.perCallerIntervalMs / 1000)} seconds, and a conservative global
              cap of {LAB_LIMITS.globalDailyLimit} model calls per day for the whole lab.
            </p>

            <div aria-live="polite" className="mt-4 space-y-4">
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
                    The comparison table and the retrieved passages above are unaffected: they never
                    needed a model.
                  </p>
                </div>
              ) : null}

              {result?.status === "ok" ? (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
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
                      Proposed next step
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {result.explanation.proposedNextStep}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Suggested correction
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {result.explanation.proposedCorrection ??
                        "None. Code blocked a suggested correction for this case, and no record is ever changed by this lab."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Stated uncertainty
                    </p>
                    <p className="mt-1 text-muted-foreground">{result.explanation.uncertainty}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cited fictional sources:{" "}
                    {result.explanation.citedSourceIds.join(", ") || "none cited"}. Citations were
                    checked on the server against the exact passages retrieved above; an answer that
                    cites anything else is rejected and not shown.
                  </p>
                  {result.explanation.requiresHumanReview ? (
                    <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-foreground">
                      Human review required. This case may not be closed on the strength of a
                      generated explanation.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>

            {result?.status === "ok" ? (
              <div className="mt-4 rounded-lg border border-border p-3">
                <p className="text-sm font-medium text-foreground">
                  Is your next action clearer than it was from the table alone?
                </p>
                <div className="mt-2 flex gap-2">
                  {(
                    [
                      ["clearer", "Yes, clearer"],
                      ["not-clearer", "No, not clearer"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFeedback(value)}
                      aria-pressed={feedback === value}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                        feedback === value
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {feedback
                    ? "Recorded in this browser tab only. Not saved, not sent anywhere, and gone when you reload."
                    : "Anything you choose stays in this browser tab and is not saved."}
                </p>
              </div>
            ) : null}
          </Panel>

          <Disclosure label="Evidence: exactly what the server used">
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-medium text-foreground">Retrieval method</dt>
                <dd className="text-muted-foreground">{retrieval.method}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Corpus</dt>
                <dd className="text-muted-foreground">
                  {retrieval.corpusSize} fictional passages, version {retrieval.corpusVersion}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Query tags from the comparison</dt>
                <dd className="text-muted-foreground">
                  {retrieval.queryTags.join(", ") || "none"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">Comparison version</dt>
                <dd className="text-muted-foreground">{comparison.compareVersion}</dd>
              </div>
              {result?.status === "ok" || result?.status === "unavailable" ? (
                <>
                  <div>
                    <dt className="font-medium text-foreground">Model</dt>
                    <dd className="text-muted-foreground">{result.meta.model ?? "not reached"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Prompt version</dt>
                    <dd className="text-muted-foreground">
                      {result.meta.promptVersion ?? "not reached"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Observed latency</dt>
                    <dd className="text-muted-foreground">
                      {result.meta.latencyMs === null || result.meta.latencyMs === undefined
                        ? "not measured for this request"
                        : `${result.meta.latencyMs} ms`}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-foreground">Token usage reported</dt>
                    <dd className="text-muted-foreground">
                      {result.meta.tokenUsage
                        ? `prompt ${result.meta.tokenUsage.prompt ?? "n/a"}, completion ${
                            result.meta.tokenUsage.completion ?? "n/a"
                          }, total ${result.meta.tokenUsage.total ?? "n/a"}`
                        : "not reported by the provider for this request"}
                    </dd>
                  </div>
                </>
              ) : null}
            </dl>
            <p className="mt-3 text-xs text-muted-foreground">
              There is no vector search, no reranker and no multi-agent orchestration in this lab. If
              a figure is not measured, it says so rather than showing an invented number. No cost or
              business impact metric is claimed anywhere on this page.
            </p>
            {retrieval.passages.length ? (
              <div className="mt-3 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Exact passages sent to the model
                </p>
                {retrieval.passages.map((p) => (
                  <pre
                    key={p.id}
                    className="overflow-x-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground"
                  >
                    {`[${p.id}] ${p.title}\n${p.text}`}
                  </pre>
                ))}
              </div>
            ) : null}
          </Disclosure>

          <Disclosure label="Learning: which layer should decide what">
            <div className="space-y-3 text-sm leading-6 text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">Deterministic comparison.</span>{" "}
                Matching by id and subtracting integer cents is arithmetic with one right answer.
                Code owns it, so the number on the table is reproducible and testable. A language
                model is never asked to do arithmetic here.
              </p>
              <p>
                <span className="font-medium text-foreground">Retrieval.</span> Choosing which
                written procedure applies is a lookup. For a corpus of six labelled passages,
                metadata tags and literal keyword overlap are both sufficient and inspectable, which
                is why this lab uses them and says so instead of implying a vector database.
              </p>
              <p>
                <span className="font-medium text-foreground">Generation.</span> The model only
                explains: it restates given figures, cites retrieved passage ids, proposes a next
                step and states its uncertainty. Escalation is decided by code before the call, and
                citations are validated after it. Missing or conflicting sources force human review
                and forbid any suggested correction.
              </p>
              <p>
                <span className="font-medium text-foreground">Evaluation.</span> The repository holds
                an eval suite that runs the six scenarios plus duplicate ids, reversed differences,
                zero versus missing, invalid input and unavailable-model handling against expected
                outcomes written separately from the engine. Results are reported from actual runs
                only; nothing on this page presents an unrun benchmark as a result.
              </p>
            </div>
          </Disclosure>

          <p className="text-xs leading-5 text-muted-foreground">
            This lab is a teaching demonstration on synthetic data. It is not a reconciliation
            system, not official guidance and not connected to any institutional record. It shares
            this site with the Schedule of Reductions calculators but has no access to their engine
            or their data.
          </p>
        </div>
      </div>
    </main>
  );
}
