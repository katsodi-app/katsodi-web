import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { siteEmbedding } from "@/lib/server/site-embed";
export const runtime = "nodejs";
/** Embedding check for the room's current website; active members only. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const headers = { "Cache-Control": "private, no-store" };
  const { roomId } = await params;
  if (!uuid.safeParse(roomId).success)
    return Response.json({ error: "unavailable" }, { status: 404, headers });
  try {
    const { client, user } = await currentAccount();
    if (!client || !user)
      return Response.json({ error: "auth" }, { status: 401, headers });
    const [room, member, site] = await Promise.all([
      client.from("rooms").select("closed_at").eq("id", roomId).maybeSingle(),
      client
        .from("room_members")
        .select("user_id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
      client
        .from("room_sites")
        .select("url")
        .eq("room_id", roomId)
        .maybeSingle(),
    ]);
    if (
      room.error ||
      !room.data ||
      room.data.closed_at ||
      member.error ||
      !member.data ||
      site.error
    )
      return Response.json({ error: "unavailable" }, { status: 404, headers });
    if (!site.data) return Response.json({ site: null }, { headers });
    return Response.json(
      { site: { url: site.data.url, ...(await siteEmbedding(site.data.url)) } },
      { headers },
    );
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
