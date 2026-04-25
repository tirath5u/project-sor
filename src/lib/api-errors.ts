/**
 * Uniform error envelope for the public API. Never leaks raw exception
 * messages from internal modules — only the typed code + safe message.
 */

export type ApiErrorCode =
  | "invalid_input"
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
  };
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

const STATUS_FOR_CODE: Record<ApiErrorCode, number> = {
  invalid_input: 400,
  method_not_allowed: 405,
  unsupported_media_type: 415,
  not_acceptable: 406,
  rate_limited: 429,
  internal_error: 500,
  not_found: 404,
};

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
): Response {
  const body: ApiErrorBody = { error: { code, message, details } };
  return jsonResponse(body, {
    status: STATUS_FOR_CODE[code],
    headers: extraHeaders,
  });
}

export function corsPreflightResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
