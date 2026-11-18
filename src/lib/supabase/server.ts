import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { bearerToken } from "./actor";
import { supabaseConfig } from "./config";

/**
 * A Supabase client acting as the current caller.
 *
 * Web requests: the cookie session, as before. Native API requests (see
 * ./actor.ts): a client that sends the caller's bearer token and never reads
 * or writes cookies, so a native request cannot borrow a browser session.
 */
export async function serverSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
  const token = bearerToken();
  if (token)
    return createClient(config.url, config.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${token}` },
        fetch: (input, init) =>
          fetch(input, { ...init, signal: AbortSignal.timeout(10000) }),
      },
    });
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production" ||
        process.env.NEXT_PUBLIC_APP_URL?.startsWith("https:") === true,
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Read-only Server Components rely on proxy to refresh cookies. */
        }
      },
    },
  });
}

/**
 * Read-only identity for frequently polled endpoints. getClaims verifies the
 * session JWT locally with the project's signing keys instead of calling the
 * Auth server on every request (it falls back to a server call for legacy
 * symmetric keys). Email confirmation is still enforced by RLS/SQL helpers;
 * mutations and secret-issuing endpoints keep using currentAccount().
 */
export async function currentViewer() {
  const client = await serverSupabase();
  if (!client) return { client: null, userId: null };
  try {
    const token = bearerToken();
    const { data, error } = token
      ? await client.auth.getClaims(token)
      : await client.auth.getClaims();
    const sub = data?.claims.sub;
    return { client, userId: !error && typeof sub === "string" ? sub : null };
  } catch {
    return { client, userId: null };
  }
}

export async function currentAccount() {
  const client = await serverSupabase();
  if (!client) return { configured: false as const, user: null, client: null };
  try {
    // getUser asks the Auth server, so a revoked or signed-out token fails.
    const token = bearerToken();
    const { data, error } = token
      ? await client.auth.getUser(token)
      : await client.auth.getUser();
    if (error || !data.user?.email_confirmed_at)
      return { configured: true as const, user: null, client };
    return { configured: true as const, user: data.user, client };
  } catch {
    return { configured: true as const, user: null, client };
  }
}
