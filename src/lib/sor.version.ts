/**
 * Engine + policy versioning, decoupled.
 *
 * - ENGINE_VERSION: semver of the calculation code. Bump on any change to
 *   sor.ts that could affect outputs (additive feature → minor; bug fix → patch;
 *   breaking input/output meaning → major).
 * - POLICY_YEAR: the federal Award Year the engine treats as the default.
 * - POLICY_SNAPSHOT_DATE: ISO date when the cited regulatory sources were
 *   last reviewed against the engine.
 * - DEPLOYMENT_MARKER: authoritative public deployment identifier. Equals
 *   RELEASE_ID. This is the value consumers should cite.
 * - SOURCE_COMMIT: always null. Exact Git SHA is not available to the runtime
 *   in the hosted build path; we do not fetch GitHub per request and do not
 *   trust client headers. SOURCE_COMMIT_STATUS explains why.
 */

export const ENGINE_VERSION = "1.3.1" as const;
export const POLICY_YEAR = "2026-27" as const;
export const POLICY_SNAPSHOT_DATE = "2026-07-23" as const;
export const MCP_VERSION = "0.4.1" as const;
export const RELEASE_ID = `sor-v56-${ENGINE_VERSION}-2026-08-03` as const;

export const DEPLOYMENT_MARKER: string = RELEASE_ID;

export const SOURCE_COMMIT: string | null = null;

export const SOURCE_COMMIT_STATUS =
  "not_available_in_lovable_build" as const;

/**
 * Award-year support matrix. Surfaced in /health and /openapi so consumers
 * know which years are confirmed vs. preliminary.
 */
export const SUPPORTED_AWARD_YEARS = {
  "2025-26": "supported",
  "2026-27": "supported-preliminary",
} as const;

export type AwardYearStatus = (typeof SUPPORTED_AWARD_YEARS)[keyof typeof SUPPORTED_AWARD_YEARS];
