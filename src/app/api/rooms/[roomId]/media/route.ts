import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "@/lib/server/contracts";
import { mediaDetails } from "@/lib/server/media-details";
export const runtime = "nodejs";
/** "Now playing" details for an active member's room source. */
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
    const [room, member] = await Promise.all([
      client
        .from("rooms")
        .select("url,closed_at")
        .eq("id", roomId)
        .maybeSingle(),
      client
        .from("room_members")
        .select("user_id")
        .eq("room_id", roomId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle(),
    ]);
    if (
      room.error ||
      !room.data ||
      room.data.closed_at ||
      member.error ||
      !member.data
    )
      return Response.json({ error: "unavailable" }, { status: 404, headers });
    const details = await mediaDetails(room.data.url);
    return Response.json({ details }, { headers });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 503, headers });
  }
}
