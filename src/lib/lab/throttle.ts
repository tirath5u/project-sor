/** Public limit constants. The server reservation lives in quota.server.ts. */
export const LAB_LIMITS = {
  perCallerIntervalMs: 20_000,
  perCallerHourlyLimit: 10,
  globalDailyLimit: 200,
} as const;

/** No-context calls are always denied. A trusted request is required by quota.server.ts. */
export async function reserveLabCall() {
  return {
    allowed: false as const,
    reason: "quota_storage_unavailable" as const,
    retryAfterSeconds: null,
  };
}
