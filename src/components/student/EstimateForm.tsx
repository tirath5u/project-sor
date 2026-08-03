import * as React from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StudentForm = {
  awardYear: string;
  programLevel: string;
  gradeLevel: string;
  dependency: string;
  fallCredits: string;
  springCredits: string;
  fullTimeCreditsPerTerm: string;
};

const gradeLevels = [
  { value: "g0", label: "First year, no prior college" },
  { value: "g1", label: "First year" },
  { value: "g2", label: "Second year" },
  { value: "g3", label: "Third year" },
  { value: "g4", label: "Fourth year" },
  { value: "g8", label: "Graduate" },
  { value: "g10", label: "Professional" },
];

export function EstimateForm({
  form,
  set,
  onSubmit,
  loading,
  error,
}: {
  form: StudentForm;
  set: (key: keyof StudentForm, value: string) => void;
  onSubmit: (event: React.FormEvent) => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] sm:p-7"
    >
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight">Your enrollment</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          All fields are required. Not sure about a value? Check your class schedule or ask your
          financial aid advisor.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Row label="Award year" hint="The school year you're borrowing for.">
          <Select value={form.awardYear} onValueChange={(value) => set("awardYear", value)}>
            <SelectTrigger aria-label="Award year">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2026-27">2026-27</SelectItem>
              <SelectItem value="2025-26">2025-26</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Program" hint="Undergraduate or graduate study.">
          <Select value={form.programLevel} onValueChange={(value) => set("programLevel", value)}>
            <SelectTrigger aria-label="Program level">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="undergraduate">Undergraduate</SelectItem>
              <SelectItem value="graduate">Graduate</SelectItem>
            </SelectContent>
          </Select>
        </Row>
        <Row label="Year in school" hint="Sets which loan-limit tier applies.">
          <Select value={form.gradeLevel} onValueChange={(value) => set("gradeLevel", value)}>
            <SelectTrigger aria-label="Year in school">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gradeLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <Row label="Dependency status" hint="From your FAFSA results.">
          <Select value={form.dependency} onValueChange={(value) => set("dependency", value)}>
            <SelectTrigger aria-label="Dependency status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dependent">Dependent undergraduate</SelectItem>
              <SelectItem value="independent">Independent</SelectItem>
            </SelectContent>
          </Select>
        </Row>
      </div>

      <div className="grid gap-4 rounded-xl bg-muted/50 p-4 sm:grid-cols-3">
        <Row label="Fall credits" hint="Credits you plan to take." htmlFor="fall">
          <Input
            id="fall"
            required
            type="number"
            min="0"
            step="0.5"
            value={form.fallCredits}
            onChange={(event) => set("fallCredits", event.target.value)}
          />
        </Row>
        <Row label="Spring credits" hint="Credits you plan to take." htmlFor="spring">
          <Input
            id="spring"
            required
            type="number"
            min="0"
            step="0.5"
            value={form.springCredits}
            onChange={(event) => set("springCredits", event.target.value)}
          />
        </Row>
        <Row label="Full-time credits" hint="Your school's published number." htmlFor="ft">
          <Input
            id="ft"
            required
            type="number"
            min="0.5"
            step="0.5"
            value={form.fullTimeCreditsPerTerm}
            onChange={(event) => set("fullTimeCreditsPerTerm", event.target.value)}
          />
        </Row>
      </div>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        size="lg"
        disabled={loading}
        className="w-full bg-brand text-brand-foreground hover:bg-brand-hover sm:w-auto"
      >
        {loading ? "Calculating..." : "See my estimate"}
        <ArrowRight className="h-4 w-4" />
      </Button>
    </form>
  );
}

function Row({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </Label>
      {children}
      <p className="text-xs leading-4 text-muted-foreground">{hint}</p>
    </div>
  );
}