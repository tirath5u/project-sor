/** No durable backend is provisioned. Never fall back to instance memory. */
export const LAB_LIMITS = {
  perCallerIntervalMs: 20_000,
  perCallerHourlyLimit: 10,
  globalDailyLimit: 200,
} as const;

/** Closed until a shared, atomic storage implementation is provisioned and verified. */
export async function reserveLabCall() {
  return {
    allowed: false as const,
    reason: "quota_storage_unavailable" as const,
    retryAfterSeconds: null,
  };
}
