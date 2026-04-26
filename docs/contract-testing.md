# Contract Testing

This project uses a contract loop so API docs, public behavior, and external QA tools stay aligned.

## Contract Sources

- `src/routes/api/public/v1/openapi[.]json.ts` publishes the OpenAPI 3.1 contract.
- The calculate request example is the first published parity scenario.
- The calculate 200 response example documents the stable public response subset.
- `postman/project-sor.postman_collection.json` is the exported black-box collection.
- `scripts/openapi-contract-check.mjs` replays the documented OpenAPI example against `/api/public/v1/calculate`.

## Local Checks

Run the unit and parity suite:

```bash
bun test
```

Run the OpenAPI example contract against a running local API:

```bash
CONTRACT_BASE_URL=http://127.0.0.1:4173 bun run contract:openapi
```

Run the Postman collection against the public API:

```bash
bun run postman:run
```

## CI And Nightly Checks

The main CI workflow starts a local app server, pulls the calculate example out of OpenAPI, sends it to `/api/public/v1/calculate`, and validates:

- the request example is accepted
- `data` contains the documented stable result fields
- `termResults[]` contains the documented stable term fields
- `meta` contains the documented version and source fields
- the documented response example remains a subset of the actual response
- `X-Request-Id` is echoed in the response body and header

The `Live API Contract` workflow runs nightly and on demand against `https://sor.myproduct.life`. It runs the same OpenAPI replay script and the exported Postman collection through Newman.

## Mismatch Triage

Every mismatch must become one of three tracked changes:

1. **OpenAPI docs fix.** The live API behavior is correct, but the contract is wrong or underspecified.
2. **API bug fix.** The contract is correct, but the implementation returned the wrong shape, value, status code, or metadata.
3. **Versioned contract change.** The behavior change is intentional and client-visible. Update the OpenAPI contract, fixtures, Postman tests, README, and `ENGINE_VERSION` according to `CONTRIBUTING.md`.

Do not patch only the Postman assertion unless the OpenAPI contract is also reviewed. The collection is a consumer of the contract, not a replacement for it.
