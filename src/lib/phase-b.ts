import { calculateSORWithChildTerms, type SORInputs, type SORResults } from "@/lib/sor";
import {
  normalizeV2Input,
  toV2Warnings,
  v2PolicyDecision,
  type CalculateV2Input,
  type V2Normalization,
} from "@/lib/sor-v2-contract";

export interface CanonicalV2Run {
  data: SORResults;
  normalized: V2Normalization;
  authoritative: boolean;
  status: "calculated" | "calculated_with_external_checks" | "blocked";
  warnings: ReturnType<typeof toV2Warnings>;
  policyDecision: ReturnType<typeof v2PolicyDecision>;
}

export function runCanonicalV2(input: CalculateV2Input): CanonicalV2Run {
  const normalized = normalizeV2Input(input);
  const data = calculateSORWithChildTerms(normalized.engineInput as unknown as SORInputs);
  const authoritative = normalized.externalChecks.length === 0 && !normalized.blocked;
  const status = normalized.blocked
    ? "blocked"
    : normalized.externalChecks.length > 0
      ? "calculated_with_external_checks"
      : "calculated";
  const warnings = toV2Warnings(
    [...data.warnings, ...normalized.warnings],
    normalized.externalChecks,
  );

  return {
    data,
    normalized,
    authoritative,
    status,
    warnings,
    policyDecision: v2PolicyDecision(data as unknown as Record<string, unknown>, authoritative),
  };
}

type NumericResultKey =
  | "sorPctRounded"
  | "reducedSub"
  | "reducedUnsub"
  | "reducedGradPlus"
  | "totalFinalSub"
  | "totalFinalUnsub"
  | "totalFinalGradPlus";

const NUMERIC_RESULT_KEYS: NumericResultKey[] = [
  "sorPctRounded",
  "reducedSub",
  "reducedUnsub",
  "reducedGradPlus",
  "totalFinalSub",
  "totalFinalUnsub",
  "totalFinalGradPlus",
];

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface V2Comparison {
  fields: Record<
    NumericResultKey,
    { left: number | null; right: number | null; delta: number | null }
  >;
  warningIdsAdded: string[];
  warningIdsRemoved: string[];
  authoritativeChanged: boolean;
  statusChanged: boolean;
}

export function compareCanonicalRuns(left: CanonicalV2Run, right: CanonicalV2Run): V2Comparison {
  const fields = Object.fromEntries(
    NUMERIC_RESULT_KEYS.map((key) => {
      const leftValue = numberOrNull(left.data[key]);
      const rightValue = numberOrNull(right.data[key]);
      return [
        key,
        {
          left: leftValue,
          right: rightValue,
          delta: leftValue === null || rightValue === null ? null : rightValue - leftValue,
        },
      ];
    }),
  ) as V2Comparison["fields"];
  const leftWarnings = new Set(left.warnings.map((warning) => warning.id));
  const rightWarnings = new Set(right.warnings.map((warning) => warning.id));

  return {
    fields,
    warningIdsAdded: [...rightWarnings].filter((id) => !leftWarnings.has(id)),
    warningIdsRemoved: [...leftWarnings].filter((id) => !rightWarnings.has(id)),
    authoritativeChanged: left.authoritative !== right.authoritative,
    statusChanged: left.status !== right.status,
  };
}
