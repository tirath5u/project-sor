export type StudentForm = {
  awardYear: "2025-26" | "2026-27";
  programLevel: "undergraduate" | "graduate";
  gradeLevel: string;
  dependency: "dependent" | "independent";
  fallCredits: string;
  springCredits: string;
  fullTimeCreditsPerTerm: string;
  summer: boolean;
};

export type StudentEstimate = {
  sorPercent: number;
  estimatedAnnualSub: number;
  estimatedAnnualUnsub: number;
  estimatedAnnualTotal: number;
};

export type StudentResult = {
  status?: string;
  estimate?: StudentEstimate;
  warnings?: string[];
  disclaimer?: string;
};

export const money = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

export const num = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
