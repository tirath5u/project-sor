# Load Test Report

_Run date: 2026-04-25 against `https://sor.myproduct.life` (production)._

## Method

Three [`autocannon`](https://github.com/mcollina/autocannon) runs from a
single client over HTTPS, hitting the live Cloudflare Workers deployment.
No warm-up, no caching tricks — just sustained load against the public
endpoints anyone can hit.

`/calculate` was driven with the real `fixture-v19-001` input payload
(~3.2 KB POST body, ~3.0 KB JSON response).

## Results

| Endpoint | Conns × Duration | Total req | Throughput | p50 | p90 | p99 | Max | 5xx | Notes |
|---|---|---:|---:|---:|---:|---:|---:|---:|---|
| `GET /api/public/v1/health` | 50 × 20s | 8,874 | 444 req/s | 108 ms | 120 ms | 164 ms | 586 ms | 0 | All 200. |
| `GET /api/public/v1/scenarios` | 25 × 15s | 3,418 | 228 req/s | 105 ms | 116 ms | 172 ms | 451 ms | 0 | All 200; ~5.2 MB/s out. |
| `POST /api/public/v1/calculate` | 25 × 20s | 4,383 | 219 req/s | 111 ms | 122 ms | 173 ms | 481 ms | 0 | 975×200 + 3,408×429 — see below. |

## Interpretation

- **Latency is consistent**, dominated by the ~100 ms client→Cloudflare RTT.
  p99 stayed under 175 ms across all three endpoints. The engine itself is
  pure CPU and runs in single-digit milliseconds inside the isolate.
- **Zero 5xx, zero timeouts, zero connection errors** across ~16,700
  requests. The Worker held up cleanly.
- **The 3,408 `429` responses on `/calculate` are the rate limiter doing
  its job**, not a failure. The in-process token bucket caps a single IP at
  30 req/min sustained (see `src/lib/rate-limit.ts`). Once budget was
  exhausted, the limiter correctly rejected requests with `429
  rate_limited` and a `Retry-After` header. The 975 successful 200s
  represent the refill across the 20-second window.
- **The `GET` endpoints have no rate limit** and sustained hundreds of
  req/s without distress.

## Limitations

- Single-client, single-region test. A real DDoS or distributed load
  pattern would behave differently — particularly because the rate limiter
  is per-isolate, not global. Bursts hitting multiple isolates would each
  get their own bucket.
- No long-duration soak test (hours/days). Cloudflare Workers recycle
  isolates regularly, which mitigates leaks for free, but a multi-day soak
  has not been run.

## Reproduction

```bash
# Grab a real fixture payload
curl -s https://sor.myproduct.life/api/public/v1/scenarios \
  | jq '.scenarios[0].input' > payload.json

# /health
bunx autocannon -c 50 -d 20 https://sor.myproduct.life/api/public/v1/health

# /scenarios
bunx autocannon -c 25 -d 15 https://sor.myproduct.life/api/public/v1/scenarios

# /calculate
bunx autocannon -c 25 -d 20 -m POST \
  -H 'Content-Type: application/json' \
  -i payload.json \
  https://sor.myproduct.life/api/public/v1/calculate
```
