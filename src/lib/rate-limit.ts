/**
 * In-memory token-bucket rate limiter keyed by a daily-salted hash of the
 * caller's IP. The raw IP is NEVER stored or logged - only the salted hash
 * lives in the bucket map, and the salt rotates daily.
 *
 * This is per-instance state (the Cloudflare Worker recycles); for production
 * scale, swap in Durable Objects or KV. For a free public demo API this is
 * intentionally simple.
 */

const BUCKET_CAPACITY = 30; // tokens
const REFILL_PER_MINUTE = 30; // 30 req/min sustained
const WINDOW_MS = 60_000;

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

/** Generates a daily-rotating salt without persisting it. */
function dailySalt(): string {
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  return `sor-rl-${day}`;
}

/** Hash function - Web Crypto SHA-256, hex-encoded, truncated. */
async function saltedHash(value: string): Promise<string> {
  const data = new TextEncoder().encode(`${dailySalt()}|${value}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

function clientFingerprint(request: Request): string {
  const cfIp = request.headers.get("cf-connecting-ip");
  const xff = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  return cfIp || (xff ? xff.split(",")[0].trim() : "") || realIp || "anon";
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

export async function checkRateLimit(request: Request): Promise<RateLimitResult> {
  const fp = clientFingerprint(request);
  const key = await saltedHash(fp);
  const now = Date.now();
  const existing = buckets.get(key);
  let tokens = BUCKET_CAPACITY;
  if (existing) {
    const elapsed = now - existing.updatedAt;
    const refill = (elapsed / WINDOW_MS) * REFILL_PER_MINUTE;
    tokens = Math.min(BUCKET_CAPACITY, existing.tokens + refill);
  }
  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now });
    const retryAfterSec = Math.max(1, Math.ceil(((1 - tokens) / REFILL_PER_MINUTE) * 60));
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  tokens -= 1;
  buckets.set(key, { tokens, updatedAt: now });
  return { allowed: true, remaining: Math.floor(tokens), retryAfterSec: 0 };
}
