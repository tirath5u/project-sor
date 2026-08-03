import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { StudentHeader } from "@/components/student/StudentHeader";
import { StudentHero } from "@/components/student/StudentHero";
import { EstimateForm, type StudentForm } from "@/components/student/EstimateForm";
import { EstimateResult, type StudentEstimate } from "@/components/student/EstimateResult";
import { ScopeNotes } from "@/components/student/ScopeNotes";
import { StudentFaq } from "@/components/student/StudentFaq";
import { AudienceCards } from "@/components/student/AudienceCards";

const title = "Student Loan Reduction Estimator | Project SOR";
const description =
  "See how taking fewer credits could reduce your annual federal Direct Loan maximum. Free, no login, about one minute.";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StudentEstimatePage,
});

type Result = {
  status: string;
  estimate?: StudentEstimate;
  warnings?: string[];
  disclaimer?: string;
};

function StudentEstimatePage() {
  const [form, setForm] = React.useState<StudentForm>({
    awardYear: "2026-27",
    programLevel: "undergraduate",
    gradeLevel: "g1",
    dependency: "dependent",
    fallCredits: "12",
    springCredits: "9",
    fullTimeCreditsPerTerm: "12",
  });
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const set = (key: keyof StudentForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/public/v2/student-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...form,
          fallCredits: Number(form.fallCredits),
          springCredits: Number(form.springCredits),
          fullTimeCreditsPerTerm: Number(form.fullTimeCreditsPerTerm),
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
  }

  return (
    <div className="theme-student min-h-screen bg-background text-foreground">
      <StudentHeader active="student" />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-start lg:gap-14">
          <StudentHero />
          <div className="space-y-6">
            <EstimateForm form={form} set={set} onSubmit={submit} loading={loading} error={error} />
            {result?.estimate ? (
              <EstimateResult
                estimate={result.estimate}
                disclaimer={result.disclaimer}
                warnings={result.warnings}
              />
            ) : null}
          </div>
        </div>

        <div className="mt-14 space-y-6">
          <ScopeNotes />
          <StudentFaq />
          <AudienceCards />
        </div>
      </main>
    </div>
  );
}
