import { z } from "zod";
import { CalculateInputSchema, type CalculateInput } from "./sor.schema";

export const ParentPlusEligibilityBasisSchema = z.enum([
  "none",
  "adverseCreditDenied",
  "documentedExceptionalCircumstances",
  "otherOrUnverified",
]);

export const TraditionalProrationStatusSchema = z.enum([
  "notApplied",
  "shortProgram",
  "remainingPeriodShorterThanAcademicYear",
]);

const NullableMoneySchema = z.number().finite().min(0).nullable().optional();

export const V2StructuredFieldsSchema = z.object({
  parentPlusEligibilityBasis: ParentPlusEligibilityBasisSchema.optional(),
  parentPlusAggregateUsed: z.number().finite().min(0).nullable().optional(),
  traditionalProrationStatus: TraditionalProrationStatusSchema.optional(),
  ayDenominatorOverride: z.number().finite().min(0).nullable().optional(),
  preSorCaps: z.object({
    enabled: z.boolean().optional(),
    sub: NullableMoneySchema,
    unsub: NullableMoneySchema,
    gradPlus: NullableMoneySchema,
  }).strict().optional(),
  requestedSub: NullableMoneySchema,
  requestedUnsub: NullableMoneySchema,
  remainingAnnualSub: NullableMoneySchema,
  remainingAnnualUnsub: NullableMoneySchema,
  remainingAnnualCombined: NullableMoneySchema,
  remainingAggregateSub: NullableMoneySchema,
  remainingAggregateUnsub: NullableMoneySchema,
  remainingAggregateCombined: NullableMoneySchema,
  coaScope: z.enum(["academicYear", "singleTerm"]).optional(),
}).strict();

/**
 * V2 keeps the V1 calculation fields for compatibility while adding explicit
 * structured fields. The normalizer below is the only place where those
 * fields are translated into legacy engine inputs.
 */
export const CalculateV2InputSchema = CalculateInputSchema.extend(
  V2StructuredFieldsSchema.shape,
).strict();

export type CalculateV2Input = z.infer<typeof CalculateV2InputSchema>;
export type V2StructuredFields = z.infer<typeof V2StructuredFieldsSchema>;

export interface V2Normalization {
  engineInput: CalculateInput;
  structured: V2StructuredFields;
  externalChecks: string[];
  warnings: string[];
}

function addExternal(checks: string[], check: string) {
  if (!checks.includes(check)) checks.push(check);
}

/**
 * Normalize V2 once for REST and MCP. Fields that the current shared engine
 * cannot apply are retained in the response as explicit external checks.
 * They are never silently ignored or converted to zero.
 */
