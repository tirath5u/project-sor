/**
 * Cost guardrails for the public AI explanation endpoint.
 *
 * Honest scope: these counters live in the memory of the running server
 * instance. They are not a database, so they reset when the instance recycles.
 * That is stated in the response meta rather than dressed up as durable
 * quota enforcement. There are no automatic retries anywhere: one visitor
 * click can cause at most one model call.
 */

const PER_CALLER_INTERVAL_MS = 20_000; // one explanation per caller per 20s
const PER_CALLER_HOURLY_LIMIT = 10;
const GLOBAL_DAILY_LIMIT = 200; // conservative ceiling on total model calls

interface CallerState {
  lastCallAt: number;
  hourWindowStart: number;
  hourCount: number;
}

const callers = new Map<string, CallerState>();
let dailyWindowDay = -1;
let dailyCount = 0;

function today(): number {
  return Math.floor(Date.now() / 86_400_000);
}

function rollDaily() {
  const day = today();
  if (day !== dailyWindowDay) {
    dailyWindowDay = day;
    dailyCount = 0;
  }
}

/** Coarse caller key. No raw IP is stored: only a truncated salted hash. */
export async function callerKey(request: Request): Promise<string> {
  const raw =
    request.headers.get("cf-connecting-ip") ||
    (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "anon";
  const bytes = new TextEncoder().encode(`lab-throttle-${today()}|${raw}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

export type ThrottleDecision =
  | { allowed: true; dailyCallsUsed: number; dailyCallLimit: number }
  | {
      allowed: false;
      reason: "rate_limited" | "daily_limit_reached";
      retryAfterSeconds: number;
      dailyCallsUsed: number;
      dailyCallLimit: number;
    };

export function checkLabThrottle(key: string): ThrottleDecision {
  rollDaily();
  const now = Date.now();

  if (dailyCount >= GLOBAL_DAILY_LIMIT) {
    const secondsToMidnightUtc = Math.ceil((86_400_000 - (now % 86_400_000)) / 1000);
    return {
      allowed: false,
      reason: "daily_limit_reached",
      retryAfterSeconds: secondsToMidnightUtc,
      dailyCallsUsed: dailyCount,
      dailyCallLimit: GLOBAL_DAILY_LIMIT,
    };
  }

  const state = callers.get(key);
  if (state) {
    if (now - state.lastCallAt < PER_CALLER_INTERVAL_MS) {
      return {
        allowed: false,
        reason: "rate_limited",
        retryAfterSeconds: Math.ceil((PER_CALLER_INTERVAL_MS - (now - state.lastCallAt)) / 1000),
        dailyCallsUsed: dailyCount,
        dailyCallLimit: GLOBAL_DAILY_LIMIT,
      };
    }
    if (now - state.hourWindowStart < 3_600_000 && state.hourCount >= PER_CALLER_HOURLY_LIMIT) {
      return {
        allowed: false,
        reason: "rate_limited",
        retryAfterSeconds: Math.ceil((3_600_000 - (now - state.hourWindowStart)) / 1000),
        dailyCallsUsed: dailyCount,
        dailyCallLimit: GLOBAL_DAILY_LIMIT,
      };
    }
  }

  return { allowed: true, dailyCallsUsed: dailyCount, dailyCallLimit: GLOBAL_DAILY_LIMIT };
}

/** Called immediately before the single model call is issued. */
export function recordLabCall(key: string): number {
  rollDaily();
  const now = Date.now();
  const state = callers.get(key);
  if (!state || now - state.hourWindowStart >= 3_600_000) {
    callers.set(key, { lastCallAt: now, hourWindowStart: now, hourCount: 1 });
  } else {
    callers.set(key, {
      lastCallAt: now,
      hourWindowStart: state.hourWindowStart,
      hourCount: state.hourCount + 1,
    });
  }
  dailyCount += 1;
  return dailyCount;
}

export const LAB_LIMITS = {
  perCallerIntervalMs: PER_CALLER_INTERVAL_MS,
  perCallerHourlyLimit: PER_CALLER_HOURLY_LIMIT,
  globalDailyLimit: GLOBAL_DAILY_LIMIT,
} as const;

/** Test-only reset so throttle tests do not leak state between cases. */
export function __resetLabThrottleForTests() {
  callers.clear();
  dailyWindowDay = -1;
  dailyCount = 0;
}
