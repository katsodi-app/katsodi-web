import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfig } from "@/lib/supabase/config";
import { musicTrack } from "@/lib/music";
import { mostPlayedChartSchema } from "@/lib/music-discovery";
import { fandoms } from "@/lib/fandoms";
import { isCommunityFandom } from "@/lib/community-fandoms";

function missingPage(request: NextRequest, response?: NextResponse) {
  const hidden = NextResponse.rewrite(new URL("/__not-found", request.url), {
    status: 404,
  });
  response?.cookies.getAll().forEach((cookie) => hidden.cookies.set(cookie));
  hidden.headers.set("Cache-Control", "private, no-store");
  return hidden;
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const trackSlug = path.match(/^\/music\/([^/]+)\/?$/)?.[1];
  let knownTrack = !trackSlug || !!musicTrack(trackSlug);
  // /fandoms/request is a static route; every other child is a fandom id.
  const fandomSlug = path.match(/^\/fandoms\/([^/]+)\/?$/)?.[1];
  const checkFandom =
    !!fandomSlug &&
    fandomSlug !== "request" &&
    !fandoms.some((fandom) => fandom.id === fandomSlug);
  const config = supabaseConfig();
  if (!config)
    return knownTrack && !checkFandom
      ? NextResponse.next()
      : missingPage(request);
  let response = NextResponse.next({ request });
  const client = createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV === "production" ||
        request.nextUrl.protocol === "https:",
    },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });
  try {
    await client.auth.getClaims();
  } catch {
    /* Protected actions independently verify the user and deny on error. */
  }
  // The admin panel (Task 9) does not exist for anyone but the administrator:
  // answer a real 404 before the page starts streaming. The page and every
  // admin function check again in the database.
  // Validate newly charting slugs before a dynamic song page starts streaming,
  // so unknown tracks retain a real HTTP 404 (including without a backend).
  if (!knownTrack && trackSlug) {
    if (/^[a-z0-9-]{1,160}$/.test(trackSlug)) {
      try {
        const stored = await client
          .from("music_chart_snapshots")
          .select("payload")
          .eq("provider", "spotify-all-time")
          .abortSignal(AbortSignal.timeout(2000))
          .maybeSingle();
        const chart = mostPlayedChartSchema.safeParse(stored.data?.payload);
        knownTrack =
          !stored.error &&
          chart.success &&
          chart.data.tracks.some((track) => track.slug === trackSlug);
      } catch {
        knownTrack = false;
      }
    }
    if (!knownTrack) return missingPage(request, response);
  }
  // Same for fandom pages: the page calls notFound() only after streaming
  // has begun, which would leave an unknown id with HTTP 200. Catalogue ids
  // are known locally; approved community fandoms are public rows.
  if (checkFandom && fandomSlug) {
    let knownFandom = false;
    if (isCommunityFandom(fandomSlug)) {
      try {
        const stored = await client
          .from("fandoms")
          .select("id")
          .eq("id", fandomSlug)
          .eq("community", true)
          .abortSignal(AbortSignal.timeout(2000))
          .maybeSingle();
        knownFandom = !stored.error && !!stored.data;
      } catch {
        knownFandom = false;
      }
    }
    if (!knownFandom) return missingPage(request, response);
  }
  if (path === "/admin" || path.startsWith("/admin/")) {
    let admin = false;
    try {
      const result = await client.rpc("is_admin");
      admin = !result.error && result.data === true;
    } catch {
      admin = false;
    }
    if (!admin) {
      const hidden = NextResponse.rewrite(
        new URL("/__not-found", request.url),
        { status: 404 },
      );
      response.cookies.getAll().forEach((cookie) => hidden.cookies.set(cookie));
      hidden.headers.set("Cache-Control", "private, no-store");
      return hidden;
    }
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next|images|fonts|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
