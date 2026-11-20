import { currentAccount } from "@/lib/supabase/server";
import { resolvePlayer } from "@/lib/server/player-resolver";
import type { PlayerResolution } from "@/lib/player";

/**
 * The player for a room the caller is an active member of (an open room):
 * the same answer the website's room player gets. "auth" without an
 * account; null when the room is closed, missing or not the caller's.
 */
export async function roomPlayer(
  roomId: string,
): Promise<PlayerResolution | "auth" | null> {
  const url = await roomSource(roomId);
  return url === "auth" || url === null ? url : resolvePlayer(url);
}

/** The source link of a room the caller is an active member of (open room). */
export async function roomSource(
  roomId: string,
): Promise<string | "auth" | null> {
  const { client, user } = await currentAccount();
  if (!client || !user) return "auth";
  const [room, member] = await Promise.all([
    client.from("rooms").select("url,closed_at").eq("id", roomId).maybeSingle(),
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
    return null;
  return room.data.url as string;
}