export function normalizeV2Input(input: CalculateV2Input): V2Normalization {
  const {
    parentPlusEligibilityBasis,
    parentPlusAggregateUsed,
    traditionalProrationStatus,
    ayDenominatorOverride,
    preSorCaps,
    requestedSub,
    requestedUnsub,
    remainingAnnualSub,
    remainingAnnualUnsub,
    remainingAnnualCombined,
    remainingAggregateSub,
    remainingAggregateUnsub,
    remainingAggregateCombined,
    coaScope,
    ...legacyFields
  } = input;

  const engineInput: CalculateInput = { ...legacyFields } as CalculateInput;
  const structured: V2StructuredFields = {
    parentPlusEligibilityBasis,
    parentPlusAggregateUsed,
    traditionalProrationStatus,
    ayDenominatorOverride,
    preSorCaps,
    requestedSub,
    requestedUnsub,
    remainingAnnualSub,
    remainingAnnualUnsub,
    remainingAnnualCombined,
    remainingAggregateSub,
    remainingAggregateUnsub,
    remainingAggregateCombined,
    coaScope,
  };
  const externalChecks: string[] = [];
  const warnings: string[] = [];

  if (traditionalProrationStatus) {
    const applies = traditionalProrationStatus !== "notApplied";
    if (input.traditionalProrationApplies !== undefined && input.traditionalProrationApplies !== applies) {
      warnings.push("Traditional proration fields conflict. Resolve the structured status before relying on the result.");
    }
    engineInput.traditionalProrationApplies = applies;
  }

  if (ayDenominatorOverride !== undefined && ayDenominatorOverride !== null) {
    if (ayDenominatorOverride > 0) {
      engineInput.ayFtCredits = ayDenominatorOverride;
      engineInput.ayDenominatorVerified = true;
    } else {
      warnings.push("AY denominator override is zero. The engine retains its derived denominator and requires institutional verification.");
      addExternal(externalChecks, "Verify the derived AY denominator against the institution's published academic-year definition.");
    }
  }

  if (parentPlusEligibilityBasis !== undefined) {
    engineInput.parentPlusDenied = parentPlusEligibilityBasis === "adverseCreditDenied" || parentPlusEligibilityBasis === "documentedExceptionalCircumstances";
    addExternal(externalChecks, "Parent PLUS aggregate room and exception treatment must be verified against NSLDS or the institution's authoritative record.");
    if (parentPlusAggregateUsed === null || parentPlusAggregateUsed === undefined) {
      warnings.push("Parent PLUS aggregate usage is missing. The result is not authoritative for additional dependent Unsubsidized eligibility.");
    }
  }

  if (preSorCaps !== undefined) {
    addExternal(externalChecks, "Optional pre-SOR Sub, Unsubsidized, and Grad PLUS caps are reported but are not applied by this shared engine version.");
  }

  if (requestedSub !== undefined || requestedUnsub !== undefined) {
    addExternal(externalChecks, "Borrower-requested Sub and Unsubsidized amounts are reported but are not applied by this shared engine version.");
  }

  if (
    remainingAnnualSub !== undefined ||
    remainingAnnualUnsub !== undefined ||
    remainingAnnualCombined !== undefined ||
    remainingAggregateSub !== undefined ||
    remainingAggregateUnsub !== undefined ||
    remainingAggregateCombined !== undefined
  ) {
    addExternal(externalChecks, "Remaining annual and aggregate limits are caller-supplied review inputs and are not derived by this SOR engine.");
  }

  if (coaScope === "singleTerm" && input.loanPeriodScope !== "singleTerm") {
    warnings.push("COA scope is single-term but loanPeriodScope is not single-term. Resolve the scope before relying on Grad PLUS sizing.");
  }

  return { engineInput, structured, externalChecks, warnings };
}

export interface V2Warning {
  id: string;
  severity: "info" | "review";
  message: string;
}

function warningId(message: string): string {
  if (message.includes("Proportional is not used")) return "EFFECTIVE_EQUAL_NO_CURRENT_SOR";
  if (message.includes("Traditional 685.203")) return "TRADITIONAL_PRORATION_SOR_GUARD";
  if (message.includes("Parent PLUS aggregate")) return "PARENT_PLUS_AGGREGATE_REQUIRED";
  if (message.includes("AY denominator")) return "AY_DENOMINATOR_REVIEW";
  if (message.includes("Less-than-half-time")) return "LTHT_TERM_REVIEW";
  if (message.includes("Single-term")) return "SINGLE_TERM_SCOPE_REVIEW";
  return "SOR_REVIEW";
}

export function toV2Warnings(messages: string[], externalChecks: string[]): V2Warning[] {
  const all = [...messages, ...externalChecks];
  return Array.from(new Map(all.map((message) => [message, {
    id: warningId(message),
    severity: "review" as const,
    message,
  }])).values());
}

export function v2PolicyDecision(data: Record<string, unknown>) {
  const sorApplicable = data.sorApplicable === true;
  return {
    sorApplicable,
    reasonCode: sorApplicable ? "SOR_APPLIES" : "SOR_NOT_APPLIED",
    selectedDistributionModel: data.effectiveDistributionModel ?? data.distributionModel ?? null,
    authoritative: true,
  };
}
