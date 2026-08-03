import { ArrowRight, GraduationCap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { StudentForm } from "./shared";

const STUDENT_GRADE_LABELS: Record<string, string> = {
  g0: "First year (no prior college)",
  g1: "First year",
  g2: "Second year",
  g3: "Third year",
  g4: "Fourth year",
  g5: "Fifth year or beyond",
  g6: "Graduate or professional",
  g8: "Graduate",
  g10: "Professional (medical, dental, law)",
};

const GRADES_BY_YEAR: Record<StudentForm["awardYear"], Record<StudentForm["programLevel"], string[]>> =
  {
    "2026-27": {
      undergraduate: ["g0", "g1", "g2", "g3", "g4", "g5"],
      graduate: ["g8", "g10"],
    },
    "2025-26": {
      undergraduate: ["g0", "g1", "g2", "g3", "g4", "g5"],
      graduate: ["g6"],
    },
  };

function Required() {
  return (
    <>
      <span aria-hidden="true" className="text-primary">
        *
      </span>
      <span className="sr-only">Required</span>
    </>
  );
}

export function EstimateForm({
  form,
  set,
  loading,
  error,
  onSubmit,
}: {
  form: StudentForm;
  set: (patch: Partial<StudentForm>) => void;
  loading: boolean;
  error: string | null;
  onSubmit: (event: React.FormEvent) => void;
}) {
  const grades = GRADES_BY_YEAR[form.awardYear][form.programLevel];

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      aria-label="Tell us about your enrollment"
    >
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <GraduationCap className="h-4 w-4" />
        </span>
        <div>
          <h2 className="font-display text-lg font-semibold">Tell us about your enrollment</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Fields marked <Required /> are required. Your estimate updates as you type, and nothing
            you enter is saved.
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="awardYear">
            School year <Required />
          </Label>
          <Select
            value={form.awardYear}
            onValueChange={(value) => {
              const awardYear = value as StudentForm["awardYear"];
              set({ awardYear, gradeLevel: GRADES_BY_YEAR[awardYear][form.programLevel][0] });
            }}
          >
            <SelectTrigger id="awardYear" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-27">2026-27 (new rules)</SelectItem>
              <SelectItem value="2025-26">2025-26 (current rules)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="programLevel">
            Program level <Required />
          </Label>
          <Select
            value={form.programLevel}
            onValueChange={(value) => {
              const programLevel = value as StudentForm["programLevel"];
              set({ programLevel, gradeLevel: GRADES_BY_YEAR[form.awardYear][programLevel][0] });
            }}
          >
            <SelectTrigger id="programLevel" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="undergraduate">Undergraduate</SelectItem>
              <SelectItem value="graduate">Graduate or professional</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="gradeLevel">
            Year in school <Required />
          </Label>
          <Select value={form.gradeLevel} onValueChange={(value) => set({ gradeLevel: value })}>
            <SelectTrigger id="gradeLevel" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {grades.map((grade) => (
                <SelectItem key={grade} value={grade}>
                  {STUDENT_GRADE_LABELS[grade] ?? grade}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dependency">
            Dependency status <Required />
          </Label>
          <Select
            value={form.dependency}
            onValueChange={(value) => set({ dependency: value as StudentForm["dependency"] })}
          >
            <SelectTrigger id="dependency" aria-required="true">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dependent">Dependent</SelectItem>
              <SelectItem value="independent">Independent</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs leading-5 text-muted-foreground">
            If your FAFSA asked for parent information, you are dependent.
          </p>
        </div>
      </div>

      <div className="mt-7 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Your credits
        </p>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox
            id="summer"
            checked={form.summer}
            onCheckedChange={(checked) => set({ summer: Boolean(checked) })}
          />
          <span>I am taking summer classes this year too</span>
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="ft">
            Full-time credits per term <Required />
          </Label>
          <Input
            id="ft"
            required
            type="number"
            min="0.5"
            step="0.5"
            inputMode="decimal"
            value={form.fullTimeCreditsPerTerm}
            onChange={(event) => set({ fullTimeCreditsPerTerm: event.target.value })}
          />
          <p className="text-xs leading-5 text-muted-foreground">
            Use your school's published value. Most schools use 12.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fall">
            Fall credits <Required />
          </Label>
          <Input
            id="fall"
            required
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            value={form.fallCredits}
            onChange={(event) => set({ fallCredits: event.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="spring">
            Spring credits <Required />
          </Label>
          <Input
            id="spring"
            required
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            value={form.springCredits}
            onChange={(event) => set({ springCredits: event.target.value })}
          />
        </div>
      </div>

      {form.summer ? (
        <p className="mt-4 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm leading-6">
          Summer is handled differently at almost every school, so it is not part of this quick
          estimate. Run the{" "}
          <a href="/student/advanced" className="font-semibold underline underline-offset-2">
            Advanced estimate
          </a>{" "}
          and ask your aid office whether summer belongs to this year or the next one.
        </p>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <Button type="submit" size="lg" disabled={loading} className="mt-6 w-full sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Calculating...
          </>
        ) : (
          <>
            Calculate my estimate <ArrowRight className="h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}