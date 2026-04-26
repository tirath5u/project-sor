# Security Policy

Project SOR is a public, open-source calculator for the federal Direct Loan
Schedule of Reductions (SOR). We take security and correctness seriously -
especially because financial-aid practitioners may use this tool's outputs as a
second-opinion check against their SIS.

## Supported Versions

Only the latest `main` branch and the live deployment at
[sor.myproduct.life](https://sor.myproduct.life) receive security updates.
The engine version surfaced at `/api/public/v1/health` (`engineVersion`) is the
authoritative reference for what is currently deployed.

## Reporting a Vulnerability

**Please do NOT open a public GitHub issue for security vulnerabilities.**

Instead, report privately via one of the following channels:

1. **GitHub Security Advisories** (preferred) -
   [Open a private advisory](https://github.com/tirath5u/project-sor/security/advisories/new)
   on this repository. This is the fastest path and keeps the report
   confidential until a fix is shipped.
2. **LinkedIn DM** - [Tirath Chhatriwala](https://www.linkedin.com/in/tirath-c-7228b814/)
   for cases where a GitHub account isn't convenient.

When reporting, please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce (a minimal payload, fixture ID, or `curl` command is ideal).
- The deployed `engineVersion` and `sourceCommit` from `/api/public/v1/health`
  at the time you observed the issue.
- Any suggested remediation, if you have one.

## Response Expectations

This is a single-maintainer portfolio project, not a funded product. Best-effort
timelines:

- **Acknowledgement:** within 5 business days.
- **Triage & severity assessment:** within 10 business days.
- **Fix or mitigation for confirmed high/critical issues:** as quickly as
  practical, prioritized over feature work.

You will be credited in the release notes for the fix unless you request otherwise.

## Scope

In scope:

- The calculation engine (`src/lib/sor.ts`) - incorrect outputs that materially
  diverge from the published methodology (`docs/methodology.md`) and cited
  regulatory sources (`docs/public-source-register.md`).
- The public API (`/api/public/v1/*`) - input-validation bypasses, injection,
  rate-limit bypasses, information disclosure, or auth/authorization issues.
- The web UI - XSS, CSRF, or any client-side issue that could mislead a user
  about loan eligibility or amounts.
- Supply-chain risk in declared dependencies.

Out of scope:

- Disagreements about regulatory interpretation - please open a regular
  [Scenario Challenge](https://github.com/tirath5u/project-sor/issues/new?template=scenario-challenge.yml)
  issue instead.
- Vulnerabilities in third-party services we depend on (Lovable Cloud,
  Cloudflare, etc.) - please report those upstream.
- Denial-of-service via volumetric traffic against the free public API; the
  documented per-IP rate limit is the only DoS mitigation we commit to.

## Disclosure Policy

We follow **coordinated disclosure**. Please give us a reasonable window to
ship a fix before publishing details. Once a fix is deployed and `engineVersion`
is bumped, you're free to publish your write-up.

Thank you for helping keep Project SOR trustworthy. 🙏
