import "server-only";
import { currentAccount } from "@/lib/supabase/server";
import { musicRoomSource } from "@/lib/music-discovery";
import { uuid, type ActionResult } from "./contracts";

/**
 * Opens a selected track in a real, access-checked music room: the
 * caller's current music room (as an active member of an open room) gets
 * the track as its source, otherwise a new private music room is created.
 * Shared by the website's action (which then redirects) and the native API.
 */
export async function openMusicRoom(
  form: FormData,
): Promise<{ status: "opened"; roomId: string } | ActionResult> {
  const raw = form.get("url"),
    rawTitle = form.get("title");
  const source =
    typeof raw === "string" && raw.length <= 2048 ? musicRoomSource(raw) : null;
  if (!source) return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client) return { status: "error", code: "unconfigured" };
  if (!user) return { status: "error", code: "auth" };
  try {
    const current = uuid.safeParse(form.get("room"));
    if (current.success) {
      const room = await client
        .from("rooms")
        .select("format,closed_at,url")
        .eq("id", current.data)
        .maybeSingle();
      const membership = await client
        .from("room_members")
        .select("user_id")
        .eq("room_id", current.data)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (
        !room.error &&
        !membership.error &&
        room.data?.format === "music" &&
        !room.data.closed_at &&
        membership.data
      ) {
        if (room.data.url !== source) {
          const changed = await client.rpc("set_room_source", {
            p_room: current.data,
            p_url: source,
          });
          if (changed.error)
            return {
              status: "error",
              code: changed.error.message.includes("slow_down")
                ? "rateLimit"
                : "failed",
            };
        }
        return { status: "opened", roomId: current.data };
      }
    }
    const title =
      typeof rawTitle === "string" ? rawTitle.trim().slice(0, 80) : "";
    const created = await client.rpc("create_room", {
      p_name: title.length >= 3 ? title : "Katsodi Music",
      p_description: "",
      p_format: "music",
      p_visibility: "private",
      p_url: source,
      p_art: "wave",
      p_fandom_id: null,
    });
    const id = uuid.safeParse(created.data);
    if (created.error || !id.success)
      return { status: "error", code: "failed" };
    return { status: "opened", roomId: id.data };
  } catch {
    return { status: "error", code: "failed" };
  }
}
