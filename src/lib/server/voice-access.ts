import "server-only";
import { currentAccount } from "@/lib/supabase/server";
import { uuid } from "./contracts";
import { voiceConfig } from "./voice";

/**
 * Whether the current caller (cookie session or native bearer) may receive
 * a voice token for a room: a verified account, an active member of an open
 * room, voice configured and the revocation worker healthy. Shared by the
 * website's voice route and the native API.
 */
export async function voiceAccess(roomId: string) {
  if (!uuid.safeParse(roomId).success)
    return { status: 404, code: "access" } as const;
  const { client, user } = await currentAccount();
  if (!client || !user) return { status: 401, code: "auth" } as const;
  const [room, member] = await Promise.all([
    client.from("rooms").select("id,closed_at").eq("id", roomId).maybeSingle(),
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
    member.error ||
    !room.data ||
    room.data.closed_at ||
    !member.data
  )
    return { status: 403, code: "access" } as const;
  if (!voiceConfig()) return { status: 503, code: "unconfigured" } as const;
  const ready = await client.rpc("voice_worker_ready", { p_room: roomId });
  if (ready.error || ready.data !== true)
    return { status: 503, code: "unconfigured" } as const;
  return { status: 200, user } as const;
}
