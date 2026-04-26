/**
 * Single-term quick calculator - one term, derive the maximum Sub/Unsub
 * disbursement using the same engine. Collapsible.
 */
import * as React from "react";
import { ChevronDown, Zap } from "lucide-react";
import { calculateSOR, defaultInputs, fmtCurrency, type SORInputs } from "@/lib/sor";
import { GRADE_GROUPS, GRADE_LABELS, type GradeLevel } from "@/lib/loanLimits";
import { NumberField } from "./NumberField";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InfoTip } from "./InfoTip";

export function QuickTermCalc() {
  const [open, setOpen] = React.useState(false);
  const [grade, setGrade] = React.useState<GradeLevel>("g1");
  const [need, setNeed] = React.useState(5500);
  const [ft, setFt] = React.useState(12);
  const [enrolled, setEnrolled] = React.useState(9);

  const result = React.useMemo(() => {
    const inp: SORInputs = defaultInputs();
    inp.gradeLevel = grade;
    inp.annualNeed = need;
    inp.numStandardTerms = 2;
    inp.ayFtCredits = ft * 2;
    inp.terms.term1 = {
      ...inp.terms.term1,
      enabled: true,
      ftCredits: ft,
      enrolledCredits: enrolled,
    };
    inp.terms.term2 = {
      ...inp.terms.term2,
      enabled: true,
      ftCredits: ft,
      enrolledCredits: ft, // assume second term full-time → derives single-term ceiling
    };
    return calculateSOR(inp);
  }, [grade, need, ft, enrolled]);

  const term1 = result.termResults[0];

  return (
    <div className="rounded-2xl border border-accent/40 bg-card shadow-[var(--shadow-card)]">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((o) => !o);
          }
        }}
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-accent-foreground"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
              Quick single-term calculator
              <span onClick={(e) => e.stopPropagation()}>
                <InfoTip label="About the quick calculator">
                  Estimate one term's maximum Sub/Unsub disbursement in isolation - useful for
                  spot-checking a single term without configuring the full annual SOR. Uses the same
                  engine and statutory limits.
                </InfoTip>
              </span>
            </div>
            <div className="text-[11px] text-muted-foreground">
              Estimate one term's max Sub/Unsub without configuring the full SOR.
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition ${open ? "rotate-180" : ""}`}
        />
      </div>
      {open ? (
        <div className="border-t border-border px-4 py-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Grade Level</Label>
              <Select value={grade} onValueChange={(v) => setGrade(v as GradeLevel)}>
                <SelectTrigger className="h-9 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_GROUPS.map((g) => (
                    <SelectGroup key={g.label}>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.codes.map((c) => (
                        <SelectItem key={c} value={c}>
                          {GRADE_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <NumberField label="Annual Need" prefix="$" value={need} onChange={setNeed} />
            <NumberField label="Term FT credits" value={ft} step={0.5} onChange={setFt} />
            <NumberField
              label="Enrolled credits"
              value={enrolled}
              step={0.5}
              onChange={setEnrolled}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="SOR %" value={`${Math.round(result.sorPctRounded * 100)}%`} />
            <Stat label="Term %" value={`${Math.round((term1?.termPct ?? 0) * 100)}%`} />
            <Stat label="Max Sub this term" value={fmtCurrency(term1?.finalSub ?? 0)} accent />
            <Stat label="Max Unsub this term" value={fmtCurrency(term1?.finalUnsub ?? 0)} accent />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-2.5 ${
        accent
          ? "border-primary/30 bg-primary/5 text-primary"
          : "border-border bg-background text-foreground"
      }`}
    >
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
