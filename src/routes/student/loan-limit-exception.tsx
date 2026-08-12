import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, ClipboardCopy, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/student/loan-limit-exception")({
  component: LoanLimitExceptionPage,
});

/**
 * Every question carries an explicit "I am not sure" option. The flow never
 * infers an answer from silence, and no field collects identifying data.
 */
const QUESTIONS = [
  {
    name: "seekingGradProfBorrowing",
    label: "Are you seeking graduate or professional borrowing for 2026-27?",
    help: "Answer no if you are an undergraduate. Undergraduate continuity is matched differently and a change of major does not affect it.",
    options: [
      { value: "yes", label: "Yes, graduate or professional" },
      { value: "no", label: "No, undergraduate" },
      { value: "unknown", label: "I am not sure" },
    ],
  },
  {
    name: "enrolledOnJune30",
    label: "Were you enrolled in the program you are pursuing at this school on June 30, 2026?",
    help: "Enrolled means you were a degree-seeking student in good standing who had not graduated or officially withdrawn. You did not need to be registered for fall classes yet.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unknown", label: "I am not sure" },
    ],
  },
  {
    name: "priorDirectLoanBeforeJuly1",
    label: "Did you receive a Direct Loan for that same program before July 1, 2026?",
    help: "This means a Direct Subsidized, Unsubsidized, or Grad PLUS loan that was first paid out to you before July 1, 2026.",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No" },
      { value: "unknown", label: "I am not sure" },
    ],
  },
  {
    name: "statusSinceJune30",
    label: "Since June 30, 2026, what has your school recorded?",
    help: "An approved leave of absence is treated differently from a withdrawal. If you are not certain how your school reported it, choose that option rather than guessing.",
    options: [
      { value: "still_enrolled", label: "Still enrolled in the same program" },
      { value: "approved_leave_of_absence", label: "An approved leave of absence" },
      { value: "withdrew", label: "I withdrew from the program" },
      { value: "changed_school", label: "I changed schools" },
      { value: "changed_degree_or_credential", label: "I changed degree or credential level" },
      { value: "unsure_how_school_reported", label: "I am not sure how my school reported it" },
      { value: "unknown", label: "I am not sure" },
    ],
  },
  {
    name: "schoolChangedProgramOrEndDate",
    label: "Has your school changed your program, credential, or reported program end date?",
    help: "You are never asked for a CIP code. Your school reports that to COD on your behalf.",
    options: [
      { value: "no", label: "No" },
      { value: "yes_program_or_credential", label: "Yes, my program or credential changed" },
      { value: "yes_end_date_only", label: "Yes, only my expected end date changed" },
      { value: "unknown", label: "I am not sure" },
    ],
  },
] as const;

const EVIDENCE_OPTIONS = [
  { value: "unknown", label: "I have not checked, or I am not sure" },
  { value: "student_reported_y", label: "It shows Y" },
  { value: "student_reported_n", label: "It shows N" },
  { value: "school_record_conflict", label: "It does not match what I was told" },
];

const PROFESSIONAL_OPTIONS = [
  { value: "unknown", label: "I am not sure" },
  { value: "school_confirmed", label: "Yes, my school confirmed it is professional" },
  { value: "not_confirmed", label: "No, or my school has not confirmed it" },
];

const STATUS_TONE: Record<string, string> = {
  school_confirmation_needed: "border-primary/30 bg-primary/5",
  likely_not_available_from_answers: "border-warning/40 bg-warning/10",
  insufficient_information: "border-border bg-muted/40",
  school_record_conflict: "border-destructive/30 bg-destructive/5",
};

