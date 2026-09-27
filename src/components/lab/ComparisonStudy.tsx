import * as React from "react";
import { Download, Loader2, RotateCcw } from "lucide-react";
import {
  ExplanationResult,
  Panel,
  ProcedureEvidence,
  VarianceTable,
} from "@/components/lab/LabPanels";
import { fetchLabExplanation } from "@/lib/lab/explain-client";
import { compareLabRecords } from "@/lib/lab/compare";
import { decideReviewGate, retrieveProcedures } from "@/lib/lab/retrieval";
import type { LabExplainResponse } from "@/lib/lab/ai-contract";
import { getLabStudyCase } from "@/lib/lab/study/cases";
import {
  LAB_STUDY_ARMS,
  LAB_STUDY_NEXT_STEPS,
  buildStudyExport,
  isStudyArm,
  isStudySession,
  newStudySession,
  type LabStudyCondition,
  type LabStudyExplanationRecord,
  type LabStudyNextStepId,
  type LabStudyResponse,
  type LabStudySession,
  type LabStudyTrial,
} from "@/lib/lab/study/design";
import { cn } from "@/lib/utils";

/**
 * Comparison study: version A (procedures only) against version B (procedures
 * plus the lab explanation). Anonymous and local: answers stay in this
 * browser's storage until the reviewer downloads them as a file. No answer,
 * choice or timing is ever sent to a server.
 */

const STORAGE_KEY = "reconciliation-lab-study";

const VERSION_LABEL: Record<LabStudyCondition, string> = {
  A: "Version A: procedures only",
  B: "Version B: procedures plus explanation",
};

