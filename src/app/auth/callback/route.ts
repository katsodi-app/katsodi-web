import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { safeNext } from "@/lib/server/contracts";
import { redirectOrigin } from "@/lib/server/app-origin";
function authRedirect(path: string, origin: string) {
  const response = NextResponse.redirect(new URL(path, origin));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
/**
 * PKCE keeps a code verifier cookie in the browser that requested the email.
 * Opening the link in another browser/device (or on another host, such as
 * localhost vs 127.0.0.1) leaves it missing. Supabase has already verified the
 * email link before it redirects here with a code, so for sign-up this is
 * "confirmed, now sign in", not an invalid link.
 */
const verifierMissing = (error: unknown) =>
  !!error &&
  typeof error === "object" &&
  "code" in error &&
  error.code === "pkce_code_verifier_not_found";
export async function GET(request: Request) {
  const url = new URL(request.url),
    origin = redirectOrigin(request),
    code = url.searchParams.get("code"),
    next = safeNext(url.searchParams.get("next"));
  const client = await serverSupabase();
  if (code && code.length < 4096 && client) {
    let failure: unknown = null;
    try {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (!error) return authRedirect(next, origin);
      failure = error;
    } catch (error) {
      failure = error;
    }
    if (verifierMissing(failure))
      return authRedirect(
        next === "/reset-password"
          ? "/forgot-password?error=browser"
          : `/login?notice=confirmed&next=${encodeURIComponent(next)}`,
        origin,
      );
  }
  return authRedirect("/login?error=confirmation", origin);
}
