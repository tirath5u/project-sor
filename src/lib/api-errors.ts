/**
 * Uniform error envelope for the public API. Never leaks raw exception
 * messages from internal modules — only the typed code + safe message.
 */

export type ApiErrorCode =
  | "invalid_input"
  | "schema_validation_failed"
  | "payload_too_large"
  | "method_not_allowed"
  | "unsupported_media_type"
  | "not_acceptable"
  | "rate_limited"
  | "internal_error"
  | "not_found";

export interface ApiErrorBody {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, X-Request-Id",
  "Access-Control-Expose-Headers": "X-Request-Id, Retry-After",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  schema_validation_failed: 422,
  payload_too_large: 413,
  method_not_allowed: 405,
  unsupported_media_type: 415,
  not_acceptable: 406,
  rate_limited: 429,
  internal_error: 500,
  not_found: 404,
};

/**
 * Generate a short, URL-safe request ID. Used to correlate a client report
 * with server logs without persisting any client identifier.
 */
export function newRequestId(): string {
  // 12 bytes → 24 hex chars; plenty for correlation, no PII.
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Echo the caller's X-Request-Id if present, otherwise mint a fresh one. */
export function resolveRequestId(request: Request): string {
  const incoming = request.headers.get("x-request-id");
  if (incoming && /^[a-zA-Z0-9_-]{1,64}$/.test(incoming)) return incoming;
  return newRequestId();
}

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...CORS_HEADERS,
      ...(init.headers ?? {}),
    },
  });
}

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
  extraHeaders?: Record<string, string>,
  requestId?: string,
): Response {
  const body: ApiErrorBody = { error: { code, message, details, requestId } };
  return jsonResponse(body, {
    status: STATUS_FOR_CODE[code],
    headers: {
      ...(requestId ? { "X-Request-Id": requestId } : {}),
      ...extraHeaders,
    },
  });
}

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Standard 405 response. Sets `Allow` per RFC 9110.
 */
export function methodNotAllowedResponse(
  allowed: string[],
  requestId?: string,
): Response {
  return errorResponse(
    "method_not_allowed",
    `Method not allowed. Allowed: ${allowed.join(", ")}.`,
    undefined,
    { Allow: allowed.join(", ") },
    requestId,
  );
}
