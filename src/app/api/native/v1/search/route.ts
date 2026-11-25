import { z } from "zod";
import { searchVideos } from "@/lib/server/video-search";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
import { currentAccount } from "@/lib/supabase/server";
export const runtime = "nodejs";

const query = z.object({ q: z.string().trim().min(2).max(120) });

/**
 * Videos for the app's universal search: `{ videos: [{ source, url, title,
 * author, cover, duration, live }] }` from YouTube and Rutube. Signed-in
 * accounts only (it is not an open proxy).
 */
export async function GET(request: Request) {
  return nativeRoute(request, "required", async (requestId) => {
    // A real account, not only a well-formed token: this is not an open proxy.
    const { client, user } = await currentAccount();
    if (!client) return nativeError("not_configured", requestId);
    if (!user) return nativeError("auth_required", requestId);
    const parsed = query.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!parsed.success) return nativeError("invalid_request", requestId);
    return nativeOk({ videos: await searchVideos(parsed.data.q) }, requestId);
  });
}
