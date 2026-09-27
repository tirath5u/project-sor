import type { LabExplainResponse } from "./ai-contract";

/** Fetch the endpoint result for one scenario or study case id. */
export async function fetchLabExplanation(scenarioId: string): Promise<LabExplainResponse> {
  try {
    // The browser sends the scenario id and nothing else.
    const response = await fetch("/api/public/lab/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId }),
    });
    return (await response.json()) as LabExplainResponse;
  } catch {
    return {
      status: "unavailable",
      reason: "model_unavailable",
      message:
        "The request to the explanation service did not complete in this browser. Nothing was retried automatically.",
      retryAfterSeconds: null,
      meta: {},
    };
  }
}
