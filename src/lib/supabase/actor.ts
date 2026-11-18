import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Request-scoped identity source for the native API (/api/native/v1).
 *
 * Web requests carry the Supabase session in HttpOnly cookies. Native
 * requests carry a Supabase user access token in `Authorization: Bearer`.
 * A native route handler runs its work inside `runWithBearer`, and the
 * shared helpers in ./server.ts then build a request-scoped Supabase client
 * from that token instead of reading cookies. Nothing global is mutated, so
 * one request's token can never serve another request.
 *
 * The token is not trusted because it is present: currentAccount() and
 * currentViewer() still verify it with Supabase Auth, and RLS sees it as the
 * caller's own identity.
 */
const store = new AsyncLocalStorage<{ token: string }>();

export function runWithBearer<T>(token: string, work: () => Promise<T>) {
  return store.run({ token }, work);
}

/** The bearer token of the current native request, or null for web requests. */
export function bearerToken(): string | null {
  return store.getStore()?.token ?? null;
}

/** Shape of a Supabase access token: three base64url parts, bounded length. */
const JWT = /^[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,4096}\.[A-Za-z0-9_-]{8,1024}$/;

/**
 * Strict parse of the Authorization header. Exactly one "Bearer <jwt>";
 * anything else (other schemes, extra spaces, several credentials, control
 * characters, oversized values) is "malformed", and no header is "missing".
 */
export function parseBearer(
  header: string | null,
): { status: "ok"; token: string } | { status: "missing" | "malformed" } {
  if (header === null || header === "") return { status: "missing" };
  if (header.length > 8192) return { status: "malformed" };
  const match = /^Bearer ([^\s,]+)$/.exec(header);
  if (!match || !JWT.test(match[1])) return { status: "malformed" };
  return { status: "ok", token: match[1] };
}
