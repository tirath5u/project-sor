import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { calculateSORWithChildTerms, defaultInputs, TERM_ORDER, type SORInputs, type TermKey } from "@/lib/sor";
import { CalculateInputSchema } from "@/lib/sor.schema";
import {
  ENGINE_VERSION,
  POLICY_YEAR,
  POLICY_SNAPSHOT_DATE,
  SOURCE_COMMIT,
} from "@/lib/sor.version";

/**
 * Compact term-override schema. Callers supply only the fields they want to
 * change; everything else falls back to the engine defaults for that term.
 */
const TermPatchSchema = z
  .object({
    enabled: z.boolean().optional(),
    ftCredits: z.number().min(0).max(60).optional(),
    enrolledCredits: z.number().min(0).max(60).optional(),
    disbursed: z.boolean().optional(),
    actualCredits: z.number().min(0).max(60).optional(),
    paidSub: z.number().nullable().optional(),
    paidUnsub: z.number().nullable().optional(),
    refundSub: z.number().nullable().optional(),
    refundUnsub: z.number().nullable().optional(),
    coaCapSub: z.number().min(0).optional(),
    coaCapUnsub: z.number().min(0).optional(),
    paidGradPlus: z.number().nullable().optional(),
    refundGradPlus: z.number().nullable().optional(),
    coaCapGradPlus: z.number().min(0).optional(),
  })
  .strict();

const TermKeyEnum = z.enum([
  "term1",
  "term2",
  "term3",
  "term4",
  "summer1",
  "summer2",
  "winter1",
  "winter2",
]);

export default defineTool({
  name: "calculate_sor",
  title: "Calculate Schedule of Reductions",
  description:
    "Run the SOR engine for a given borrower/enrollment scenario. Returns per-term Sub, Unsub, and Grad PLUS disbursements, the SOR%, and all engine diagnostics (warnings, baselines, term caps). Any field left unset falls back to safe defaults; supply `terms` to override per-term FT/enrolled credits and paid history.",
  inputSchema: {
    awardYear: z
      .enum(["2025-26", "2026-27"])
      .optional()
      .describe("Award year. Defaults to 2026-27 (OBBBA)."),
    loanLimitException: z
      .boolean()
      .optional()
      .describe(
        "Loan Limit Exception (LLE). When true, use legacy pre-OBBB annual caps and allow Grad PLUS preview.",
      ),
    programLevel: z.enum(["undergraduate", "graduate"]).optional(),
    gradeLevel: z
      .enum([
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
      ])
      .optional()
      .describe("Grade level code. g1=UG yr 1, g8+=graduate/professional."),
    dependency: z.enum(["dependent", "independent"]).optional(),
    parentPlusDenied: z.boolean().optional(),
    ayType: z.enum(["SAY", "BBAY1", "BBAY2"]).optional(),
    numStandardTerms: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
    includeSummer1: z.boolean().optional(),
    includeSummer2: z.boolean().optional(),
    includeWinter1: z.boolean().optional(),
    includeWinter2: z.boolean().optional(),
    ayFtCredits: z.number().min(0).max(200).optional().describe("Full-time AY credits."),
    annualNeed: z.number().min(0).optional().describe("Annual financial need in dollars."),
    subStatutory: z.number().min(0).optional(),
    unsubStatutory: z.number().min(0).optional(),
    coa: z.number().min(0).optional(),
    otherAid: z.number().min(0).optional(),
    requestedGradPlus: z.number().min(0).optional(),
    feeSubUnsubPercent: z.number().min(0).max(100).optional().describe("FY27 Sub/Unsub Direct Loan fee percentage. Defaults to 1.057."),
    feeGradPlusPercent: z.number().min(0).max(100).optional().describe("FY27 Grad PLUS fee percentage. Defaults to 4.228."),
    distributionModel: z.enum(["equal", "proportional"]).optional(),
    applySubUnsubShift: z.boolean().optional(),
    countLthtInAyPct: z.boolean().optional(),
    viewMode: z.enum(["plan", "disbursement"]).optional(),
    terms: z
      .record(TermKeyEnum, TermPatchSchema)
      .optional()
      .describe(
        "Per-term overrides keyed by term1..term4, summer1/summer2, winter1/winter2. Set `enabled: true` to include a term.",
      ),
    childTerms: z
      .object({
        count: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
        allocationMethod: z.enum(["byChildCredits", "equalAcrossActiveChildTerms"]),
        parents: z.record(
          TermKeyEnum,
          z.array(
            z.object({
              credits: z.number().min(0).max(60),
              paidGross: z
                .object({
                  sub: z.number().min(0).nullable().optional(),
                  unsub: z.number().min(0).nullable().optional(),
                  gradPlus: z.number().min(0).nullable().optional(),
                })
                .optional(),
            }),
          ),
        ),
      })
      .optional()
      .describe("Optional v55 child/module allocation layer. Parent SOR is calculated first."),
  },
  annotations: {
    readOnlyHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  handler: async (input) => {
    const base = defaultInputs();

    // Apply top-level overrides.
    const merged: SORInputs = {
      ...base,
      ...(input as Partial<SORInputs>),
      terms: { ...base.terms },
    };

    // Apply term overrides.
    if (input.terms) {
      for (const [k, patch] of Object.entries(input.terms)) {
        const key = k as TermKey;
        if (!merged.terms[key]) continue;
        merged.terms[key] = { ...merged.terms[key], ...patch };
      }
    }

    // Ensure every term key exists (defaultInputs already does this, but be safe).
    for (const k of TERM_ORDER) {
      if (!merged.terms[k]) merged.terms[k] = base.terms[k];
    }

    // Validate the merged shape with the same schema the HTTP API uses.
    const parsed = CalculateInputSchema.safeParse(merged);
    if (!parsed.success) {
      return {
        content: [
          {
            type: "text",
            text:
              "Input validation failed:\n" +
              parsed.error.issues
                .map((i) => `- ${i.path.join(".") || "(root)"}: ${i.message}`)
                .join("\n"),
          },
        ],
        isError: true,
      };
    }

    let results;
    try {
      results = calculateSORWithChildTerms(parsed.data as unknown as SORInputs);
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: `Engine error: ${e instanceof Error ? e.message : String(e)}`,
          },
        ],
        isError: true,
      };
    }

    const meta = {
      engineVersion: ENGINE_VERSION,
      policyYear: merged.awardYear ?? POLICY_YEAR,
      policySnapshotDate: POLICY_SNAPSHOT_DATE,
      sourceCommit: SOURCE_COMMIT,
      sourceSet: ["direct-loan-sor-v1", "project-sor-v55-child-allocation"],
      computedAt: new Date().toISOString(),
    };

    return {
      content: [{ type: "text", text: JSON.stringify({ data: results, meta }, null, 2) }],
      structuredContent: { data: results, meta } as unknown as Record<string, unknown>,
    };
  },
});
