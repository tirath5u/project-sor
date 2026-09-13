# Reconciliation usage boundary
- [x] Fail closed without durable storage; comparison and retrieval stay available.
- [x] Timeout covers reading the full response; provider error text withheld.
- [x] Citation required when passages exist; conflict/no-source cases rule-based with no AI call.
- [x] Tests (154 passing) and live preview checks.
- [x] Limitations documented in docs/reconciliation-safety.md. Not published.
- [ ] Shared atomic daily reservation and visitor limits: BLOCKED. This project has no provisioned storage; needs owner-approved durable storage before implementation and multi-instance/rollover tests.
- [ ] Real successful normal-case AI verification: BLOCKED behind the same dependency.
