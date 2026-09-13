import { afterEach, describe, expect, it, vi } from "vitest";
import { requestLabExplanation } from "./explain.server";
import { LAB_SCENARIOS } from "./fixtures";
import { compareLabRecords } from "./compare";
import { retrieveProcedures, decideReviewGate } from "./retrieval";
import { LAB_REQUEST_TIMEOUT_MS } from "./ai-contract";
const scenario = LAB_SCENARIOS[0];
const comparison = compareLabRecords(scenario.systemA, scenario.systemB);
const retrieval = retrieveProcedures(scenario, comparison);
const gate = decideReviewGate(comparison, retrieval);
const call = () => requestLabExplanation(scenario, comparison, retrieval, gate);
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe("model response safety", () => {
  it("keeps timeout active after headers while body stalls", async () => {
    vi.useFakeTimers();
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async (_url, init) => ({
      ok: true,
      text: () => new Promise((_resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
      }),
    })));
    const pending = call();
    await vi.advanceTimersByTimeAsync(LAB_REQUEST_TIMEOUT_MS);
    expect(await pending).toMatchObject({ ok: false, reason: "model_timeout" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([400, 401, 402, 403, 429, 500])("never exposes provider body for HTTP %s", async (status) => {
    vi.stubEnv("LOVABLE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response('{"error":{"message":"private-provider-detail"}}', { status })));
    const result = await call();
    expect(result.ok).toBe(false);
    expect(result.message).not.toContain("private-provider-detail");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("fails without configured model credentials", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "");
    expect(await call()).toMatchObject({ ok: false, reason: "model_not_configured" });
  });
});
