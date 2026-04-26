# Incident Runbook

_Last updated: 2026-04-25._

This runbook covers the **most likely** failure modes for `sor.myproduct.life`
and its public API. The system is intentionally simple - a stateless
TanStack Start app deployed on Cloudflare Workers, with no database, no
queue, and no third-party calls from `/calculate`. That eliminates most
normal failure modes by design. What remains is documented below.

## 1. Health check

Single source of truth for liveness:

```bash
curl -fsS https://sor.myproduct.life/api/public/v1/health
```

A healthy response returns `200` with:

```json
{
  "status": "ok",
  "engineVersion": "1.0.0",
  "policyYear": "2026-27",
  "policySnapshotDate": "...",
  "sourceCommit": "...",
  "supportedAwardYears": { "2025-26": "supported", "2026-27": "supported-preliminary" }
}
```

If `engineVersion` or `policyYear` is missing, or the response is not `200`,
the deployment is broken - go to **Section 2**.

## 2. Triage matrix

| Symptom                                                   | First check                                            | Likely cause                                 | Action                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------- | --------------------------------------------------------------------------- |
| `/health` returns 5xx or times out                        | [Cloudflare status](https://www.cloudflarestatus.com/) | Edge or Workers outage                       | Wait; nothing to fix on our side.                                           |
| `/health` 200 but `sourceCommit` looks wrong              | GitHub Actions latest run on `main`                    | Deploy not propagated                        | Re-run the latest CI workflow, or push an empty commit to trigger redeploy. |
| `/calculate` returns 5xx for valid fixture inputs         | Run a fixture replay (Section 3)                       | Engine regression                            | Roll back to the previous commit on `main` and open a bug.                  |
| `/calculate` returns 422 for inputs that worked yesterday | Diff `src/lib/sor.schema.ts` against last green commit | Schema tightened without a migration note    | Revert the schema change or relax the new constraint.                       |
| Many `429 rate_limited` responses from a single IP        | Expected                                               | In-process token bucket (30 req/min)         | This is by design. Tell the caller to back off or run their own copy.       |
| UI loads but shows blank results panel                    | Browser console for runtime errors                     | Front-end regression                         | Roll back the most recent UI commit.                                        |
| `/api/public/v1/scenarios` returns `count: 0`             | `src/lib/sor.fixtures.ts` exports                      | Fixture file was emptied or build skipped it | Restore from `main`; never edit fixtures in a hotfix.                       |

## 3. Fixture replay (golden-path smoke test)

If anything looks off, this is the fastest end-to-end check. It exercises the
full request path: routing → schema → engine → response envelope.

```bash
curl -fsS https://sor.myproduct.life/api/public/v1/scenarios \
  | jq '.scenarios[0].input' \
  | curl -fsS -X POST https://sor.myproduct.life/api/public/v1/calculate \
      -H 'Content-Type: application/json' --data @- \
  | jq '{engineVersion: .meta.engineVersion, totalFinalSub: .data.totalFinalSub, totalFinalUnsub: .data.totalFinalUnsub}'
```

Expected for `fixture-v19-001`:

```json
{ "engineVersion": "1.0.0", "totalFinalSub": 2205, "totalFinalUnsub": 1260 }
```

Any drift in those two dollar figures is a P0 - the engine is the product.

## 4. Rollback

There is no database to migrate, no queue to drain, and no user state to
preserve. Rollback is just **redeploy a previous commit**:

1. On GitHub, find the last commit on `main` whose CI run was green.
2. Either push an empty commit on top of it, or revert the offending commit
   with `git revert <sha>` and push.
3. Wait for CI + the Lovable deploy hook to publish.
4. Re-run **Section 3** to confirm.

Never hotfix in production by editing files in the Lovable editor without
a corresponding commit on GitHub - the next CI run will overwrite it.

## 5. Known limitations (not incidents)

These are documented gaps, not bugs. Do **not** page anyone for them.

- **Rate limiting is per-isolate.** The 30 req/min cap lives in the
  Cloudflare Worker isolate's memory. A burst hitting two isolates can pass
  briefly. Documented in the API section of `README.md` and via the
  `X-RateLimit-Policy: best-effort-per-isolate` response header.
- **No alerting.** There is no Sentry, no PagerDuty, no email-on-error. The
  earliest signal of a problem is a user message or a failing CI smoke run.
  Acceptable for a free public reference API; revisit before commercial use.
- **`sourceCommit` may report `local-dev`** depending on which build path
  produced the deployment. Use the GitHub commit SHA on `main` as the source
  of truth for "what is live."
- **Worker logs are short-lived.** Cloudflare retains roughly the last hour
  of Worker invocation logs. Do post-mortems quickly or capture
  reproductions yourself.

## 6. Reporting a security issue

See [`SECURITY.md`](../SECURITY.md). Do not open a public GitHub issue for
suspected vulnerabilities.

## 7. Escalation contact

Maintainer: **Tirath Chhatriwala** - see the contact line in
[`README.md`](../README.md). This is a personal open-source project; there
is no on-call rotation. Best-effort response, no SLA.
