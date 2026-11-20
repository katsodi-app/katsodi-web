import { z } from "zod";
import { uuid } from "@/lib/server/contracts";
import { roomSource } from "@/lib/server/room-player";
import { mediaDetails } from "@/lib/server/media-details";
import { nativeError, nativeOk, nativeRoute } from "@/lib/server/native-api";
import { currentAccount } from "@/lib/supabase/server";
export const runtime = "nodejs";

const pageQuery = z.object({
  offset: z.coerce.number().int().min(0).max(299).default(0),
  limit: z.coerce.number().int().min(1).max(40).default(40),
});

/**
 * Title, artists, cover and length for a window of the room's queue (a
 * music room's track list), for active members only: only links already
 * in the room are looked up, through the providers' official oEmbed or
 * Spotify's widget (media-details). `{ items: [{ id, details }], total }`.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  return nativeRoute(request, "required", async (requestId) => {
    const { roomId } = await params;
    const query = pageQuery.safeParse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    if (!uuid.safeParse(roomId).success)
      return nativeError("not_found", requestId);
    if (!query.success) return nativeError("invalid_request", requestId);
    const source = await roomSource(roomId);
    if (source === "auth") return nativeError("auth_required", requestId);
    if (source === null) return nativeError("not_found", requestId);
    const { client } = await currentAccount();
    if (!client) return nativeError("auth_required", requestId);
    const queue = await client
      .from("room_queue")
      .select("id,url")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(300);
    if (queue.error) return nativeError("unavailable", requestId);
    const rows = z
      .array(z.object({ id: z.string().uuid(), url: z.string().max(2048) }))
      .safeParse(queue.data);
    if (!rows.success) return nativeError("unavailable", requestId);
    const slice = rows.data.slice(
      query.data.offset,
      query.data.offset + query.data.limit,
    );
    // A few lookups at a time; each provider answer is cached for 10 minutes.
    const items: { id: string; details: unknown }[] = [];
    for (let i = 0; i < slice.length; i += 8) {
      const batch = slice.slice(i, i + 8);
      const found = await Promise.all(
        batch.map((row) => mediaDetails(row.url).catch(() => null)),
      );
      batch.forEach((row, n) => items.push({ id: row.id, details: found[n] }));
    }
    return nativeOk({ items, total: rows.data.length }, requestId);
  });
}