function LoanLimitExceptionPage() {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [evidence, setEvidence] = React.useState("unknown");
  const [professional, setProfessional] = React.useState("unknown");
  const [acknowledged, setAcknowledged] = React.useState(false);
  const [result, setResult] = React.useState<Record<string, unknown> | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  // Progressive disclosure: reveal the next question once the previous one has
  // an answer, so the form is short on a phone and never shows a wall of fields.
  const visibleCount = React.useMemo(() => {
    let count = 1;
    for (const question of QUESTIONS) {
      if (answers[question.name] === undefined) break;
      count += 1;
    }
    return Math.min(count, QUESTIONS.length);
  }, [answers]);

  const allAnswered = QUESTIONS.every((question) => answers[question.name] !== undefined);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/public/v2/loan-limit-exception", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          programContinuity: answers,
          loanLimitExceptionEvidence: evidence,
          professionalClassification: professional,
          studentDisclosureAcknowledged: acknowledged,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "The check could not be completed.");
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The check could not be completed.");
    } finally {
      setLoading(false);
    }
  }

  const externalChecks = (result?.externalChecks as string[] | undefined) ?? [];
  const reasons = (result?.reasons as string[] | undefined) ?? [];
  const gradPlus = result?.gradPlus as Record<string, unknown> | undefined;

  return (
    <main id="main">
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Loan limit exception check
          </p>
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">
            Find out what your school needs to confirm
          </h1>
          <p className="text-base leading-7 text-muted-foreground">
            The 2026-27 loan limits changed. Some students who were already enrolled keep the older
            limits for a while. This check looks at what you tell us and explains what your school
            and the COD System still need to confirm. It cannot decide whether you qualify.
          </p>
        </header>

        <form onSubmit={submit} className="space-y-6">
          <fieldset className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <legend className="px-1 text-sm font-semibold">About your enrollment</legend>
            {QUESTIONS.slice(0, visibleCount).map((question, index) => (
              <div key={question.name} className="space-y-2">
                <Label htmlFor={question.name} className="text-sm leading-6">
                  <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                  {question.label}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Required</span>
                </Label>
                <p id={`${question.name}-help`} className="text-xs leading-5 text-muted-foreground">
                  {question.help}
                </p>
                <Select
                  value={answers[question.name] ?? ""}
                  onValueChange={(value) =>
                    setAnswers((current) => ({ ...current, [question.name]: value }))
                  }
                >
                  <SelectTrigger id={question.name} aria-describedby={`${question.name}-help`}>
                    <SelectValue placeholder="Choose an answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {question.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </fieldset>

          {allAnswered ? (
            <fieldset className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <legend className="px-1 text-sm font-semibold">
                Optional, only if you already know
              </legend>
              <div className="space-y-2">
                <Label htmlFor="evidence" className="text-sm leading-6">
                  Does your StudentAid.gov aid data show a Loan Limit Exception Flag?
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
                </Label>
                <p id="evidence-help" className="text-xs leading-5 text-muted-foreground">
                  You can download your aid data from StudentAid.gov. If you have not checked, leave
                  this as it is. An unexpected value is worth reviewing with your school rather than
                  acting on.
                </p>
                <Select value={evidence} onValueChange={setEvidence}>
                  <SelectTrigger id="evidence" aria-describedby="evidence-help">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVIDENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="professional" className="text-sm leading-6">
                  Has your school confirmed your program is treated as professional?
                  <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
                </Label>
                <p id="professional-help" className="text-xs leading-5 text-muted-foreground">
                  Professional programs have different annual limits. Only your school can confirm
                  how it classifies your program.
                </p>
                <Select value={professional} onValueChange={setProfessional}>
                  <SelectTrigger id="professional" aria-describedby="professional-help">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFESSIONAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </fieldset>
          ) : null}

          <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-4">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(Boolean(checked))}
            />
            <Label htmlFor="acknowledge" className="text-sm font-normal leading-6">
              I understand this is an estimate and a guide to what to ask my school. It is not a
              decision about my eligibility, not an award, and not a guarantee that I will receive
              money.
            </Label>
          </div>

          {error ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </div>
          ) : null}

          <Button type="submit" disabled={loading || !acknowledged}>
            {loading ? "Checking..." : "Check what my school needs to confirm"}
            <ArrowRight className="h-4 w-4" />
          </Button>
          {!acknowledged ? (
            <p className="text-xs text-muted-foreground">
              Please confirm you understand the box above before continuing.
            </p>
          ) : null}
        </form>

        {result ? (
          <section
            aria-live="polite"
            className={`space-y-5 rounded-2xl border p-5 sm:p-6 ${
              STATUS_TONE[String(result.status)] ?? "border-border bg-muted/40"
            }`}
          >
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Info className="h-4 w-4" />
              {String(result.headline ?? "Result")}
            </div>

            {reasons.length ? (
              <ul className="space-y-2 text-sm leading-6">
                {reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            ) : null}

            {gradPlus ? (
              <div className="rounded-lg border border-border/70 bg-background/70 p-4 text-sm leading-6">
                <p className="font-semibold">Grad PLUS</p>
                <p className="mt-1 text-muted-foreground">{String(gradPlus.explanation)}</p>
              </div>
            ) : null}

            <div className="rounded-lg border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-semibold">Ask your financial aid office</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {String(result.aidOfficeQuestion ?? "")}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  await navigator.clipboard?.writeText(String(result.aidOfficeQuestion ?? ""));
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
              >
                <ClipboardCopy className="h-4 w-4" />
                {copied ? "Copied" : "Copy this question"}
              </Button>
            </div>

            <div className="rounded-lg border border-border/70 bg-background/70 p-4 text-sm leading-6">
              <p className="font-semibold">If your aid seems delayed</p>
              <p className="mt-1 text-muted-foreground">{String(result.delayGuidance ?? "")}</p>
            </div>

            {externalChecks.length ? (
              <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-semibold">What this check cannot see</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
                  {externalChecks.map((check) => (
                    <li key={check}>{check}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p className="text-xs leading-5 text-muted-foreground">
              {String(result.disclaimer ?? "")}
            </p>
            <p className="text-xs leading-5 text-muted-foreground">
              Sources: {((result.sources as string[] | undefined) ?? []).join("; ")}
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
