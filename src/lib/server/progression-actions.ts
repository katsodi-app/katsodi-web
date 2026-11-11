"use server";
import { currentAccount } from "@/lib/supabase/server";
import { uuid, type ActionResult } from "./contracts";

/** Heartbeat from an open, visible room; the server decides what counts. */
export async function pingRoomPresence(
  _prev: ActionResult,
  form: FormData,
): Promise<ActionResult> {
  const room = uuid.safeParse(form.get("room"));
  if (!room.success) return { status: "error", code: "invalid" };
  const { client, user } = await currentAccount();
  if (!client || !user) return { status: "error", code: "auth" };
  try {
    const { error } = await client.rpc("room_presence_ping", {
      p_room: room.data,
    });
    return error
      ? { status: "error", code: "failed" }
      : { status: "success", code: "saved" };
  } catch {
    // Progression is optional; never disturb the room.
    return { status: "error", code: "failed" };
  }
}
