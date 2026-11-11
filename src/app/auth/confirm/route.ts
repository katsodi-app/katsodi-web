import { NextResponse } from "next/server";
import { serverSupabase } from "@/lib/supabase/server";
import { redirectOrigin } from "@/lib/server/app-origin";
export async function GET(request: Request) {
  const url = new URL(request.url),
    token = url.searchParams.get("token_hash"),
    type = url.searchParams.get("type");
  const client = await serverSupabase();
  if (
    client &&
    token &&
    token.length <= 512 &&
    (type === "email" || type === "recovery")
  ) {
    try {
      const { error } = await client.auth.verifyOtp({
        token_hash: token,
        type,
      });
      if (!error) {
        const response = NextResponse.redirect(
          new URL(
            type === "recovery" ? "/reset-password" : "/account",
            redirectOrigin(request),
          ),
        );
        response.headers.set("Referrer-Policy", "no-referrer");
        response.headers.set("Cache-Control", "no-store");
        return response;
      }
    } catch {
      /* Same response for invalid and expired tokens. */
    }
  }
  const response = NextResponse.redirect(
    new URL("/login?error=confirmation", redirectOrigin(request)),
  );
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("Cache-Control", "no-store");
  return response;
}
