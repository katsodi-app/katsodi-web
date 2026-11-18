import "server-only";
import { randomUUID } from "node:crypto";
import { parseBearer, runWithBearer } from "@/lib/supabase/actor";
import type { ActionResult } from "./contracts";

/**
 * Shared plumbing of the versioned native API (/api/native/v1).
 *
 * - Authentication is a Supabase user access token in `Authorization:
 *   Bearer`; cookies are never consulted on these routes (see
 *   src/lib/supabase/actor.ts). There is no Origin check because there is no
 *   ambient credential to forge: a browser page cannot attach someone's
 *   bearer token, and these routes send no CORS headers.
 * - Every response is `private, no-store` JSON with a request id that
 *   contains nothing about the caller.
 * - Failures use one envelope:
 *     { "error": { "code", "messageKey", "retryable", "requestId" } }
 *   Codes name domain outcomes, never raw database or SDK messages.
 */
export const NATIVE_API_VERSION = 1;
const MAX_BODY_BYTES = 64 * 1024;

export type NativeErrorCode =
  | "invalid_request"
  | "auth_required"
  | "auth_malformed"
  | "access_denied"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "queue_full"
  | "demo_busy"
  | "unavailable"
  | "not_configured"
  | "server_error";

const STATUS: Record<NativeErrorCode, number> = {
  invalid_request: 400,
  auth_required: 401,
  auth_malformed: 401,
  access_denied: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  queue_full: 409,
  demo_busy: 409,
  unavailable: 503,
  not_configured: 503,
  server_error: 500,
};
const RETRYABLE = new Set<NativeErrorCode>([
  "rate_limited",
  "unavailable",
  "server_error",
]);
/** Stable translation ids the client looks up in its own dictionary. */
const MESSAGE_KEY: Record<NativeErrorCode, string> = {
  invalid_request: "native.errorInvalid",
  auth_required: "native.errorAuth",
  auth_malformed: "native.errorAuth",
  access_denied: "native.errorAccess",
  not_found: "native.errorNotFound",
  conflict: "native.errorConflict",
  rate_limited: "native.errorRateLimit",
  queue_full: "native.errorQueueFull",
  demo_busy: "native.errorDemoBusy",
  unavailable: "native.errorUnavailable",
  not_configured: "native.errorNotConfigured",
  server_error: "native.errorServer",
};

export const nativeHeaders = (requestId: string) => ({
  "Cache-Control": "private, no-store",
  "X-Request-Id": requestId,
});

export function nativeError(code: NativeErrorCode, requestId: string) {
  return Response.json(
    {
      error: {
        code,
        messageKey: MESSAGE_KEY[code],
        retryable: RETRYABLE.has(code),
        requestId,
      },
    },
    { status: STATUS[code], headers: nativeHeaders(requestId) },
  );
}

export function nativeOk(body: unknown, requestId: string, status = 200) {
  return Response.json(body, { status, headers: nativeHeaders(requestId) });
}

/** Maps a shared action outcome to a native error code. */
export function actionErrorCode(result: ActionResult): NativeErrorCode {
  switch (result.code) {
    case "auth":
      return "auth_required";
    case "invalid":
      return "invalid_request";
    case "unconfigured":
      return "not_configured";
    case "rateLimit":
      return "rate_limited";
    case "queueFull":
      return "queue_full";
    case "demoBusy":
      return "demo_busy";
    case "mediaUnavailable":
    case "demoUnavailable":
      return "unavailable";
    default:
      // "failed" covers denied, closed and missing rooms alike: the shared
      // functions deliberately do not tell them apart.
      return "access_denied";
  }
}

export class NativeRequestError extends Error {
  constructor(readonly code: NativeErrorCode) {
    super(code);
  }
}

/** Reads a small JSON object body; anything else is invalid_request. */
export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown>> {
  const type = request.headers.get("content-type") ?? "";
  if (!/^application\/json(;|$)/i.test(type))
    throw new NativeRequestError("invalid_request");
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) throw new NativeRequestError("invalid_request");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES)
    throw new NativeRequestError("invalid_request");
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new NativeRequestError("invalid_request");
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new NativeRequestError("invalid_request");
  return value as Record<string, unknown>;
}

/** Builds the FormData a shared operation expects from plain string fields. */
export function formFrom(fields: Record<string, unknown>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" || value.length > 4096)
      throw new NativeRequestError("invalid_request");
    form.set(key, value);
  }
  return form;
}

type Handler = (requestId: string) => Promise<Response>;

/**
 * Runs a native handler. `auth: "required"` demands a well-formed bearer
 * token; `"optional"` accepts none (a guest) but still rejects a malformed
 * one, so a broken client never silently becomes a guest.
 */
export async function nativeRoute(
  request: Request,
  auth: "required" | "optional",
  handler: Handler,
): Promise<Response> {
  const requestId = randomUUID();
  const parsed = parseBearer(request.headers.get("authorization"));
  if (parsed.status === "malformed")
    return nativeError("auth_malformed", requestId);
  if (parsed.status === "missing" && auth === "required")
    return nativeError("auth_required", requestId);
  try {
    return parsed.status === "ok"
      ? await runWithBearer(parsed.token, () => handler(requestId))
      : await handler(requestId);
  } catch (error) {
    if (error instanceof NativeRequestError)
      return nativeError(error.code, requestId);
    return nativeError("server_error", requestId);
  }
}
