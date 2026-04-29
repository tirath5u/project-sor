/**
 * Zod schemas for the public Calculation API.
 *
 * Design choices:
 * - `strictNumber` rejects empty strings, null, undefined, whitespace, and
 *   NaN for REQUIRED numeric fields. We never silently coerce blank → 0 - the
 *   engine's null/0 distinction is semantically meaningful (see sor.ts on
 *   paidSub: null = blank, 0 = explicit zero anchor).
 * - `nullableMoney` is for the paid/refund fields where null is meaningful.
 * - The output schema mirrors the engine's SORResults shape but is intentionally
 *   permissive (passthrough) so additive engine fields don't break the API.
 */

import { z } from "zod";
import { TERM_ORDER, type TermKey } from "./sor";

/** Reject empty strings, null, undefined, whitespace, NaN. Required numbers only. */
export const strictNumber = (opts: { min?: number; max?: number; int?: boolean } = {}) =>
  z
    .unknown()
    .superRefine((val, ctx) => {
      if (val === null || val === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Required number; received null/undefined",
        });
        return;
      }
      if (typeof val === "string") {
        if (val.trim() === "") {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Required number; received empty string",
          });
          return;
        }
      }
      const n = typeof val === "number" ? val : Number(val);
      if (!Number.isFinite(n)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Required number; received non-numeric (${String(val)})`,
        });
        return;
      }
      if (opts.int && !Number.isInteger(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Must be an integer" });
      }
      if (opts.min !== undefined && n < opts.min) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must be ≥ ${opts.min}` });
      }
      if (opts.max !== undefined && n > opts.max) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Must be ≤ ${opts.max}` });
      }
    })
    .transform((val) => (typeof val === "number" ? val : Number(val)));

/** Optional money: number or null. Null = "not entered" (engine semantic). */
const nullableMoney = z.union([z.number().finite(), z.null()]);

/** Optional money with default 0 - for fields that were never null in v18/v19. */
const optionalMoney = z.number().finite().min(0).optional().default(0);

const TermKeySchema = z.enum([
  "term1",
  "term2",
  "term3",
  "term4",
  "summer1",
  "summer2",
  "winter1",
  "winter2",
]);

const TermInputSchema = z.object({
  key: TermKeySchema,
  label: z.string().min(1).max(64),
  enabled: z.boolean(),
  ftCredits: strictNumber({ min: 0, max: 60 }),
  enrolledCredits: strictNumber({ min: 0, max: 60 }),
  disbursed: z.boolean(),
  actualCredits: strictNumber({ min: 0, max: 60 }),
  paidSub: nullableMoney,
  paidUnsub: nullableMoney,
  refundSub: nullableMoney,
  refundUnsub: nullableMoney,
  coaCapSub: z.number().finite().min(0),
  coaCapUnsub: z.number().finite().min(0),
  enrollmentIntensity: strictNumber({ min: 0, max: 100 }).optional().default(100),
  paidGradPlus: nullableMoney.optional(),
  refundGradPlus: nullableMoney.optional(),
  coaCapGradPlus: optionalMoney,
});

const TermsRecordSchema = z.record(TermKeySchema, TermInputSchema).superRefine((rec, ctx) => {
  for (const k of TERM_ORDER as TermKey[]) {
    if (!rec[k]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Missing term entry: ${k}`,
      });
    }
  }
});

export const CalculateInputSchema = z
  .object({
    viewMode: z.enum(["plan", "disbursement"]),
    calType: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    programLevel: z.enum(["undergraduate", "graduate"]),
    summerPosition: z.enum(["none", "trailer", "header"]),
    ayType: z.enum(["SAY", "BBAY1", "BBAY2"]),
    numStandardTerms: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    includeSummer1: z.boolean(),
    includeSummer2: z.boolean(),
    includeWinter1: z.boolean(),
    includeWinter2: z.boolean(),
    ayFtCredits: strictNumber({ min: 0, max: 200 }),
    gradeLevel: z.enum([
      "g0",
      "g1",
      "g2",
      "g3",
      "g4",
      "g5",
      "g6",
      "g7",
      "g8",
      "g9",
      "g10",
      "g11",
      "g12",
      "g13",
    ]),
    dependency: z.enum(["dependent", "independent"]),
    parentPlusDenied: z.boolean(),
    overrideLimits: z.boolean(),
    annualNeed: strictNumber({ min: 0, max: 1_000_000 }),
    subStatutory: strictNumber({ min: 0, max: 1_000_000 }),
    unsubStatutory: strictNumber({ min: 0, max: 1_000_000 }),
    distributionModel: z.enum(["equal", "proportional"]),
    applySubUnsubShift: z.boolean(),
    applyDoubleReduction: z.boolean(),
    countLthtInAyPct: z.boolean(),
    terms: TermsRecordSchema,
    awardYear: z.enum(["2025-26", "2026-27"]).optional().default("2026-27"),
    loanLimitException: z.boolean().optional().default(false),
    workforcePellEligible: z.boolean().optional().default(false),
    institutionalLimitApplied: z.boolean().optional().default(false),
    coa: optionalMoney,
    otherAid: optionalMoney,
    requestedGradPlus: optionalMoney,
  })
  .strict();

export type CalculateInput = z.infer<typeof CalculateInputSchema>;

/** Output schema is permissive - engine fields are appended over time. */
export const CalculateOutputSchema = z
  .object({
    data: z.record(z.string(), z.unknown()),
    meta: z.object({
      engineVersion: z.string(),
      policyYear: z.string(),
      policySnapshotDate: z.string(),
      sourceCommit: z.string(),
      policyStatus: z.enum(["confirmed", "supported-preliminary"]),
      sourceSet: z.array(z.string()),
      citations: z.array(z.string()).optional(),
      computedAt: z.string(),
    }),
  })
  .strict();

export type CalculateOutput = z.infer<typeof CalculateOutputSchema>;
