import { sourceFingerprint } from "./source-fingerprint.mjs";
import parityFixtures from "../fixtures/v57-audit-parity.json";

const baseUrl = (process.argv[2] ?? "http://127.0.0.1:5175").replace(/\/$/, "");
const expectedRelease = "sor-v57-1.4.1-2026-10-05";
const expectedFingerprint = sourceFingerprint();
(globalThis as Record<string, unknown>).__SOR_SOURCE_FINGERPRINT__ = expectedFingerprint;
const { defaultInputs } = await import("../src/lib/sor.ts");
const failures: string[] = [];
const receipts: Record<string, unknown> = {};

function check(condition: unknown, message: string) {
  if (!condition) failures.push(message);
}

async function json(path: string, init?: RequestInit) {
  const response = await fetch(`${baseUrl}${path}`, init);
  // API assertions below intentionally inspect dynamic response shapes.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { status: response.status, body: await response.json() as Record<string, any> };
}

async function calculate(input: Record<string, unknown>) {
  return json("/api/public/v2/calculate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

async function mcp(method: string, params: Record<string, unknown> = {}) {
  const response = await fetch(`${baseUrl}/mcp`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const text = await response.text();
  const data = text.split("\n").find((line) => line.startsWith("data: "));
  if (!data) throw new Error(`MCP ${method} returned no data event: ${response.status}`);
  // MCP response shape is validated by the assertions below.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return JSON.parse(data.slice(6)).result as Record<string, any>;
}

try {
  const [v1, v2] = await Promise.all([
    json("/api/public/v1/health"),
    json("/api/public/v2/health"),
  ]);
  for (const [version, response] of [["v1", v1], ["v2", v2]] as const) {
    check(response.status === 200, `${version} health did not return 200`);
    check(response.body.releaseId === expectedRelease, `${version} release ID differs`);
    check(response.body.sourceFingerprint === expectedFingerprint, `${version} source fingerprint differs`);
    receipts[`${version}Health`] = {
      status: response.status,
      releaseId: response.body.releaseId,
      sourceFingerprint: response.body.sourceFingerprint,
    };
  }

  const spring = defaultInputs();
  spring.numStandardTerms = 2;
  spring.terms.term3.enabled = false;
  spring.loanPeriodScope = "singleTerm";
  spring.terms.term2.enrolledCredits = 9;
  const missing = await calculate(spring as unknown as Record<string, unknown>);
  check(missing.status === 422, "Missing single-term selector did not return 422");
  check(missing.body.missingInputs?.some((item: { field: string }) => item.field === "singleTermPaymentPeriod"), "Missing selector question is absent");
  spring.singleTermPaymentPeriod = "term2";
  const selected = await calculate(spring as unknown as Record<string, unknown>);
  check(selected.status === 200, "Selected spring request failed");
  check(selected.body.data?.sorPctRounded === 0.75, "Selected spring SOR is not 75%");
  check(selected.body.data?.reducedSub === 1313, "Selected spring Sub is not $1,313");
  check(JSON.stringify(selected.body.data?.termResults?.map((term: { key: string; finalSub: number }) => [term.key, term.finalSub])) === JSON.stringify([["term2", 1313]]), "Selected spring payout vector differs");
  receipts.spring = { status: selected.status, pct: selected.body.data?.sorPctRounded, sub: selected.body.data?.reducedSub };

  const annual = defaultInputs();
  annual.numStandardTerms = 2;
  annual.terms.term3.enabled = false;
  annual.ayFtCredits = 24;
  annual.terms.term1.enrolledCredits = 4;
  annual.terms.term2.enrolledCredits = 11;
  const fullYear = await calculate(annual as unknown as Record<string, unknown>);
  check(fullYear.body.data?.sorPctRounded === 0.63, "4+11 annual SOR is not 63%");
  check(fullYear.body.data?.reducedSub === 2205, "4+11 annual Sub is not $2,205");
  check(JSON.stringify(fullYear.body.data?.termResults?.map((term: { finalSub: number }) => term.finalSub)) === JSON.stringify([0, 2205]), "4+11 term payout vector differs");
  receipts.annual = { status: fullYear.status, pct: fullYear.body.data?.sorPctRounded, sub: fullYear.body.data?.reducedSub };

  const plus = defaultInputs();
  plus.parentPlusDenied = true;
  plus.parentPlusAggregateUsed = 65000;
  const exhausted = await calculate(plus as unknown as Record<string, unknown>);
  check(exhausted.body.data?.additionalUnsubBase === 0, "Exhausted Parent PLUS aggregate still adds Unsub eligibility");
  receipts.parentPlus = { status: exhausted.status, additionalUnsubBase: exhausted.body.data?.additionalUnsubBase };

  const init = await mcp("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "v57-deployment-check", version: "1" } });
  check(init.serverInfo?.version === "0.8.1", "MCP server version differs");
  const listed = await mcp("tools/list");
  const tools = listed.tools as Array<{ name: string; annotations?: Record<string, boolean> }>;
  check(tools.length === 5, "MCP public tool count differs");
  check(!tools.some((tool) => tool.name === "compare_sor_versions"), "Historical migration tool is public");
  check(tools.every((tool) => tool.annotations?.readOnlyHint === true && tool.annotations?.destructiveHint === false && tool.annotations?.openWorldHint === false), "MCP read-only annotations differ");
  const called = await mcp("tools/call", { name: "calculate_sor", arguments: spring });
  check(called.structuredContent?.data?.reducedSub === 1313, "MCP selected spring Sub differs from REST");
  check(called.structuredContent?.meta?.sourceFingerprint === expectedFingerprint, "MCP source fingerprint differs");
  receipts.mcp = { version: init.serverInfo?.version, tools: tools.map((tool) => tool.name), springSub: called.structuredContent?.data?.reducedSub };

  const parityReceipts: Array<Record<string, unknown>> = [];
  for (const fixture of parityFixtures) {
    const input = defaultInputs();
    input.numStandardTerms = 2;
    input.terms.term3.enabled = false;
    input.ayFtCredits = 0;
    input.gradeLevel = "g1";
    input.dependency = "dependent";
    input.annualNeed = 10000;
    input.coa = 30000;
    input.otherAid = 0;
    Object.assign(input, fixture.input);
    for (const [key, values] of Object.entries(fixture.terms)) {
      Object.assign(input.terms[key as keyof typeof input.terms], values);
    }
    for (const version of ["v1", "v2"] as const) {
      const response = await json(`/api/public/${version}/calculate`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input),
      });
      check(response.status === 200, `${fixture.id} ${version} did not calculate`);
      if (response.status !== 200) continue;
      const data = response.body.data;
      const ordered = ["term1", "term2"].map((key) => data.termResults?.find((term: { key: string }) => term.key === key));
      const vector = {
        sorPercent: Math.round(data.sorPctRounded * 100), sub: data.reducedSub, unsub: data.reducedUnsub,
        termSub: ordered.map((term) => term?.finalSub ?? 0),
        termUnsub: ordered.map((term) => term?.finalUnsub ?? 0),
      };
      check(JSON.stringify(vector) === JSON.stringify(fixture.expected), `${fixture.id} ${version} ordered oracle differs`);
      if (version === "v2") check(response.body.contract?.authoritative === true, `${fixture.id} v2 not authoritative`);
      parityReceipts.push({ id: fixture.id, surface: version, status: response.status, vector });
    }
    const response = await mcp("tools/call", { name: "calculate_sor", arguments: { ...input, detailLevel: "detailed" } });
    const data = response.structuredContent?.data;
    const ordered = ["term1", "term2"].map((key) => data?.termResults?.find((term: { key: string }) => term.key === key));
    const vector = {
      sorPercent: Math.round(data?.sorPctRounded * 100), sub: data?.reducedSub, unsub: data?.reducedUnsub,
      termSub: ordered.map((term) => term?.finalSub ?? 0),
      termUnsub: ordered.map((term) => term?.finalUnsub ?? 0),
    };
    check(JSON.stringify(vector) === JSON.stringify(fixture.expected), `${fixture.id} MCP ordered oracle differs`);
    check(response.structuredContent?.contract?.authoritative === true, `${fixture.id} MCP not authoritative`);
    parityReceipts.push({ id: fixture.id, surface: "mcp", status: response.structuredContent?.status, vector });
  }
  receipts.parity = parityReceipts;

  const openapi = await json("/api/public/v2/openapi.json");
  check(openapi.status === 200, "V2 OpenAPI is unavailable");
  if (openapi.status === 200) {
    const schema = openapi.body.components?.schemas?.CalculateInput;
    const source = defaultInputs() as unknown as Record<string, unknown>;
    const terms = Object.fromEntries(Object.entries(source.terms as Record<string, Record<string, unknown>>)
      .map(([key, term]) => [key, Object.fromEntries((schema.properties.terms.properties[key].required as string[])
        .map((field) => [field, term[field]]))]));
    const documented = Object.fromEntries((schema.required as string[])
      .map((field) => [field, field === "terms" ? terms : source[field]]));
    const response = await calculate(documented);
    check(response.status === 200, "OpenAPI-required-only request was rejected");
    receipts.openapiRequiredOnly = { status: response.status };
  }

  const incompleteCalendar = defaultInputs();
  incompleteCalendar.calType = 4;
  delete incompleteCalendar.calendarCategory;
  for (const version of ["v1", "v2"] as const) {
    const response = await json(`/api/public/${version}/calculate`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(incompleteCalendar),
    });
    check(response.status === 422 && response.body.status === "needs_input", `${version} accepted an unresolved calendar`);
  }
} catch (error) {
  failures.push(error instanceof Error ? error.message : String(error));
}

console.log(JSON.stringify({ passed: failures.length === 0, baseUrl, expectedRelease, expectedFingerprint, failures, receipts }, null, 2));
if (failures.length > 0) process.exitCode = 1;
