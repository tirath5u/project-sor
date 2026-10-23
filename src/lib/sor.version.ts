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
 * - SOURCE_COMMIT: build checkout SHA when available, otherwise null. Never
 *   inferred from a request header or the current remote branch.
 */

export const ENGINE_VERSION = "1.4.2" as const;
export const POLICY_YEAR = "2026-27" as const;
export const POLICY_SNAPSHOT_DATE = "2026-08-20" as const;
export const MCP_VERSION = "0.8.4" as const;
export const RELEASE_ID = `sor-v57-${ENGINE_VERSION}-mcp-${MCP_VERSION}-2026-10-24` as const;

export const DEPLOYMENT_MARKER: string = RELEASE_ID;

declare const __SOR_SOURCE_COMMIT__: string | null;
declare const __SOR_SOURCE_COMMIT_STATUS__: string;
export const SOURCE_COMMIT: string | null = __SOR_SOURCE_COMMIT__;
export const SOURCE_COMMIT_STATUS: string = __SOR_SOURCE_COMMIT_STATUS__;

declare const __SOR_SOURCE_FINGERPRINT__: string;
export const SOURCE_FINGERPRINT: string = __SOR_SOURCE_FINGERPRINT__;

/**
 * Award-year support matrix. Surfaced in /health and /openapi so consumers
 * know which years are confirmed vs. preliminary.
 */
export const SUPPORTED_AWARD_YEARS = {
  "2025-26": "supported",
  "2026-27": "supported-preliminary",
} as const;

export type AwardYearStatus = (typeof SUPPORTED_AWARD_YEARS)[keyof typeof SUPPORTED_AWARD_YEARS];
