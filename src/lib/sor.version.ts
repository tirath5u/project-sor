/**
 * Engine + policy versioning, decoupled.
 *
 * - ENGINE_VERSION: semver of the calculation code. Bump on any change to
 *   sor.ts that could affect outputs (additive feature → minor; bug fix → patch;
 *   breaking input/output meaning → major).
 * - POLICY_YEAR: the federal Award Year the engine treats as the default.
 * - POLICY_SNAPSHOT_DATE: ISO date when the cited regulatory sources were
 *   last reviewed against the engine.
 * - SOURCE_COMMIT: build-time injected commit SHA (CI sets VITE_COMMIT_SHA).
 *   Falls back to "local-dev" outside CI.
 */

export const ENGINE_VERSION = "1.0.1" as const;
export const POLICY_YEAR = "2026-27" as const;
export const POLICY_SNAPSHOT_DATE = "2026-05-04" as const;

export const SOURCE_COMMIT: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env
      ?.VITE_COMMIT_SHA) ||
  "local-dev";

/**
 * Award-year support matrix. Surfaced in /health and /openapi so consumers
 * know which years are confirmed vs. preliminary.
 */
export const SUPPORTED_AWARD_YEARS = {
  "2025-26": "supported",
  "2026-27": "supported-preliminary",
} as const;

export type AwardYearStatus = (typeof SUPPORTED_AWARD_YEARS)[keyof typeof SUPPORTED_AWARD_YEARS];
