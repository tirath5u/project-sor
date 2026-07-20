import type { SORResults, TermKey } from "./sor";

export type ChildAllocationMethod = "byChildCredits" | "equalAcrossActiveChildTerms";
export type LoanBucket = "sub" | "unsub" | "gradPlus";

export interface ChildPaidGross {
  sub?: number | null;
  unsub?: number | null;
  gradPlus?: number | null;
}

export interface ChildTermInput {
  credits: number;
  paidGross?: ChildPaidGross;
}

export interface ChildTermsInput {
  count: 0 | 1 | 2 | 3 | 4;
  allocationMethod: ChildAllocationMethod;
  parents: Partial<Record<TermKey, ChildTermInput[]>>;
}

export interface ChildAllocationRow {
  parentTerm: TermKey;
  parentLabel: string;
  childIndex: number;
  childLabel: string;
  credits: number;
  active: boolean;
  eligibleForAllocation: boolean;
  scheduledGross: Record<LoanBucket, number>;
  paidGross: Record<LoanBucket, number>;
  calculatedNet: Record<LoanBucket, number>;
  review: string;
}

export interface ChildAllocationResult {
  method: ChildAllocationMethod;
  rows: ChildAllocationRow[];
  warnings: string[];
}

export const DEFAULT_FEE_PERCENT = {
  subUnsub: 1.057,
  gradPlus: 4.228,
} as const;

export interface ChildFeePercent {
  subUnsub: number;
  gradPlus: number;
}

export function grossToNet(gross: number, feePercent: number): number {
  const fee = Math.trunc(Math.max(0, gross) * (feePercent / 100) * 100) / 100;
  return Math.max(0, Math.round((Math.max(0, gross) - fee) * 100) / 100);
}

function allocationShares(pool: number, weights: number[]): number[] {
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (pool <= 0 || total <= 0) return weights.map(() => 0);
  const shares = weights.map((weight) => Math.floor((pool * weight) / total));
  const used = shares.reduce((sum, value) => sum + value, 0);
  const last = shares.length - 1;
  if (last >= 0) shares[last] += pool - used;
  return shares;
}

function paidFor(child: ChildTermInput | undefined, bucket: LoanBucket): number {
  const value = child?.paidGross?.[bucket];
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0;
}

function parentGross(results: SORResults, parentTerm: TermKey, bucket: LoanBucket): number {
  const term = results.termResults.find((item) => item.key === parentTerm);
  if (!term) return 0;
  if (bucket === "sub") return Math.max(0, term.finalSub);
  if (bucket === "unsub") return Math.max(0, term.finalUnsub);
  return Math.max(0, term.finalGradPlus);
}

export function allocateChildTerms(
  results: SORResults,
  input: ChildTermsInput | undefined,
  feePercent: ChildFeePercent = DEFAULT_FEE_PERCENT,
): ChildAllocationResult {
  const method = input?.allocationMethod ?? "byChildCredits";
  const count = input?.count ?? 0;
  if (count === 0) return { method, rows: [], warnings: [] };

  const rows: ChildAllocationRow[] = [];
  const warnings: string[] = [];
  const activeParents = results.termResults.filter((term) => term.enabled);

  for (const parent of activeParents) {
    const configured = input?.parents[parent.key] ?? [];
    const children = Array.from({ length: count }, (_, index) => configured[index] ?? {
      credits: Math.max(0, parent.effectiveCredits / count),
    });
    const eligible = children.map((child) => child.credits > 0);

    for (const bucket of ["sub", "unsub", "gradPlus"] as LoanBucket[]) {
      const gross = parentGross(results, parent.key, bucket);
      const paid = children.map((child) => paidFor(child, bucket));
      const remaining = Math.max(0, gross - paid.reduce((sum, value) => sum + value, 0));
      const weights = children.map((child, index) =>
        eligible[index] && paid[index] <= 0
          ? method === "equalAcrossActiveChildTerms"
            ? 1
            : child.credits
          : 0,
      );
      const shares = allocationShares(remaining, weights);

      children.forEach((child, index) => {
        const scheduled = paid[index] > 0 ? paid[index] : shares[index];
        const existing = rows.find(
          (row) => row.parentTerm === parent.key && row.childIndex === index,
        );
        if (existing) {
          existing.scheduledGross[bucket] = scheduled;
          existing.paidGross[bucket] = paid[index];
          existing.calculatedNet[bucket] = grossToNet(
            scheduled,
            bucket === "gradPlus" ? feePercent.gradPlus : feePercent.subUnsub,
          );
          if (paid[index] > gross) existing.review = "Review: child paid exceeds parent gross";
        } else {
          rows.push({
            parentTerm: parent.key,
            parentLabel: parent.label,
            childIndex: index,
            childLabel: `Child ${index + 1}`,
            credits: child.credits,
            active: true,
            eligibleForAllocation: eligible[index],
            scheduledGross: {
              sub: bucket === "sub" ? scheduled : 0,
              unsub: bucket === "unsub" ? scheduled : 0,
              gradPlus: bucket === "gradPlus" ? scheduled : 0,
            },
            paidGross: {
              sub: bucket === "sub" ? paid[index] : 0,
              unsub: bucket === "unsub" ? paid[index] : 0,
              gradPlus: bucket === "gradPlus" ? paid[index] : 0,
            },
            calculatedNet: {
              sub: bucket === "sub" ? grossToNet(scheduled, feePercent.subUnsub) : 0,
              unsub: bucket === "unsub" ? grossToNet(scheduled, feePercent.subUnsub) : 0,
              gradPlus: bucket === "gradPlus" ? grossToNet(scheduled, feePercent.gradPlus) : 0,
            },
            review: paid[index] > gross ? "Review: child paid exceeds parent gross" : "Remaining payable",
          });
        }
      });
    }

    if (children.some((child) => child.credits === 0)) {
      warnings.push(`${parent.label}: zero-credit child terms receive $0 and are excluded from allocation.`);
    }
    if (children.every((child) => child.credits <= 0)) {
      warnings.push(`${parent.label}: no child term has credits, so no child allocation is payable.`);
    }
  }

  if (method === "equalAcrossActiveChildTerms") {
    warnings.push("Equal child allocation splits each already-calculated parent payout. It does not rerun SOR.");
  }
  return { method, rows, warnings: Array.from(new Set(warnings)) };
}
