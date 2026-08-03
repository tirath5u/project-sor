import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentHero } from "@/components/student/StudentHero";
import { EstimateForm } from "@/components/student/EstimateForm";
import { EstimateResult } from "@/components/student/EstimateResult";
import { HowItWorks } from "@/components/student/HowItWorks";
import { StudentFaq } from "@/components/student/StudentFaq";
import { ScopeNotes } from "@/components/student/ScopeNotes";
import { num, type StudentForm, type StudentResult } from "@/components/student/shared";
import { lookupLimits, type Dependency, type GradeLevel } from "@/lib/loanLimits";

export const Route = createFileRoute("/student")({
  component: StudentEstimatePage,
  head: () => ({
    meta: [
      { title: "Student Loan Limit Estimator - Schedule of Reductions" },
      {
        name: "description",
        content:
          "Taking fewer than full-time credits in 2026-27? Estimate your reduced federal Direct Loan limit in seconds and see exactly how the number was worked out.",
      },
      { property: "og:title", content: "Student Loan Limit Estimator - Schedule of Reductions" },
      {
        property: "og:description",
        content:
          "Estimate your reduced federal Direct Loan limit for 2026-27 when you enroll less than full time, with a step-by-step breakdown.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

const INITIAL: StudentForm = {
  awardYear: "2026-27",
  programLevel: "undergraduate",
  gradeLevel: "g1",
  dependency: "dependent",
  fallCredits: "12",
  springCredits: "9",
  fullTimeCreditsPerTerm: "12",
  summer: false,
};

function StudentEstimatePage() {
  const [form, setForm] = React.useState<StudentForm>(INITIAL);
  const [result, setResult] = React.useState<StudentResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const set = (patch: Partial<StudentForm>) => setForm((current) => ({ ...current, ...patch }));

  const normal = React.useMemo(
    () =>
      lookupLimits(
        form.gradeLevel as GradeLevel,
        form.dependency as Dependency,
        false,
        form.awardYear === "2025-26",
      ),
    [form.gradeLevel, form.dependency, form.awardYear],
  );

  const calculate = React.useCallback(async (current: StudentForm) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/public/v2/student-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          awardYear: current.awardYear,
          programLevel: current.programLevel,
          gradeLevel: current.gradeLevel,
          dependency: current.dependency,
          fallCredits: num(current.fallCredits),
          springCredits: num(current.springCredits),
          fullTimeCreditsPerTerm: num(current.fullTimeCreditsPerTerm),
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || "The estimate could not be completed.");
      setResult(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The estimate could not be completed.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Live recalculation keeps the result panel in step with the inputs, so the
  // page never shows a stale or empty estimate.
  React.useEffect(() => {
    if (num(form.fullTimeCreditsPerTerm) <= 0) return;
    const timer = setTimeout(() => void calculate(form), 350);
    return () => clearTimeout(timer);
  }, [form, calculate]);

  const estimate = result?.estimate;

  return (
    <div className="theme-student min-h-screen">
      <StudentHeader active="/student" />
      <main id="main">
        <StudentHero />
        <div className="mx-auto max-w-6xl space-y-12 px-4 py-12 sm:px-6">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,25rem)]">
            <EstimateForm
              form={form}
              set={set}
              loading={loading}
              error={error}
              onSubmit={(event) => {
                event.preventDefault();
                void calculate(form);
              }}
            />
            <div className="lg:sticky lg:top-24">
              {estimate ? (
                <EstimateResult
                  form={form}
                  estimate={estimate}
                  normalSub={normal.sub}
                  normalUnsub={normal.unsub}
                  stale={loading}
                />
              ) : (
                <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm leading-6 text-muted-foreground">
                  Your estimate will appear here as soon as you fill in your credits.
                </div>
              )}
            </div>
          </div>

          {estimate ? (
            <HowItWorks form={form} estimate={estimate} normalTotal={normal.sub + normal.unsub} />
          ) : null}

          <StudentFaq />
          <ScopeNotes />

          <section className="rounded-2xl border border-border bg-gradient-to-br from-accent/70 to-card p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold sm:text-2xl">Need more detail?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              The advanced estimate takes your school's cost of attendance, other aid, summer and
              winter terms, and prior payments, using the same tested engine behind this page.
            </p>
            <div className="mt-5 flex flex-wrap gap-3 text-sm font-medium">
              <Link
                to="/student/advanced"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Advanced estimate <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-4 py-2 transition-colors hover:bg-muted"
              >
                Financial aid staff calculator <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <p className="border-t border-border pt-6 text-xs leading-6 text-muted-foreground">
            {result?.disclaimer ??
              "This is an estimate, not an award, approval, or guarantee. Your school must verify full-time definitions, cost of attendance, other aid, grade level, dependency, and all other Direct Loan eligibility requirements."}
          </p>
        </div>
      </main>
    </div>
  );
}