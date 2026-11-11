import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "./config";

export async function serverSupabase() {
  const config = supabaseConfig();
  if (!config) return null;
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
    const { data, error } = await client.auth.getClaims();
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
    const { data, error } = await client.auth.getUser();
    if (error || !data.user?.email_confirmed_at)
      return { configured: true as const, user: null, client };
    return { configured: true as const, user: data.user, client };
  } catch {
    return { configured: true as const, user: null, client };
  }
}
