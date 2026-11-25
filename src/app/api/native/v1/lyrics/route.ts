import { z } from "zod";
import { findLyrics } from "@/lib/server/lyrics";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
import { currentAccount } from "@/lib/supabase/server";
export const runtime = "nodejs";

const query = z.object({
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(120).default(""),
  duration: z.coerce.number().min(0).max(172800).default(0),
});

/**
 * Lyrics for the track playing in a music room, from LRCLIB:
 * `{ lyrics: { synced: [{ time, text }], plain, instrumental } | null }`.
 * Signed-in accounts only (it is not an open proxy).
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
    const { title, artist, duration } = parsed.data;
    return nativeOk(
      { lyrics: await findLyrics(title, artist, duration) },
      requestId,
    );
  });
}