function loadSession(): LabStudySession | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isStudySession(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns false when this browser will not keep the session across a reload. */
function saveSession(session: LabStudySession | null): boolean {
  try {
    if (session) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function randomUint32(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

function facilitatorArm(): number | null {
  const match = /^#study-arm-(\d)$/.exec(window.location.hash);
  return match ? Number(match[1]) : null;
}

export function ComparisonStudy() {
  const [session, setSession] = React.useState<LabStudySession | null>(null);
  const [loaded, setLoaded] = React.useState(false);
  const [persistent, setPersistent] = React.useState(true);
  const [partTwoAcknowledged, setPartTwoAcknowledged] = React.useState(false);

  React.useEffect(() => {
    setSession(loadSession());
    setLoaded(true);
  }, []);

  function update(next: LabStudySession | null) {
    setSession(next);
    setPersistent(saveSession(next));
  }

  if (!loaded) return null;

  if (!session) {
    return <StudyIntro onStart={update} />;
  }

  const done = session.responses.length;
  const total = session.schedule.length;

  if (done >= total) {
    return <StudyDone session={session} onDelete={() => update(null)} />;
  }

  const trial = session.schedule[done];
  const firstOfPartTwo = trial.part === 2 && session.schedule[done - 1]?.part === 1;
  if (firstOfPartTwo && !partTwoAcknowledged) {
    return (
      <Panel title="Part 1 complete" caption={`${done} of ${total} cases recorded.`}>
        <p className="text-sm text-muted-foreground">
          Part 2 uses{" "}
          <span className="font-medium text-foreground">{VERSION_LABEL[trial.condition]}</span> with
          a different set of cases. You will not see any case from part 1 again.
        </p>
        <button
          type="button"
          onClick={() => setPartTwoAcknowledged(true)}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Start part 2
        </button>
      </Panel>
    );
  }

  return (
    <div className="space-y-4">
      {!persistent ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground">
          This browser is not keeping study data between reloads. Finish in this tab and download
          the file at the end, or your answers will be lost.
        </p>
      ) : null}
      <StudyTrialView
        key={trial.caseId}
        trial={trial}
        total={total}
        onSubmit={(response) => update({ ...session, responses: [...session.responses, response] })}
      />
    </div>
  );
}

function StudyIntro({ onStart }: { onStart: (s: LabStudySession) => void }) {
  const requested = facilitatorArm();
  const arm = isStudyArm(requested) ? requested : null;

  function start() {
    const chosen = arm ?? (((randomUint32() % 4) + 1) as 1 | 2 | 3 | 4);
    onStart(
      newStudySession(chosen, arm ? "facilitator" : "random", crypto.randomUUID(), randomUint32()),
    );
  }

  return (
    <Panel
      title="Comparison study"
      caption="Twelve fictional cases in two parts, about ten to fifteen minutes."
    >
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          For each case, read the evidence and choose the next step you would take. One part uses{" "}
          <span className="font-medium text-foreground">version A</span>, which shows the
          deterministic comparison and the retrieved fictional procedures. The other part uses{" "}
          <span className="font-medium text-foreground">version B</span>, which shows the same plus
          the lab's explanation. The two parts use different cases, and you see each case once.
          Which version comes first is assigned for you.
        </p>
        <p>
          The time you take on each case is measured from the moment all of its evidence is on
          screen until you submit. You cannot go back to change an answer.
        </p>
        <p>
          <span className="font-medium text-foreground">Anonymous and local.</span> There is no
          account and nothing asks who you are. Your choices and timings are kept only in this
          browser's storage until you download them as a file at the end. They are never sent to a
          server. In version B the page asks the lab endpoint for the explanation of each case,
          which is the same request the explore view makes and is subject to the lab's usage limits;
          it sends only the case id.
        </p>
        <p className="text-xs">
          Take the study once. If you have already taken it in another browser or on another device,
          please do not take it again.
        </p>
      </div>
      {arm ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Arm {arm} was set by your facilitator's link.
        </p>
      ) : null}
      <button
        type="button"
        onClick={start}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Start the study
      </button>
    </Panel>
  );
}

function StudyTrialView({
  trial,
  total,
  onSubmit,
}: {
  trial: LabStudyTrial;
  total: number;
  onSubmit: (response: LabStudyResponse) => void;
}) {
  const scenario = getLabStudyCase(trial.caseId)!;
  const { comparison, retrieval, gate } = React.useMemo(() => {
    const c = compareLabRecords(scenario.systemA, scenario.systemB);
    const r = retrieveProcedures(scenario, c);
    return { comparison: c, retrieval: r, gate: decideReviewGate(c, r) };
  }, [scenario]);

  const needsExplanation = trial.condition === "B";
  const mountedAt = React.useRef(performance.now());
  const readyAt = React.useRef<number | null>(needsExplanation ? null : performance.now());
  const hiddenWhileDeciding = React.useRef(false);
  const [result, setResult] = React.useState<LabExplainResponse | null>(null);
  const [loading, setLoading] = React.useState(needsExplanation);
  const [attempts, setAttempts] = React.useState(0);
  const [waitMs, setWaitMs] = React.useState(0);
  const [choice, setChoice] = React.useState<LabStudyNextStepId | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setResult(null);
    readyAt.current = null;
    setAttempts((n) => n + 1);
    const next = await fetchLabExplanation(trial.caseId);
    setResult(next);
    setLoading(false);
    const now = performance.now();
    setWaitMs(Math.round(now - mountedAt.current));
    // The decision clock restarts whenever new evidence appears.
    readyAt.current = now;
    hiddenWhileDeciding.current = document.hidden;
  }, [trial.caseId]);

  // One automatic request per case, even if the effect runs twice in development.
  const requested = React.useRef(false);
  React.useEffect(() => {
    if (!needsExplanation || requested.current) return;
    requested.current = true;
    void load();
  }, [needsExplanation, load]);

  React.useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && readyAt.current !== null) hiddenWhileDeciding.current = true;
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const ready = !loading && (!needsExplanation || result !== null);

  function submit() {
    if (!ready || !choice || readyAt.current === null) return;
    const explanation: LabStudyExplanationRecord | null = needsExplanation
      ? {
          status:
            result?.status === "ok"
              ? "ok"
              : result?.status === "unavailable"
                ? result.reason
                : "missing",
          resultKind: result?.status === "ok" ? result.resultKind : null,
          attempts,
          waitMs,
        }
      : null;
    onSubmit({
      ...trial,
      chosenStepId: choice,
      decisionMs: Math.round(performance.now() - readyAt.current),
      pageHiddenWhileDeciding: hiddenWhileDeciding.current,
      explanation,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
        <span>
          Part {trial.part} of 2 · Case {trial.position} of {total}
        </span>
        <span className="font-medium text-foreground">{VERSION_LABEL[trial.condition]}</span>
      </div>

      <Panel title={`Case ${trial.position}`} caption={scenario.question}>
        <p className="text-sm text-muted-foreground">{scenario.notes}</p>
      </Panel>

      <Panel title="Deterministic comparison (no AI)">
        <VarianceTable scenario={scenario} comparison={comparison} />
      </Panel>

      <Panel
        title="Retrieved fictional procedures (no AI)"
        caption={`Method: ${retrieval.method}.`}
      >
        <ProcedureEvidence retrieval={retrieval} gate={gate} />
      </Panel>

      {needsExplanation ? (
        <Panel title="Explanation" caption="Returned by the lab endpoint for this case.">
          <div aria-live="polite" className="space-y-3">
            {loading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading the explanation. The timer has
                not started.
              </p>
            ) : (
              <ExplanationResult result={result} />
            )}
            {result?.status === "unavailable" && !loading ? (
              <button
                type="button"
                onClick={() => void load()}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Try again
              </button>
            ) : null}
            {result?.status === "unavailable" && !loading ? (
              <p className="text-xs text-muted-foreground">
                You can also answer from the evidence above. The file will record that no
                explanation was shown for this case.
              </p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      <Panel title="Your next step" caption="Choose one. You cannot change it after submitting.">
        <fieldset disabled={!ready}>
          <legend className="sr-only">Next step for case {trial.position}</legend>
          <div className="space-y-2">
            {LAB_STUDY_NEXT_STEPS.map((step) => (
              <label
                key={step.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                  choice === step.id
                    ? "border-primary/40 bg-primary/10"
                    : "border-border hover:bg-muted",
                  !ready && "cursor-not-allowed opacity-60",
                )}
              >
                <input
                  type="radio"
                  name={`next-step-${trial.caseId}`}
                  value={step.id}
                  checked={choice === step.id}
                  onChange={() => setChoice(step.id)}
                  className="mt-1"
                />
                <span className="text-foreground">{step.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <button
          type="button"
          onClick={submit}
          disabled={!ready || !choice}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          Submit and continue
        </button>
      </Panel>
    </div>
  );
}

function StudyDone({ session, onDelete }: { session: LabStudySession; onDelete: () => void }) {
  const [downloaded, setDownloaded] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);

  function download() {
    const data = buildStudyExport(session);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reconciliation-study-${session.sessionId.slice(0, 8)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  const [first, second] = LAB_STUDY_ARMS[session.arm];

  return (
    <Panel
      title="Study complete"
      caption={`${session.responses.length} of ${session.schedule.length} cases recorded.`}
    >
      <div className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          Download your answers and send the file to whoever asked you to take part. The file holds
          a random session id, the arm (part 1 {VERSION_LABEL[first.condition].toLowerCase()}, part
          2 {VERSION_LABEL[second.condition].toLowerCase()}), and for each case the id, the step you
          chose and the time you took. It holds no name, email, address, date or browser details.
        </p>
        <p>No score is shown here. Answers are graded later, offline, against a separate key.</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Download className="h-4 w-4" /> Download results (JSON)
        </button>
        {confirming ? (
          <button
            type="button"
            onClick={onDelete}
            className="rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            Yes, delete from this browser
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Delete study data from this browser
          </button>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {downloaded
          ? "Downloaded. You can download again at any time until you delete the data."
          : "Delete only after downloading."}{" "}
        Deleting lets this browser start a new session, so please do not take the study again after
        deleting.
      </p>
    </Panel>
  );
}
